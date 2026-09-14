# ASG Leads — Project State Tracker

**Last Updated:** 2026-09-14
**Architecture Reference:** `ASG_LEADS_ARCHITECTURE.md`

---

## Current Git State

| Property | Value |
|----------|-------|
| Repository initialised | ✅ Yes |
| Current branch | `feat/google-sheets-sync` |
| Starting commit | `1ed97db` (Phase 6A complete) |
| Current HEAD | `1ed97db` (Phase 6B in progress) |
| Working tree | ⚠️ Uncommitted Phase 6 changes |
| Remote configured | ❌ No |

---

## Phase Status

| Phase | Status | Exit Criteria Met | Notes |
|-------|--------|-------------------|-------|
| **Phase 0 — Baseline Audit** | ✅ **Complete** | Documentation created | Baseline tagged `phase-0-baseline` |
| **Phase 1 — Firebase Foundation** | ✅ **Complete** | Build without `DATABASE_URL` | Committed as `af8a055` |
| **Phase 2 — Authentication & Users** | ✅ **Complete (Hardened)** | Auth implemented, route protection, tests | Committed as `436ec12`, `89ab6bc` |
| **Phase 3 — Leads & Activity Timeline** | ✅ **Complete** | Lead persistence layer, UI integration, data integrity | Phase 3A: `2776d1e`, Phase 3B: `f0d2d39` |
| **Phase 4 — Community Survey Persistence** | ✅ **Complete** | Firestore-backed surveys, autosave, lead conversion, tests | Committed as `65f2a72` |
| **Phase 5 — Import Engine** | ✅ **Complete** | CSV/XLSX parse, validate, deduplicate, execute | Committed as `1ed97db` |
| **Phase 6A — Google Sheets Sync Engineering** | ✅ **Complete** | Sync job model, outbox, upsert, retry, mappings, processor, tests | Committed as TBD |
| **Phase 6B — Live Google Sheets Acceptance** | ⏸️ **Blocked / Pending Credentials** | Live insert, update, idempotency, reconciliation | Missing Google env vars |
| Phase 7 — Reporting & Admin | ⏳ Pending | No hard-coded metrics remain | Depends on Phase 3, 6 |
| Phase 8 — Production Hardening | ⏳ Pending | Full test suite, Vercel deploy | Depends on all prior |

---

## Verification Status

| Check | Status | Details |
|-------|--------|---------|
| `npm install` | ✅ Passed | Dependencies installed |
| `npm run lint` | ✅ **Passed** | 0 errors, 0 warnings |
| `npm run typecheck` | ✅ **Passed** | Strict TypeScript clean |
| `npm run build` | ✅ **Passed** | All routes compiled |
| Authorization unit tests | ✅ **Passed** | 29 tests passing |
| Firestore rules tests | ✅ **Passed** | 21 tests (emulator verified) |
| Lead persistence tests | ✅ **Passed** | 24 tests (emulator verified) |
| Domain unit tests | ✅ **Passed** | 40 tests (mobile + validation) |
| Phase 3B integration tests | ✅ **Passed** | 11 tests (emulator verified) |
| Timezone tests | ✅ **Passed** | 15 tests |
| Phase 4 survey lifecycle tests | ✅ **Passed** | 16 tests (emulator verified) |
| Import parsing tests | ✅ **Passed** | 17 tests |
| Import mapping/validation tests | ✅ **Passed** | 26 tests |
| Import execution tests | ✅ **Passed** | 17 tests |
| Sheet sync mapping tests | ✅ **Passed** | 18 tests |
| Sheet sync retry tests | ✅ **Passed** | 17 tests |
| Sheet sync outbox tests | ✅ **Passed** | 3 tests |

**Total: 265 tests passing**

---

## Phase 5 Deliverables

[Content unchanged - Phase 5 deliverables remain documented]

---

## Phase 6A Deliverables

### Google Sheets Sync Engine (`src/lib/google/`)

- `auth.ts` — Service account authentication (server-only)
- `config.ts` — Office workbook configuration (Perth/Brisbane)
- `mappings.ts` — Lead ↔ Sheet row mapping (A-M columns)
- `sheets.ts` — Google Sheets transport (read LeadID, append, update, upsert)
- `sync-jobs.ts` — Sync job model & repository (outbox pattern)
- `processor.ts` — Sync job processor (bounded batch processing)
- `retry-policy.ts` — Pure retry policy (no server deps)
- `retry.ts` — Retry decision logic

### Sync Job Model

- Collection: `sheetSyncJobs/{jobId}`
- Operations: `upsert_lead`, `archive_lead`, `reconcile_lead`
- Statuses: `pending`, `processing`, `completed`, `retrying`, `failed`
- Idempotency key prevents duplicate job creation

### Outbox Pattern

Firestore mutation → sync job created → processor → Google Sheets (async)

Firestore remains source of truth. Sheets failure never rolls back Firestore.

### Idempotent Upsert

LeadID (column M) is stable cross-system identifier.
- First sync → append new row
- Re-sync → update same row (by LeadID)
- Row count never increases

### Retry Policy

Exponential backoff: 1m → 3m → 9m → 27m → 1h (max 5 attempts)
Transient errors (429, 500, 502, 503, 504) retry; permanent errors fail fast.

### Failure Safety

If Sheets fails: Firestore lead valid, user workflow succeeds, sync job records failure, retry scheduled.

### Admin Monitoring

`GET /api/admin/sheet-sync` — pending/retrying/failed jobs with retry actions.

### Firestore Rules

`sheetSyncJobs` — server-authoritative writes (read/write: admin + manager only).

### Firestore Indexes

- `status + nextAttemptAt`
- `officeId + status + createdAt`
- `leadId + createdAt`

### Test Coverage

- `sheet-sync-mapping.test.ts` — 18 tests
- `sheet-sync-retry.test.ts` — 17 tests
- `sheet-sync-outbox.test.ts` — 3 tests

---

## Architecture Decisions

### Firestore Authority Model

Firestore remains the **source of truth**. Google Sheets is an asynchronous, eventually-consistent replica.

### LeadID as Stable Identifier

Never use spreadsheet row number. LeadID (column M) is the cross-system key.

### Conservative Column Mapping

Canonical app values mapped to human-readable Sheet display text. Unknown headers marked "ignore".

### Server-Only Google API

Google credentials never exposed to browser. All Sheets API calls via Admin SDK/server routes.

### Timezone-Aware Display

Perth: Australia/Perth. Brisbane: Australia/Brisbane. Format: DD/MM/YYYY HH:mm.

### Legacy Row Handling

Rows without LeadID left untouched. Manual reconciliation path documented.

### Reconciliation Separation

Report-only mode (matched, missing, duplicate, mismatches) separate from repair.

---

## Phase 6B — Live Verification Status

**BLOCKED** — Missing required environment variables:

- `GOOGLE_SERVICE_ACCOUNT_KEY`
- `GOOGLE_SHEETS_PERTH_SPREADSHEET_ID`
- `GOOGLE_SHEETS_BRISBANE_SPREADSHEET_ID`
- `GOOGLE_SHEETS_WORKSHEET_NAME`

No credentials invented or exposed. Live acceptance pending configuration.

---

## Next Approved Phase

**Phase 7 — Reporting & Admin**

Prerequisites: ✅ Phase 3, ✅ Phase 4, ✅ Phase 5, ✅ Phase 6A

Phase 6B live verification should complete before Phase 7 begins, but may proceed in parallel with documented pending status.