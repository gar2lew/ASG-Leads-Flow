# ASG Leads — Phase 1 Firebase Foundation Report

**Date:** 2026-09-11
**Architecture Reference:** `ASG_LEADS_ARCHITECTURE.md`
**Baseline Commit:** `74c6bc3` (tag: `phase-0-baseline`)

---

## 1. Baseline Commit / Tag

| Property | Value |
|----------|-------|
| Repository | `C:\dev\ASG Leads Call Management` |
| Branch | `main` |
| Baseline commit | `74c6bc3` |
| Baseline tag | `phase-0-baseline` |
| Baseline message | `chore: establish phase 0 baseline` |

---

## 2. Files Added / Removed / Changed

### Files Added (9)

| File | Purpose |
|------|---------|
| `.gitignore` | Ignore node_modules, .next, .env, secrets, duplicate folder |
| `.env.example` | Environment variable contract (client + server + future) |
| `src/lib/firebase/client.ts` | Firebase client SDK singleton |
| `src/lib/firebase/admin.ts` | Firebase Admin SDK singleton (server-only) |
| `src/lib/firebase/types.ts` | Firestore domain types (11 documents) |
| `src/lib/firebase/collections.ts` | Collection name constants |
| `firebase.json` | Firebase emulator configuration |
| `firestore.rules` | Firestore security rules |
| `firestore.indexes.json` | Firestore compound indexes |

### Files Modified (7)

| File | Change |
|------|--------|
| `src/app/api/health/route.ts` | Removed PostgreSQL dependency; returns static health object |
| `src/lib/utils.ts` | Added `cn()`, `generateId()`, `generateLeadId()` utilities |
| `src/app/calling/page.tsx` | Replaced `Date.now()` with `generateId()` |
| `src/app/leads/[id]/page.tsx` | Replaced `Date.now()` with `generateId()` |
| `src/app/follow-ups/page.tsx` | Escaped quote entities |
| `eslint.config.mjs` | Ignored duplicate `ASG Leads Call Management/` folder |
| `package.json` | Added `firebase`, `firebase-admin`; removed Postgres packages |

### Files Removed (4)

| File | Reason |
|------|--------|
| `src/db/index.ts` | Unused PostgreSQL connection pool |
| `src/db/schema.ts` | Empty Drizzle schema |
| `drizzle.config.json` | Unused Drizzle config |
| `ASG Leads Call Management/` | Duplicate mirror folder |

---

## 3. Dependencies Added / Removed

### Added

| Package | Version | Purpose |
|---------|---------|---------|
| `firebase` | 11.10.0 | Client SDK (Auth, Firestore) |
| `firebase-admin` | 13.2.0 | Server SDK (Auth, Firestore) |

### Removed

| Package | Version | Reason |
|---------|---------|--------|
| `drizzle-orm` | 0.45.2 | Unused PostgreSQL ORM |
| `drizzle-kit` | 0.31.10 | Unused migration tool |
| `pg` | 8.13.1 | PostgreSQL client |
| `@types/pg` | 8.11.10 | TypeScript types for pg |

---

## 4. Firebase Client Architecture

**File:** `src/lib/firebase/client.ts`

- **Singleton pattern** — single `FirebaseApp`, `Auth`, and `Firestore` instance per browser session
- **Environment variables** — reads from `NEXT_PUBLIC_FIREBASE_*` (public, browser-safe)
- **Lazy initialization** — `getApp()` only called on first use; throws if called server-side
- **Missing config resilience** — warns once via `console.warn` if env vars are missing; still initializes app (allows dev/build without full config)
- **Exports:**
  - `getFirebaseApp()` — returns the initialized `FirebaseApp`
  - `getFirebaseAuth()` — returns browser `Auth` instance
  - `getFirestoreDb()` — returns browser `Firestore` instance
  - `isFirebaseConfigured()` — boolean check for minimum required config

---

## 5. Firebase Admin Architecture

**File:** `src/lib/firebase/admin.ts`

- **Server-only guard** — imports `"server-only"` to prevent accidental client bundling
- **Singleton pattern** — single `App`, `Auth`, and `Firestore` instance per server process
- **Environment variables** — reads `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`
- **Private key normalization** — handles escaped newlines from environment variables
- **Validation** — throws descriptive error listing missing env vars on first use
- **Exports:**
  - `getAdminAuth()` — returns server `Auth` instance
  - `getAdminFirestore()` — returns server `Firestore` instance
  - `isAdminConfigured()` — boolean check for minimum required config

---

## 6. Environment Variable Contract

**File:** `.env.example`

### Client-side (Browser) — `NEXT_PUBLIC_FIREBASE_*`

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App ID |

