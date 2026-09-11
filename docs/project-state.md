# ASG Leads — Project State Tracker

**Last Updated:** 2026-09-11  
**Architecture Reference:** `ASG_LEADS_ARCHITECTURE.md`

---

## Current Git State

| Property | Value |
|----------|-------|
| Repository initialised | ✅ Yes |
| Current branch | `feat/firebase-auth` |
| Current commit | `af8a055` (Phase 1) |
| Working tree | ⚠️ Uncommitted Phase 2 changes |
| Remote configured | ❌ No |
| Phase 2 commit | ⏳ Pending |

---

## Phase Status

| Phase | Status | Exit Criteria Met | Notes |
|-------|--------|-------------------|-------|
| **Phase 0 — Baseline Audit** | ✅ **Complete** | Documentation created, failures recorded | Baseline tagged `phase-0-baseline` |
| **Phase 1 — Firebase Foundation** | ✅ **Complete** | Build passes without `DATABASE_URL`, Firebase SDKs installed | Committed as `af8a055` |
| **Phase 2 — Authentication & Users** | ✅ **Complete** | Firebase Auth implemented, route protection, user provisioning | Awaiting commit |
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
| `npm run lint` | ✅ **Passed** | 0 errors |
| `npm run typecheck` | ✅ **Passed** | Strict TypeScript clean |
| `npm run build` | ✅ **Passed** | All 22 routes compiled |
| Unit tests | ⏳ Stub | Test structure created, needs emulator |
| Firebase emulator tests | ⏳ Pending | Requires running emulator |
| Playwright E2E tests | ❌ Not exist | Not yet implemented |

---

## Next Approved Phase

**Phase 3 — Lead Persistence and Activity History**

### Prerequisites (Must Complete First)
1. ✅ Phase 2 commit on `feat/firebase-auth`
2. ⏳ Firebase project configured
3. ⏳ Development users seeded
4. ⏳ Auth flow manually verified

### Phase 3 Exit Criteria (from Architecture)
- Leads persist across reload/session
- Activity history is durable
- Role restrictions work

---

## Key Technical Debt (Pre-Existing)

| Item | Location | Severity |
|------|----------|----------|
| `Date.now()` in render (18×) | `calling/page.tsx`, `leads/[id]/page.tsx` | ✅ Fixed in Phase 1 |
| Unescaped `"` in JSX (2×) | `follow-ups/page.tsx:119` | ✅ Fixed in Phase 1 |
| Hard-coded demo metrics | `reports/page.tsx`, `surveys/analytics/page.tsx`, `dashboard/page.tsx` | Phase 8 |
| Fake authentication | `src/lib/store.tsx` | ✅ Fixed in Phase 2 |
| No persistence layer | Entire app | Phase 3 |
| Duplicate folder | `ASG Leads Call Management/` | ✅ Removed in Phase 1 |

---

## Environment Configuration

| Variable | Required For | Status |
|----------|--------------|--------|
| `DATABASE_URL` | PostgreSQL (removed) | ✅ No longer required |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Phase 1+ (client) | ❌ Not set |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Phase 1+ (client) | ❌ Not set |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Phase 1+ (client) | ❌ Not set |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Phase 1+ (client) | ❌ Not set |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Phase 1+ (client) | ❌ Not set |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Phase 1+ (client) | ❌ Not set |
| `FIREBASE_ADMIN_PROJECT_ID` | Phase 1+ (server) | ❌ Not set |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Phase 1+ (server) | ❌ Not set |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Phase 1+ (server) | ❌ Not set |
| `GOOGLE_SHEETS_CLIENT_EMAIL` | Phase 7+ (server) | ❌ Not set |
| `PERTH_SPREADSHEET_ID` | Phase 7+ | ❌ Not set |
| `BRISBANE_SPREADSHEET_ID` | Phase 7+ | ❌ Not set |

---

## Notes for Next Session

1. **Phase 2 must be committed first** — `git add` intended files only, commit with `feat: add firebase authentication and authorization`
2. **No secrets in commit** — `.env.local`, `*.json` service keys, `.pem` files are gitignored
3. **Phase 3 requires Firebase project** — create in Console before starting
4. **Do not connect Google Sheets yet** — Phase 7
5. **Do not redesign UI** — Astra prototype is approved baseline
6. **Preserve mobile behaviour** — drawer + bottom nav patterns working
7. **Hard-coded metrics are intentional demo data** — replace in Phase 8 only
