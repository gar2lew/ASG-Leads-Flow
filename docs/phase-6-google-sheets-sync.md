# Phase 6 — Google Sheets Synchronization

## Status

| Phase | Status |
|-------|--------|
| **Phase 6A — Engineering / Automated Implementation** | ✅ **COMPLETE** |
| **Phase 6B — Live Google Sheets Acceptance** | ⏸️ **BLOCKED / PENDING CREDENTIAL CONFIGURATION** |

---

## Automated Verification Results

| Check | Result |
|-------|--------|
| Tests | **265 PASS** (0 FAIL, 0 SKIP) |
| Lint | ✅ PASS (0 errors, 0 warnings) |
| Typecheck | ✅ PASS |
| Build | ✅ PASS |
| `git diff --check` | ✅ PASS |

---

## Live Verification Blockers

The following required environment variables are **not configured**:

| Variable | Status | Description |
|----------|--------|-------------|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | ❌ MISSING | Service account JSON (client_email, private_key, etc.) |
| `GOOGLE_SHEETS_PERTH_SPREADSHEET_ID` | ❌ MISSING | Spreadsheet ID for `ASG - Live Leads 2026 - PERTH` |
| `GOOGLE_SHEETS_BRISBANE_SPREADSHEET_ID` | ❌ MISSING | Spreadsheet ID for `ASG - Live Leads 2026 (BRISBANE)` |
| `GOOGLE_SHEETS_WORKSHEET_NAME` | ❌ MISSING | Worksheet name (default: `LEADS`) |

**No credentials were invented, requested, or exposed.** Live verification will remain pending until these are configured in the deployment environment (`.env.local` for local, Vercel environment variables for production).

---

## Architecture Summary

### Firestore Authority Model
Firestore remains the **source of truth**. Google Sheets is an asynchronous, eventually-consistent replica.

```
Firestore mutation → Sync job created → Processor → Google Sheets (async)
```

A Google Sheets outage **never** blocks:
- Creating leads
- Calling leads
- Changing status
- Scheduling follow-ups
- Assigning leads
- Completing surveys
- Importing leads

---

## Office Workbook Configuration

| Office | Spreadsheet | Worksheet | Timezone |
|--------|-------------|-----------|----------|
| Perth | `ASG - Live Leads 2026 - PERTH` | `LEADS` | Australia/Perth |
| Brisbane | `ASG - Live Leads 2026 (BRISBANE)` | `LEADS` | Australia/Brisbane |

Configuration centralized in `src/lib/google/config.ts`. Resolved from environment variables at runtime.

---

## Sheet Column Contract (A–M)

| Col | Header | Source |
|-----|--------|--------|
| A | Date | `lead.createdAt` (office timezone) |
| B | Lead Name | `lead.name` |
| C | Address | `lead.address` |
| D | Contact Number | `lead.mobile` |
| E | Notes | `lead.notes` |
| F | Update Lead | (operational workflow value) |
| G | Renter/Owner | `survey.renterOwner` |
| H | Superannuation | `survey.superannuation` |
| I | Rep Name | `users/{assignedRepId}.displayName` |
| J | Lead Status | Mapped display value |
| K | Call Timestamp | `lead.lastContactAt` |
| L | Call Result | Latest call result (mapped) |
| M | LeadID | `lead.leadId` (stable cross-system ID) |

Canonical app values mapped to human-readable Sheet display text via `src/lib/google/mappings.ts`.

---

## LeadID Strategy

**LeadID (column M) is the stable cross-system identifier.**

- Never use spreadsheet row number as identity
- Lookup: find row by LeadID in column M
- If found → update that row
- If not found → append new row
- Duplicate LeadIDs → fail safely with diagnostic

---

## Outbox Pattern

Authoritative Firestore mutation + sync job creation are transactionally related.

```
Firestore lead mutation → sheetSyncJobs/{jobId} created → Processor → Google Sheets
```

No fire-and-forget HTTP calls. Durable intent recorded before processing.

---

## Sync Job Schema

Collection: `sheetSyncJobs/{jobId}`