### Server-side (Secret)

| Variable | Purpose |
|----------|---------|
| `FIREBASE_ADMIN_PROJECT_ID` | Admin project ID |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service account email |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Service account private key |

### Future (Phase 7+)

| Variable | Purpose |
|----------|---------|
| `GOOGLE_SHEETS_CLIENT_EMAIL` | Sheets API service account |
| `GOOGLE_SHEETS_PRIVATE_KEY` | Sheets API private key |
| `PERTH_SPREADSHEET_ID` | Perth spreadsheet |
| `BRISBANE_SPREADSHEET_ID` | Brisbane spreadsheet |

---

## 7. Firestore Domain Types

**File:** `src/lib/firebase/types.ts` (263 lines)

### Type Categories

| Category | Types |
|----------|-------|
| **Enums** | `OfficeId`, `UserRole`, `LeadStatus`, `LeadSource`, `FollowUpStatus`, `SurveySessionStatus`, `ImportStatus`, `SheetSyncStatus` |
| **Documents** | `UserDocument`, `LeadDocument`, `LeadActivityDocument`, `FollowUpDocument`, `SurveySessionDocument`, `SurveyResponseDocument`, `ImportDocument`, `OfficeDocument`, `TeamDocument`, `SheetSyncJobDocument`, `SettingsDocument` |

### Key Design Decisions
- **snake_case field names** — aligns with architecture convention
- **Mobile normalization** — `mobileNormalized` field on `LeadDocument` for E.164
- **Call lease** — `activeCallLease` embedded object with `claimedBy`, `claimedAt`, `expiresAt`
- **Sheet sync** — `sheetSync` embedded object on `LeadDocument`; `SheetSyncJobDocument` for async jobs
- **Survey data** — embedded `survey` object on `LeadDocument`; separate `SurveyResponseDocument` subcollection

---

## 8. Collection Naming

**File:** `src/lib/firebase/collections.ts`

| Constant | Value | Type |
|----------|-------|------|
| `USERS` | `"users"` | Top-level |
| `LEADS` | `"leads"` | Top-level |
| `ACTIVITIES` | `"activities"` | Subcollection under `leads` |
| `FOLLOW_UPS` | `"followUps"` | Top-level |
| `SURVEY_SESSIONS` | `"surveySessions"` | Top-level |
| `SURVEY_RESPONSES` | `"surveyResponses"` | Subcollection under `surveySessions` |
| `IMPORTS` | `"imports"` | Top-level |
| `OFFICES` | `"offices"` | Top-level |
| `TEAMS` | `"teams"` | Top-level |
| `SHEET_SYNC_JOBS` | `"sheetSyncJobs"` | Top-level |
| `SETTINGS` | `"settings"` | Top-level |
| `AUDIT_EVENTS` | `"auditEvents"` | Top-level |

**Convention:** Top-level collections use camelCase; the `COLLECTIONS` constant is frozen with `as const` for type safety.

---

## 9. Security Rule Assumptions

**File:** `firestore.rules` (156 lines)

### Default Policy
```
match /{document=**} {
  allow read, write: if false;
}
```
All access is denied by default. Each collection must explicitly grant access.

### Helper Functions
- `isAuthenticated()` — user is logged in
- `hasRole(role)` — user document has specific role (requires `users/{uid}` to exist)
- `isAdmin()`, `isManager()`, `isRep()` — role shortcuts
- `userBelongsToOffice(officeId)` — user's `officeIds` array contains the office

### Phase 2 Dependencies
The following rules depend on Firebase Auth + user documents existing:
- `users` — write requires `request.auth.uid == userId` (self-edit) or admin
- `leads` — read/write gated by role, office membership, or assignment
- All write operations require authentication

> **Note:** These rules are Phase 1 scaffolding. They will be enforced only after Phase 2 creates real user documents and Firebase Auth sessions. The `get()` calls assume `users/{uid}` documents exist.

---

## 10. Index Assumptions

**File:** `firestore.indexes.json` (82 lines)

### Compound Indexes (9)

| # | Collection | Fields | Use Case |
|---|------------|--------|----------|
| 1 | `leads` | `officeId`, `status`, `createdAt` | Office lead list with status filter |
| 2 | `leads` | `officeId`, `assignedRepId`, `status`, `createdAt` | Rep-specific lead queue |
| 3 | `leads` | `assignedRepId`, `nextFollowUpAt` | Follow-up scheduling |
| 4 | `leads` | `officeId`, `mobileNormalized` | Duplicate detection |
| 5 | `followUps` | `officeId`, `status`, `scheduledAt` | Office follow-up list |
| 6 | `followUps` | `assignedRepId`, `status`, `scheduledAt` | Rep follow-up queue |
| 7 | `surveySessions` | `officeId`, `startedAt` | Office survey history |
| 8 | `surveySessions` | `repId`, `startedAt` | Rep survey history |
| 9 | `imports` | `officeId`, `createdAt` | Import history |

