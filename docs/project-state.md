# ASG Leads — Project State Tracker

**Last Updated:** 2026-09-14
**Architecture Reference:** `ASG_LEADS_ARCHITECTURE.md`

---

## Current Git State

| Property | Value |
|----------|-------|
| Repository initialised | ✅ Yes |
| Current branch | `feat/lead-import-engine` |
| Starting commit | `65f2a72` (Phase 4 complete) |
| Current HEAD | `65f2a72` (Phase 5 in progress) |
| Working tree | ⚠️ Uncommitted Phase 5 changes |
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
| **Phase 5 — Import Engine** | ✅ **Complete** | CSV/XLSX parse, validate, deduplicate, execute | Committed as TBD |
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

**Total: 227 tests passing**

---

## Phase 5 Deliverables

### Domain Model (`src/lib/domain/import.ts`)
- `ImportStatus`: `uploaded | mapping | validated | importing | completed | completed_with_errors | failed | cancelled`
- `ImportRowStatus`: `pending | valid | invalid | duplicate | imported | failed | skipped`
- `ImportableField`: `name | mobile | address | suburb | postcode | notes | renterOwner | employmentStatus | superannuation | status | assignedRep | source`
- `AssignmentMode`: `single | round-robin | none`
- `ImportJob`, `ImportRow`, `ColumnMapping`, `RawRow`, `ValidatedRow` interfaces
- `IMPORT_LIMITS`: 10 MB file, 10,000 rows, 50 columns, 500-char fields

### Pure Logic (`src/lib/import-pure.ts`)
- `parseCSV` — PapaParse with quoted/comma/UTF-8 support
- `parseXLSX` — SheetJS first-sheet-only parsing
- `autoMapHeaders` — 40+ header synonyms (case-insensitive)
- `validateRow` — Name, mobile, enum, length validation
- `validateImportRowsLocal` — Full pipeline with in-file duplicate detection
- `assignRoundRobin` — Deterministic round-robin assignment

### Server-Side Engine (`src/lib/server/import-engine.ts`)
- `checkExistingDuplicates` — Batched Firestore leadMobileKeys lookup
- `validateImportRows` — Full validation with Firestore duplicate check
- Re-exports pure functions for convenience

### Repository (`src/lib/server/imports.ts`)
- `createImportJob` — Create import document
- `getImportJob` — Get import by ID
- `listImportJobs` — List imports filtered by office
- `saveValidatedRows` — Save validated rows and update counts
- `executeImport` — Execute validated rows with assignment
- `cancelImport` — Cancel import job

### Client Service (`src/lib/client/import-service.ts`)
- `createImport` — Upload file and create import job
- `getImport` — Get import detail
- `listImports` — List import history
- `parseImport` — Parse uploaded file
- `validateImport` — Apply mapping and validate rows
- `executeImport` — Execute validated rows
- `cancelImport` — Cancel import

### API Routes
- `POST /api/imports` — Create import job
- `GET /api/imports` — List import jobs
- `GET /api/imports/[id]` — Get import detail
- `POST /api/imports/[id]/parse` — Parse uploaded file
- `POST /api/imports/[id]/validate` — Apply mapping and validate rows
- `POST /api/imports/[id]/execute` — Execute validated rows
- `POST /api/imports/[id]/cancel` — Cancel import

### UI Components
- `/imports` — Import wizard (upload → map → validate → execute)
- `/imports/history` — Import history with office filtering
- `/imports/[id]` — Import detail with per-row outcomes

### Firestore Rules
- `imports` — Server-only writes (write: false), role-based read
- `imports/{id}/importRows` — Server-only writes (write: false), role-based read

### Firestore Indexes
- `imports` — `officeId + createdAt` (for office-filtered history)
- `importRows` — `status + rowNumber` (for ordered row queries)

---

## Architecture Decisions

### Server-Authoritative Writes
All import operations use Firebase Admin SDK (bypasses security rules). The `createdBy` field is derived from the session, never client-provided. `officeId` is validated against the current user's permissions.

### leadMobileKeys Uniqueness
The `leadMobileKeys` collection uses normalized mobile as document ID, enforcing uniqueness at the database level. This prevents duplicate leads even under concurrent imports.

### Idempotent Execution
Rows already marked as `imported` with a `leadId` are skipped on re-execution. This prevents duplicate leads if an import is retried after partial failure.

### Partial Failed Imports
If any row fails during execution, the import completes with status `completed_with_errors`. Successfully imported rows remain imported. The `failedRows` counter tracks failures.

### Conservative Auto-Mapping
Unknown headers are marked as `"ignore"` rather than aggressively guessed. Users must manually map required fields (`name`, `mobile`).

---

## Next Approved Phase

**Phase 6 — Google Sheets Synchronization**

Prerequisites: ✅ Phase 3 (lead creation), ✅ Phase 4 (survey → lead conversion), ✅ Phase 5 (import engine)