```typescript
interface SheetSyncJob {
  jobId: string;              // ${leadId}_${operation}_${timestamp}
  leadId: string;
  officeId: string;
  operation: 'upsert_lead' | 'archive_lead' | 'reconcile_lead';
  status: 'pending' | 'processing' | 'completed' | 'retrying' | 'failed';
  attempts: number;
  maxAttempts: 5;
  createdAt: string;
  updatedAt: string;
  nextAttemptAt: string;
  completedAt?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  targetSpreadsheet: string;
  targetWorksheet: string;
  idempotencyKey: string;
}
```

---

## When Sync Jobs Are Created

After authoritative Firestore mutations:
- Lead created (including import, survey conversion)
- Lead updated (name, mobile, address, notes)
- Lead status changed
- Lead assigned/reassigned
- Call result saved
- Lead archived

Coalesced where practical — one lead upsert reflects resulting state.

---

## Idempotent Upsert

Running the same sync job twice:
1. First execution → append new row
2. Second execution → update **same row** (by LeadID)
3. Row count does **not** increase

Verified by automated test: `sheet-sync-retry.test.ts`

---

## Retry Policy

| Attempt | Delay |
|---------|-------|
| 1 | 1 minute |
| 2 | 3 minutes |
| 3 | 9 minutes |
| 4 | 27 minutes |
| 5 | 1 hour (max) |

Transient errors (429, 500, 502, 503, 504) retry. Permanent errors (400, 401, 403, 404, 409, 422) fail immediately.

---

## Failure Safety

If Sheets fails:
- Firestore lead remains valid
- User workflow succeeds
- Sync job records failure
- Retry scheduled
- Manager/admin sees sync issue later

**Never rollback Firestore because Sheets failed.**

---

## Lead Sync Metadata (Optional)

Lightweight derived fields on lead document:
- `sheetSync.status` — `synced` | `pending` | `failed`
- `sheetSync.lastSyncedAt`
- `sheetSync.lastErrorAt`

Sync job collection remains the durable processing history.

---

## Status Mapping (App → Sheet Display)

| App Status | Sheet Display |
|------------|---------------|
| new | New |
| no_answer | No Answer |
| callback | Callback |
| contacted | Contacted |
| interested | Interested |
| qualified | Qualified |
| booked | Booked |
| revisit | Revisit |
| not_interested | Not Interested |
| disqualified | DQ |
| wrong_number | Wrong Number |

---

## Call Result Mapping

| App Result | Sheet Display |
|------------|---------------|
| no_answer | No Answer |
| callback | Callback |
| contacted | Contacted |
| interested | Interested |
| not_interested | Not Interested |
| disqualified | Disqualified |
| wrong_number | Wrong Number |
| booked | Booked |
| revisit | Revisit |

---

## Timezone Formatting

| Office | Timezone | Format |
|--------|----------|--------|
| Perth | Australia/Perth | DD/MM/YYYY HH:mm (24h) |
| Brisbane | Australia/Brisbane | DD/MM/YYYY HH:mm (24h) |

Firestore timestamps remain UTC. Sheet display uses office timezone.

---

## Legacy Rows Without LeadID

Existing spreadsheets may have rows without column M (LeadID).

**Policy:** Do NOT automatically assign IDs to ambiguous rows.
- Leave untouched
- Identify possible matches by normalized mobile for admin review
- Optionally link manually later

No silent match/overwrite using phone number alone.

---

## Reconciliation

Report-only mode compares Firestore leads vs Sheet LeadIDs.

Report categories:
- `matched` — LeadID present in both
- `missing_in_sheet` — In Firestore, not in Sheet
- `missing_in_firestore` — In Sheet, not in Firestore
- `duplicate_sheet_lead_ids` — Same LeadID appears multiple times
- `field_mismatches` — Same LeadID, different field values

Separate **report** from **repair**.

---

## Manual Resync

Manager/admin capability: `POST /api/leads/[id]/resync` or `POST /api/admin/sheet-sync/[id]/retry`

Creates/requeues sync job — no direct client-side Google API calls.

---

## Admin Sync View

`GET /api/admin/sheet-sync` — Lists pending/retrying/failed jobs with:
- Lead reference
- Office
- Attempt count
- Last failure
- Next retry

Actions: Retry, View Lead

---

## Processor Scheduling

Vercel-compatible: `processPendingSheetSyncJobs(batchSize)`