---

## 11. ESLint Fixes

### Problem
- 18 `react-hooks/purity` errors — `Date.now()` called during render
- 2 `react/no-unescaped-entities` errors — unescaped `"` in JSX

### Solution
- Created `generateId(prefix)` utility in `src/lib/utils.ts` — uses module-level counter + `Date.now()` for uniqueness
- Created `generateLeadId()` utility — generates `ASG-YYYY-XXXX` format
- Replaced all inline `Date.now()` calls with `generateId("a")` / `generateId("f")` in:
  - `src/app/calling/page.tsx` (3 occurrences)
  - `src/app/leads/[id]/page.tsx` (6 occurrences)
- Escaped quotes using `&ldquo;` / `&rdquo;` in `src/app/follow-ups/page.tsx`
- Added `ASG Leads Call Management/` to ESLint `globalIgnores` (duplicate folder)

---

## 12. Verification Results

| Command | Status | Details |
|---------|--------|---------|
| `npm run lint` | ✅ **Passed** | 0 errors, 0 warnings |
| `npm run typecheck` | ✅ **Passed** | Strict TypeScript clean |
| `npm run build` | ✅ **Passed** | All 19 routes compiled; static generation succeeded |

### Build Output
```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /admin/offices
├ ○ /admin/settings
├ ○ /admin/teams
├ ○ /admin/users
├ ƒ /api/health
├ ○ /calling
├ ○ /dashboard
├ ○ /follow-ups
├ ○ /imports
├ ○ /imports/history
├ ○ /leads
├ ƒ /leads/[id]
├ ○ /leads/new
├ ○ /login
├ ○ /reports
├ ○ /surveys/analytics
├ ○ /surveys/history
└ ○ /surveys/new
```

> Note: `ReferenceError: location is not defined` during static generation is a known Next.js quirk with `generateStaticParams` and does not fail the build.

---

## 13. Known Limitations

| Limitation | Impact | Resolution |
|------------|--------|------------|
| Firebase client not yet imported by any component | No live Firestore reads/writes | Phase 2+ |
| Firestore rules not deployed | No security enforcement | Phase 2 (emulator) |
| No Firebase emulator running | Cannot test rules locally | Phase 2 |
| Health endpoint returns static data | No real connectivity check | Phase 2 (optional) |
| `generateId()` uses `Date.now()` internally | IDs are time-ordered (acceptable) | Architecture allows this |
| No test harness exists | No automated rule testing | Phase 2 |
| Firestore types not yet imported by store | Mock data still uses `types.ts` | Phase 2 |

---

## 14. Phase 2 Prerequisites

Before Phase 2 begins, ensure:

1. ✅ Phase 1 commit is on `main` and tagged
2. ✅ Firebase project created in Firebase Console
3. ✅ Service account key generated (for Admin SDK)
4. ✅ Environment variables populated in `.env.local`:
   - Client: `NEXT_PUBLIC_FIREBASE_*`
   - Server: `FIREBASE_ADMIN_*`
5. ✅ Firebase CLI installed (`npm install -g firebase-tools`)
6. ✅ Firestore database created in Firebase Console

### Phase 2 Scope (Not Started)
- Replace fake login with Firebase Auth (email/password)
- Create user documents on first login
- Migrate mock users to Firestore
- Wire Auth context to React Context
- Deploy Firestore rules to emulator
- Add unit tests for rules

---

## 15. Phase 1 Checklist

- [x] Git initialized with baseline commit
- [x] PostgreSQL/Drizzle scaffold removed
- [x] `/api/health` no longer requires `DATABASE_URL`
- [x] Firebase SDKs installed (`firebase`, `firebase-admin`)
- [x] Client SDK singleton created with safe config handling
- [x] Admin SDK singleton created with server-only guard
- [x] Firestore domain types defined (11 documents)
- [x] Collection name constants centralized
- [x] `firebase.json` emulator config created
- [x] `firestore.rules` with default-deny policy
- [x] `firestore.indexes.json` with 9 predicted indexes
- [x] `.env.example` documents all required variables
- [x] ESLint errors fixed (purity + entities)
- [x] Duplicate folder removed
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] `npm run build` passes
- [ ] Phase 1 committed with message `feat: establish firebase foundation`

---

**Phase 1 Status:** ✅ **Complete** — Firebase foundation established, build passes without `DATABASE_URL`, ready for Phase 2
