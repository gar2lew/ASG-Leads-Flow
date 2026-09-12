# ASG Leads — Project State Tracker

**Last Updated:** 2026-09-12
**Architecture Reference:** `ASG_LEADS_ARCHITECTURE.md`

---

## Current Git State

| Property | Value |
|----------|-------|
| Repository initialised | ✅ Yes |
| Current branch | `feat/survey-persistence` |
| Starting commit | `f0d2d39` (Phase 3B complete) |
| Current HEAD | `f0d2d39` (Phase 4 in progress) |
| Working tree | ⚠️ Uncommitted Phase 4 changes |
| Remote configured | ❌ No |

---

## Phase Status

| Phase | Status | Exit Criteria Met | Notes |
|-------|--------|-------------------|-------|
| **Phase 0 — Baseline Audit** | ✅ **Complete** | Documentation created | Baseline tagged `phase-0-baseline` |
| **Phase 1 — Firebase Foundation** | ✅ **Complete** | Build without `DATABASE_URL` | Committed as `af8a055` |
| **Phase 2 — Authentication & Users** | ✅ **Complete (Hardened)** | Auth implemented, route protection, tests | Committed as `436ec12`, `89ab6bc` |
| **Phase 3 — Leads & Activity Timeline** | ✅ **Complete** | Lead persistence layer, UI integration, data integrity | Phase 3A: `2776d1e`, Phase 3B: `f0d2d39` |
| **Phase 4 — Community Survey Persistence** | ✅ **Complete** | Firestore-backed surveys, autosave, lead conversion, tests | Committed as TBD |
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
| `npm run build` | ✅ **Passed** | All 34 routes compiled |
| Authorization unit tests | ✅ **Passed** | 29 tests passing |
| Firestore rules tests | ✅ **Passed** | 21 tests (emulator verified) |
| Lead persistence tests | ✅ **Passed** | 24 tests (emulator verified) |
| Domain unit tests | ✅ **Passed** | 40 tests (mobile + validation) |
| Phase 3B integration tests | ✅ **Passed** | 11 tests (emulator verified) |
| Timezone tests | ✅ **Passed** | 15 tests |
| Phase 4 survey lifecycle tests | ✅ **Passed** | 16 tests (emulator verified) |

**Total: 167 tests passing**

---

## Phase 4 Deliverables

### Domain Model (`src/lib/domain/survey.ts`)
- `HousingStatus`: `renter | owner | other`
- `EmploymentStatus`: `full_time | part_time | casual | self_employed | retired | other`
- `SuperannuationRange`: `under_50k | 50k_100k | 75k_150k | 100k_200k | 200k_500k | 500k_plus | dont_know`
- `CostOfLivingAnswer`: `yes | no | null`
- `TaxAnswer`: `yes | no | null`
- `SurveySessionStatus`: `draft | in_progress | completed | cancelled`
- Full display labels for all canonical values

### Repository (`src/lib/server/surveys.ts`)
- `createSurveySession` — derives identity from auth, validates office access
- `getActiveSurveySession` — queries by repUserId + officeId + status
- `listSurveySessions` — office/role-aware filtering with pagination
- `completeSurveySession` — transactional completion, calculates counts from responses
- `createSurveyResponse` — creates subcollection document
- `updateSurveyResponse` — validates allowed fields, checks session status
- `convertSurveyResponseToLead` — transactional conversion with duplicate mobile protection
- `getSurveyAnalytics` — aggregates metrics from completed sessions

### API Routes
- `POST /api/surveys` — create new session
- `GET /api/surveys` — list/filter sessions
- `GET /api/surveys/[id]` — get session + responses
- `PUT /api/surveys/[id]` — update session
- `POST /api/surveys/[id]/responses` — create response
- `PUT /api/surveys/[id]/responses/[responseId]` — autosave response
- `POST /api/surveys/[id]/complete` — complete session or convert respondent to lead
- `GET /api/surveys/analytics` — aggregated metrics

### UI Components
- `/surveys/new` — Firestore-backed survey with debounced autosave
- `/surveys/history` — real survey history with pagination
- `/surveys/analytics` — real analytics with charts

### Firestore Rules
- `surveySessions` — server-authoritative writes (write: false), role-based read
- `surveySessions/{id}/responses` — server-authoritative writes (write: false), role-based read
- Office boundaries enforced via `getAccessibleOffices` pattern

### Firestore Indexes
- `repUserId + status + updatedAt` (for active session queries)
- `officeId + status + updatedAt` (for manager/admin session lists)
- `officeId + updatedAt` (for unfiltered office queries)
- `repUserId + updatedAt` (for rep-specific session lists)

---

## Architecture Decisions

### One Active Session Per Rep Per Office
The current implementation uses a query-based approach where `getActiveSurveySession` returns the most recent in_progress/draft session for the given rep + office. To prevent concurrent "start survey" requests from creating multiple active sessions, the UI creates exactly one session on mount and reuses it.

### Transactional Lead Conversion
All conversion operations happen within a single Firestore transaction:
1. Read session and response (validate access)
2. Check `becameLead` flag (idempotency)
3. Validate and normalize mobile number
4. Check `leadMobileKeys/{mobile}` for duplicates
5. Create lead document
6. Create `leadMobileKeys/{mobile}` entry
7. Create activity record
8. Update response with `becameLead=true, leadId=X`
9. Increment session `leadCount`

If any step fails, the entire transaction rolls back, leaving no partial state.

### Autosave
The New Survey UI implements a 500ms debounced autosave:
- `scheduleSave` coalesces rapid changes
- `flushSave` performs the actual Firestore write
- Navigation (Previous/Next) triggers immediate flush
- Session completion waits for flush before completing
- Save status is visible: "Saving...", "Saved", "Save failed"

### Anonymous Respondents
Survey responses have no required identifying fields. Anonymous respondents:
- Have `becameLead: false` and `leadId: null`
- Have no name, mobile, or address fields in the response document
- Their survey answers are still persisted for analytics

### Duplicate Mobile Handling
When a respondent chooses to become a lead:
1. Mobile is normalized using existing `normalizeAustralianMobile` logic
2. Transaction checks `leadMobileKeys/{mobile}`
3. If key exists, returns `DUPLICATE_MOBILE` error
4. UI shows: "A lead with this mobile number already exists"
5. The existing lead is NOT automatically associated with the survey response

---

## Next Approved Phase

**Phase 5 — Lead Import Engine**

Prerequisites: ✅ Phase 3 (lead creation), ✅ Phase 4 (survey → lead conversion)