Can be triggered via:
- Vercel Cron
- Protected processor endpoint
- Firestore trigger (future)

V1: Simplest reliable mechanism documented in `src/lib/google/processor.ts`

---

## Rate Limit / Quota Safety

- Read LeadID column (M) only — not entire workbook
- Batch row reads/writes
- Bounded lookup ranges
- No unnecessary polling
- No per-cell API requests

---

## Security

- Google credentials server-only (never exposed to browser)
- Spreadsheet IDs not treated as authorization
- Office authorization server-side
- Sync processor protected
- Manual retry admin/manager-authorized
- No service-account JSON committed
- Errors do not expose credentials
- Sheet content treated as untrusted external data during reconciliation

---

## Firestore Rules

`sheetSyncJobs` — Server-authoritative writes:

```javascript
match /sheetSyncJobs/{jobId} {
  allow read: if isActive() && (isAdmin() || isManager());
  allow write: if isActive() && (isAdmin() || isManager());
}
```

- Rep: no broad sync-job access
- Manager: permitted office visibility
- Admin: full visibility
- Disabled: denied

---

## Indexes Added

```json
{
  "collectionGroup": "sheetSyncJobs",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "nextAttemptAt", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "sheetSyncJobs",
  "fields": [
    { "fieldPath": "officeId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "sheetSyncJobs",
  "fields": [
    { "fieldPath": "leadId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

## Test Coverage

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `sheet-sync-mapping.test.ts` | 18 | Status/call-result mapping, date formatting (Perth/Brisbane), lead→row conversion, empty values, column extraction |
| `sheet-sync-retry.test.ts` | 17 | 429/500/502/503/504 retries, permanent failures, max attempts, exponential backoff |
| `sheet-sync-outbox.test.ts` | 3 | Operation types, schema fields, status transitions |

**Total new tests: 38** (265 total, up from 227)

---

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/google/auth.ts` | Service account authentication |
| `src/lib/google/config.ts` | Office workbook configuration |
| `src/lib/google/mappings.ts` | Lead ↔ Sheet row mapping |
| `src/lib/google/sheets.ts` | Google Sheets transport (read LeadID, append, update, upsert) |
| `src/lib/google/sync-jobs.ts` | Sync job model & repository (outbox pattern) |
| `src/lib/google/processor.ts` | Sync job processor |
| `src/lib/google/retry-policy.ts` | Pure retry policy (no server deps) |
| `src/lib/google/retry.ts` | Retry decision logic |
| `src/app/api/admin/sheet-sync/route.ts` | Admin sync monitoring API |
| `src/test/sheet-sync-mapping.test.ts` | 18 mapping tests |
| `src/test/sheet-sync-retry.test.ts` | 17 retry tests |
| `src/test/sheet-sync-outbox.test.ts` | 3 outbox tests |

---

## Files Modified

| File | Change |
|------|--------|
| `firestore.rules` | Added `sheetSyncJobs` rules (server-authoritative) |
| `firestore.indexes.json` | Added 3 sheetSyncJobs indexes |
| `package.json` / `package-lock.json` | Added `googleapis`, `google-auth-library` |

---

## Next Steps

1. **Configure credentials** in deployment environment:
   - `GOOGLE_SERVICE_ACCOUNT_KEY`
   - `GOOGLE_SHEETS_PERTH_SPREADSHEET_ID`
   - `GOOGLE_SHEETS_BRISBANE_SPREADSHEET_ID`
   - `GOOGLE_SHEETS_WORKSHEET_NAME` (optional, defaults to `LEADS`)

2. **Run live acceptance test** (see Phase 6B procedure):
   - Create synthetic test lead in Perth
   - Verify sync job created
   - Process sync → verify Perth sheet row inserted
   - Requeue → verify idempotent (same row)
   - Update lead → verify same row updated
   - Repeat for Brisbane
   - Cleanup test data
   - Run reconciliation report

3. **Mark Phase 6B complete** in project-state.md once live verification succeeds.

---

## Phase 7 Prerequisites

Phase 7 (Reporting & Admin) may begin once:
- Phase 6A automated implementation is committed (this commit)
- Phase 6B live verification succeeds OR is explicitly accepted as pending

---

*Documentation reflects automated implementation state as of commit. Live acceptance results will be appended upon successful verification.*