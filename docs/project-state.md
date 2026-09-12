# ASG Leads — Project State Tracker

**Last Updated:** 2026-09-12
**Architecture Reference:** `ASG_LEADS_ARCHITECTURE.md`

---

## Current Git State

| Property | Value |
|----------|-------|
| Repository initialised | ✅ Yes |
| Current branch | `feat/firestore-leads-ui` |
| Starting commit | `2776d1e` (Phase 3A complete) |
| Current HEAD | `2776d1e` (Phase 3B in progress) |
| Working tree | ⚠️ Uncommitted Phase 3B changes |
| Remote configured | ❌ No |

---

## Phase Status

| Phase | Status | Exit Criteria Met | Notes |
|-------|--------|-------------------|-------|
| **Phase 0 — Baseline Audit** | ✅ **Complete** | Documentation created | Baseline tagged `phase-0-baseline` |
| **Phase 1 — Firebase Foundation** | ✅ **Complete** | Build without `DATABASE_URL` | Committed as `af8a055` |
| **Phase 2 — Authentication & Users** | ✅ **Complete (Hardened)** | Auth implemented, route protection, tests | Committed as `436ec12`, `89ab6bc` |
| **Phase 3 — Leads & Activity Timeline** | ✅ **Complete** | Lead persistence layer, UI integration, data integrity | Phase 3A: `2776d1e`, Phase 3B: pending commit |
| Phase 4 — Community Survey Persistence | ⏳ Pending | Survey autosave, resume, lead conversion | Depends on Phase 3 |
| Phase 5 — Import Engine | ⏳ Pending | CSV/XLSX parse, validate, deduplicate | Depends on Phase 1 |
| Phase 6 — Google Sheets Sync | ⏳ Pending | LeadID upsert, retry, failure visibility | Depends on Phase 3, 5 |
| Phase 7 — Reporting & Admin | ⏳ Pending | No hard-coded metrics remain | Depends on Phase 3, 6 |
| Phase 8 — Production Hardening | ⏳ Pending | Full test suite, Vercel deploy | Depends on all prior |

---

## Verification Status

| Check | Status | Details |
|-------|--------|---------|
| `npm install` | ✅ Passed | Dependencies installed |
| `npm run lint` | ✅ **Passed** | 0 errors, 0 warnings |
| `npm run typecheck` | ✅ **Passed** | Strict TypeScript clean |
| `npm run build` | ✅ **Passed** | All 28 routes compiled |
| Authorization unit tests | ✅ **Passed** | 29 tests passing |
| Firestore rules tests | ✅ **Passed** | 21 tests (emulator verified) |
| Lead persistence tests | ✅ **Passed** | 24 tests (emulator verified) |
| Domain unit tests | ✅ **Passed** | 40 tests (mobile + validation) |
| Phase 3B integration tests | ✅ **Passed** | 11 tests (emulator verified) |
| Timezone tests | ✅ **Passed** | 15 tests |
| **Total** | ✅ **151 tests** | All passing |

---

## Next Approved Phase

**Phase 4 — Community Survey Persistence and Lead Conversion**

### Prerequisites (Must Complete First)
1. ✅ Phase 3 committed
2. ⏳ Firebase project configured
3. ⏳ Development users seeded
4. ⏳ Auth flow manually verified

### Phase 4 Exit Criteria (from Architecture)
- Survey sessions persist to Firestore
- Partial survey state recoverable
- Survey-to-lead conversion creates lead documents
- Survey history viewable

---

## Key Technical Debt (Pre-Existing)

| Item | Location | Severity |
|------|----------|----------|
| `Date.now()` in render (18×) | `calling/page.tsx`, `leads/[id]/page.tsx` | ✅ Fixed in Phase 1 |
| Unescaped `"` in JSX (2×) | `follow-ups/page.tsx:119` | ✅ Fixed in Phase 1 |
| Hard-coded demo metrics | `reports/page.tsx`, `surveys/analytics/page.tsx` | Phase 7 |
| Fake authentication | `src/lib/store.tsx` | ✅ Fixed in Phase 2 |
| No persistence layer | Entire app | ✅ Fixed in Phase 3 |
| Duplicate folder | `ASG Leads Call Management/` | ✅ Removed in Phase 1 |
| Mock data in some pages | `imports/`, `surveys/`, `reports/` | Phase 7 |

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
| `GOOGLE_SHEETS_CLIENT_EMAIL` | Phase 6+ (server) | ❌ Not set |
| `PERTH_SPREADSHEET_ID` | Phase 6+ | ❌ Not set |
| `BRISBANE_SPREADSHEET_ID` | Phase 6+ | ❌ Not set |

---

## Notes for Next Session

1. **Phase 3B must be committed** — `git add` intended files only, commit with `feat: connect lead management ui to firestore`
2. **No secrets in commit** — `.env.local`, `*.json` service keys, `.pem` files are gitignored
3. **Phase 4 requires Firebase project** — create in Console before starting
4. **Do not connect Google Sheets yet** — Phase 6
5. **Do not redesign UI** — Astra prototype is approved baseline
6. **Preserve mobile behaviour** — drawer + bottom nav patterns working
7. **Hard-coded metrics in reports/surveys are intentional demo data** — replace in Phase 7