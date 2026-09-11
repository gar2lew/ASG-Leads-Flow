# ASG Leads — Project State Tracker

**Last Updated:** 2026-09-11  
**Architecture Reference:** `ASG_LEADS_ARCHITECTURE.md`

---

## Current Git State

| Property | Value |
|----------|-------|
| Repository initialised | ❌ No (`fatal: not a git repository`) |
| Current branch | N/A |
| Current commit | N/A |
| Working tree clean | N/A |
| Remote configured | N/A |

> **Action Required:** `git init` and baseline commit before Phase 1.

---

## Phase Status

| Phase | Status | Exit Criteria Met | Notes |
|-------|--------|-------------------|-------|
| **Phase 0 — Baseline Audit** | ✅ **Complete** | Documentation created, failures recorded | This audit |
| Phase 1 — Firebase Foundation | ⏳ Pending | Build without `DATABASE_URL` | Requires PostgreSQL removal first |
| Phase 2 — Authentication & Users | ⏳ Pending | Fake login removed, role/office tested | Depends on Phase 1 |
| Phase 3 — Leads & Activity Timeline | ⏳ Pending | Leads persist, activity durable | Depends on Phase 2 |
| Phase 4 — Calling & Follow-ups | ⏳ Pending | Call lease, Save & Next atomic | Depends on Phase 3 |
| Phase 5 — Survey Productionisation | ⏳ Pending | Autosave, resume, lead conversion | Depends on Phase 3 |
| Phase 6 — Import Engine | ⏳ Pending | CSV/XLSX parse, validate, deduplicate | Depends on Phase 1 |
| Phase 7 — Google Sheets Sync | ⏳ Pending | LeadID upsert, retry, failure visibility | Depends on Phase 3, 6 |
| Phase 8 — Reporting & Admin | ⏳ Pending | No hard-coded metrics remain | Depends on Phase 3, 7 |
| Phase 9 — Production Hardening | ⏳ Pending | Full test suite, Vercel deploy | Depends on all prior |

---

## Verification Status

| Check | Status | Details |
|-------|--------|---------|
| `npm install` | ✅ Passed | Dependencies installed |
| `npm run lint` | ❌ **Failed** | 20 errors (purity + unescaped entities) |
| `npm run typecheck` | ✅ Passed | Strict TypeScript clean |
| `npm run build` | ❌ **Failed** | `DATABASE_URL is required` at `/api/health` |
| Unit tests | ❌ Not exist | Not yet implemented |
| Firebase emulator tests | ❌ Not exist | Not yet implemented |
| Playwright E2E tests | ❌ Not exist | Not yet implemented |

---

## Next Approved Phase

**Phase 1 — Firebase Foundation**

### Prerequisites (Must Complete First)
1. `git init` → baseline commit tagged `phase-0-baseline`
2. Remove PostgreSQL/Drizzle scaffold (`src/db/`, `drizzle.config.json`, deps)
3. Fix `/api/health` to not require `DATABASE_URL`
4. (Recommended) Fix ESLint purity errors for clean lint gate

### Phase 1 Exit Criteria (from Architecture)
- ✅ Application builds without `DATABASE_URL`
- ✅ Firebase configuration isolated and testable
- ✅ No production secrets committed

---

## Key Technical Debt (Pre-Existing)

| Item | Location | Severity |
|------|----------|----------|
| `Date.now()` in render (18×) | `calling/page.tsx`, `leads/[id]/page.tsx` | Lint error |
| Unescaped `"` in JSX (2×) | `follow-ups/page.tsx:119` | Lint error |
| Hard-coded demo metrics | `reports/page.tsx`, `surveys/analytics/page.tsx`, `dashboard/page.tsx` | Architecture violation |
| Fake authentication | `src/lib/store.tsx:53-65` | Architecture violation |
| No persistence layer | Entire app | Architecture violation |
| Duplicate folder | `ASG Leads Call Management/` | Housekeeping |

---

## Environment Configuration

| Variable | Required For | Status |
|----------|--------------|--------|
| `DATABASE_URL` | PostgreSQL (current build blocker) | ❌ Not set |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Phase 1+ | ❌ Not set |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Phase 1+ | ❌ Not set |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Phase 1+ | ❌ Not set |
| `FIREBASE_ADMIN_PROJECT_ID` | Phase 1+ (server) | ❌ Not set |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Phase 1+ (server) | ❌ Not set |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Phase 1+ (server) | ❌ Not set |
| `GOOGLE_SHEETS_CLIENT_EMAIL` | Phase 7+ (server) | ❌ Not set |
| `PERTH_SPREADSHEET_ID` | Phase 7+ | ❌ Not set |
| `BRISBANE_SPREADSHEET_ID` | Phase 7+ | ❌ Not set |

---

## Notes for Next Session

1. **Start with Git init** — repository has no version control
2. **Phase 1 sequence is prescriptive** — follow the 10-step order in audit §16
3. **Do not connect Google Sheets yet** — Phase 7
4. **Do not redesign UI** — Astra prototype is approved baseline
5. **Preserve mobile behaviour** — drawer + bottom nav patterns working
6. **Hard-coded metrics are intentional demo data** — replace in Phase 8 only