# ASG Leads — Production Architecture

**Status:** Implementation source of truth  
**Target platform:** Vercel + Firebase  
**Frontend foundation:** Astra 6 / LMArena prototype supplied in `asg-leads-platform-design.zip`  
**Primary offices:** Perth and Brisbane  
**Primary purpose:** Lead intake, survey capture, lead distribution, calling, follow-up, booking, reporting and Google Sheets synchronisation.

---

## 1. Executive Summary

ASG Leads is an internal sales-operations application for Amplify Solutions Group. It replaces spreadsheet-first lead handling with a purpose-built web application while preserving the two existing Google Sheets workbooks as downstream operational mirrors/integration destinations.

The application must support the complete lead lifecycle:

**Capture → Import → Assign → Call → Update → Follow Up → Qualify → Book → Report**

The supplied Astra prototype is the visual and interaction foundation. The implementation task is to preserve that design while replacing mock state and the unused PostgreSQL scaffold with production Firebase services.

### Production architecture

```text
                        ASG Leads
                  Next.js 16 / React 19
                         Vercel
                           │
              ┌────────────┼────────────┐
              │            │            │
        Firebase Auth   Firestore    Server APIs
              │            │            │
              │            │      Firebase Admin SDK
              │            │            │
              │            │      Google Sheets API
              │            │        │           │
              │            │      Perth      Brisbane
              │            │
              │      ┌─────┴───────────────┐
              │      │                     │
             Users   Leads            Survey Sessions
                     │                     │
                 Activities             Responses
                     │
                 Follow-ups
```

### Source-of-truth rule

**Cloud Firestore is the authoritative application database.**

Google Sheets is a synchronised operational mirror/export target. Application correctness must never depend on a spreadsheet row number or successful real-time availability of Google Sheets.

---

## 2. Existing Prototype Audit

The supplied prototype currently contains:

- Next.js 16.2.6
- React 19.2.6
- TypeScript 5.9.3
- Tailwind CSS 4
- Recharts
- Responsive desktop/mobile application shell
- Dashboard
- Leads list
- Lead detail
- Call queue/workspace
- Follow-ups
- Community survey workflow
- Survey history/analytics
- Lead imports and import history
- Reports
- Admin users, teams, offices and settings
- Mock users, leads, activities, follow-ups, surveys and imports
- In-memory React Context state in `src/lib/store.tsx`
- Fake authentication based on mock users
- PostgreSQL/Drizzle packages and `DATABASE_URL` requirement
- Empty Drizzle schema

### Current key routes

```text
/login
/dashboard
/leads
/leads/new
/leads/[id]
/calling
/follow-ups
/surveys/new
/surveys/history
/surveys/analytics
/imports
/imports/history
/reports
/admin/users
/admin/teams
/admin/offices
/admin/settings
/api/health
```

### Required preservation rule

The existing Astra UI/UX is considered the approved design baseline.

Implementation agents must:

- preserve the established navigation, layout and visual language;
- avoid redesigning working screens unless production behaviour requires it;
- make focused changes rather than broad rewrites;
- preserve mobile behaviour;
- progressively replace mock/store logic with service-layer calls;
- maintain a clear distinction between UI components and persistence/business logic.

---

## 3. Technology Decisions

### 3.1 Frontend

- Next.js App Router
- React
- TypeScript strict mode
- Tailwind CSS
- Recharts for existing reporting visualisations
- PWA-ready responsive web application

### 3.2 Hosting

- Vercel
- Preview deployments for pull requests/branches
- Production deployment from protected primary branch

### 3.3 Authentication

- Firebase Authentication
- Email/password for initial release
- Password reset
- Persistent authenticated sessions
- Server-verified identity for privileged operations

### 3.4 Database

- Cloud Firestore
- Firebase Admin SDK for trusted server-side operations
- Firebase client SDK only for permitted client access

### 3.5 File storage

Firebase Storage is optional for MVP and should only be introduced where required, such as retained import files or future lead attachments.

### 3.6 Google Sheets

- Google Sheets API
- Server-side only
- Credentials must never be exposed to the browser
- Synchronisation by immutable `LeadID`, never sheet row number

### 3.7 Remove PostgreSQL scaffold

Remove once the Firebase foundation is established and tests confirm no dependency:

```text
drizzle-orm
drizzle-kit
pg
@types/pg
src/db/*
drizzle.config.json
DATABASE_URL requirement
```

Add:

```text
firebase
firebase-admin
```

Do not retain two persistence systems without a concrete requirement.

---

## 4. Domain Model

### 4.1 Office

Initial office identifiers:

```text
perth
brisbane
```

Display names:

```text
Perth
Brisbane
```

Do not persist office names as the relationship key. Use `officeId`.

### 4.2 User roles

Initial roles:

```text
rep
manager
admin
```

#### Rep

May:

- see leads assigned to them;
- work their call queue;
- add notes and call outcomes;
- schedule and complete follow-ups;
- submit surveys;
- create leads through permitted workflows;
- see their own activity/performance.

#### Manager

May:

- access all leads for authorised offices;
- assign/reassign leads;
- import leads;
- manage rep queues and follow-ups;
- view office reporting;
- correct lead data;
- view survey results for authorised offices.

#### Admin

May:

- access all offices;
- manage users, teams and offices;
- manage application settings;
- view organisation-wide reporting;
- perform imports/exports;
- review audit/synchronisation status.

### 4.3 Lead status

Canonical initial status enum:

```text
new
no_answer
callback
contacted
interested
qualified
booked
revisit
not_interested
disqualified
wrong_number
```

UI may display friendly labels such as `No Answer`, but persistence should use stable machine values.

### 4.4 Lead source

Canonical initial values:

```text
community_survey
csv_import
spreadsheet_import
marketing_campaign
manual_entry
referral
```

Allow settings-driven expansion later.

---

## 5. Firestore Data Model

### 5.1 `users/{uid}`

```ts
interface UserDocument {
  uid: string;
  displayName: string;
  email: string;
  role: "rep" | "manager" | "admin";
  officeIds: string[];
  defaultOfficeId: string | null;
  status: "active" | "inactive";
  phone?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp | null;
}
```

Firebase Authentication owns identity credentials. Firestore stores application profile/authorisation data.

### 5.2 `leads/{leadId}`

Document ID should be the immutable application LeadID wherever practical.

```ts
interface LeadDocument {
  leadId: string;

  name: string;
  mobile: string;
  mobileNormalized: string;
  address: string;
  suburb?: string | null;

  officeId: "perth" | "brisbane";
  assignedRepId?: string | null;

  source: string;
  sourceReference?: string | null;
  status: string;

  currentNotes?: string | null;

  survey?: {
    renterOwner?: "renter" | "owner" | "other" | null;
    employmentStatus?: string | null;
    superannuation?: string | null;
    costOfLivingResponse?: boolean | null;
    taxResponse?: boolean | null;
  } | null;

  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;

  lastContactAt?: Timestamp | null;
  nextFollowUpAt?: Timestamp | null;

  activeCallLease?: {
    claimedBy: string;
    claimedAt: Timestamp;
    expiresAt: Timestamp;
  } | null;

  archivedAt?: Timestamp | null;

  sheetSync?: {
    status: "pending" | "synced" | "failed" | "not_required";
    lastSyncedAt?: Timestamp | null;
    lastErrorCode?: string | null;
    revision?: number;
  };
}
```

### 5.3 `leads/{leadId}/activities/{activityId}`

Activities form the immutable human-readable lead timeline.

```ts
interface LeadActivityDocument {
  activityId: string;
  leadId: string;
  type:
    | "lead_created"
    | "lead_imported"
    | "lead_assigned"
    | "lead_reassigned"
    | "call_attempted"
    | "call_completed"
    | "status_changed"
    | "note_added"
    | "follow_up_scheduled"
    | "follow_up_completed"
    | "appointment_booked"
    | "sheet_sync_failed"
    | "sheet_sync_recovered";
  description: string;
  createdAt: Timestamp;
  createdBy: string;
  metadata?: Record<string, unknown>;
}
```

Activities should generally be append-only.

### 5.4 `followUps/{followUpId}`

```ts
interface FollowUpDocument {
  followUpId: string;
  leadId: string;
  officeId: string;
  assignedRepId: string;
  scheduledAt: Timestamp;
  status: "pending" | "completed" | "cancelled";
  reason?: string | null;
  lastCallResult?: string | null;
  lastNote?: string | null;
  createdAt: Timestamp;
  createdBy: string;
  completedAt?: Timestamp | null;
  completedBy?: string | null;
}
```

`overdue` should normally be derived from `scheduledAt < now && status == pending`, not stored as permanent state.

### 5.5 `surveySessions/{sessionId}`

```ts
interface SurveySessionDocument {
  sessionId: string;
  officeId: string;
  repId: string;
  status: "in_progress" | "completed" | "submitted" | "abandoned";
  respondentCount: number;
  leadsCaptured: number;
  startedAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp | null;
  submittedAt?: Timestamp | null;
}
```

### 5.6 `surveySessions/{sessionId}/responses/{responseId}`

```ts
interface SurveyResponseDocument {
  responseId: string;
  sessionId: string;
  sequenceNumber: number;

  costOfLiving: boolean | null;
  tooMuchTax: boolean | null;
  housing: "renter" | "owner" | "other" | null;
  employment: string | null;
  superannuation: string | null;

  becameLead: boolean;
  leadId?: string | null;

  leadCapture?: {
    name?: string;
    mobile?: string;
    mobileNormalized?: string;
    address?: string;
    notes?: string;
  } | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 5.7 `imports/{importId}`

```ts
interface ImportDocument {
  importId: string;
  filename: string;
  fileType: "csv" | "xlsx";
  officeId: string;
  requestedBy: string;
  assignmentMode: "single_rep" | "round_robin";
  assignmentRepIds: string[];
  source: string;

  status: "uploaded" | "validating" | "ready" | "processing" | "completed" | "failed";

  counts: {
    total: number;
    valid: number;
    duplicate: number;
    invalid: number;
    imported: number;
  };

  mapping: Record<string, string>;

  createdAt: Timestamp;
  completedAt?: Timestamp | null;
  errorSummary?: string | null;
}
```

### 5.8 `auditEvents/{eventId}`

Security/administrative audit log for actions broader than a single lead.

Examples:

- user role changed;
- user deactivated;
- office changed;
- bulk assignment;
- import executed;
- settings changed;
- manual sync replay;
- export performed.

### 5.9 `sheetSyncJobs/{jobId}`

```ts
interface SheetSyncJobDocument {
  jobId: string;
  leadId: string;
  officeId: string;
  operation: "upsert";
  revision: number;
  status: "pending" | "processing" | "completed" | "failed";
  attemptCount: number;
  nextAttemptAt?: Timestamp | null;
  lastError?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp | null;
}
```

Jobs must be idempotent by `(leadId, revision)` or an equivalent idempotency key.

### 5.10 Configuration collections

```text
offices/{officeId}
teams/{teamId}
settings/global
```

Avoid putting frequently changing operational data in one oversized settings document.

---

## 6. Lead ID Strategy

Every lead must have a permanent unique identifier.

Rules:

1. Never use Google Sheet row number as identity.
2. Never use mobile number as the primary identifier.
3. Normalised mobile may be used for duplicate detection.
4. LeadID must remain stable through reassignment, status changes and spreadsheet movement.
5. The same LeadID must be written into the existing Google Sheet `LeadID` column.

Recommended implementation:

- Firestore document ID generated first;
- human-friendly prefix is optional;
- if a display code is required, store an additional `displayLeadId` rather than replacing the immutable document identity.

---

## 7. Australian Mobile Normalisation

Store both:

```text
mobile        = user-friendly value
mobileNormalized = E.164 canonical value where valid
```

Examples:

```text
0412 345 678 → +61412345678
+61 412 345 678 → +61412345678
```

Duplicate checks should use `mobileNormalized` where available.

Do not automatically merge records solely because a phone number matches. Present duplicates for review or apply an explicitly documented import rule.

---

## 8. Authentication and Authorisation

### 8.1 Firebase Authentication

MVP:

- email/password sign-in;
- password reset;
- logout;
- persistent session;
- disabled users blocked from application access.

### 8.2 Authorisation source

Use Firebase custom claims for coarse trusted role data where useful, backed by Firestore user profile data.

Example claims:

```json
{
  "role": "manager",
  "officeIds": ["perth"]
}
```

Claims are not the sole source of business profile data, but are appropriate for server/rules enforcement.

### 8.3 Security principle

Hiding a button is not authorisation.

Access restrictions must be enforced by:

- Firestore Security Rules;
- trusted server APIs/Admin SDK for privileged mutations;
- server-side validation of role and office scope.

### 8.4 Office boundaries

Rep:

- read assigned leads only unless explicitly permitted otherwise;
- update only permitted fields on assigned leads;
- access own follow-ups and survey sessions.

Manager:

- access authorised office(s);
- no automatic cross-office access.

Admin:

- organisation-wide access.

---

## 9. Google Sheets Integration

### 9.1 Existing workbooks

**Perth**

`ASG - Live Leads 2026 - PERTH`

**Brisbane**

`ASG - Live Leads 2026 (BRISBANE)`

Primary destination tab in each workbook:

`LEADS`

### 9.2 Existing core columns

The integration should map the current `LEADS` structure:

| Column | Meaning |
|---|---|
| A | Date |
| B | Lead Name |
| C | Address |
| D | Contact Number |
| E | Notes |
| F | Update Lead |
| G | Renter/Owner |
| H | Superannuation |
| I | Rep Name |
| J | Lead Status |
| K | Call Timestamp |
| L | Call Result |
| M | LeadID |

The integration layer must centralise this mapping. Do not scatter hard-coded column indexes throughout route handlers/components.

### 9.3 Office routing

```text
officeId = perth
→ ASG - Live Leads 2026 - PERTH
→ LEADS

officeId = brisbane
→ ASG - Live Leads 2026 (BRISBANE)
→ LEADS
```

### 9.4 Firestore-first write flow

For all normal application changes:

```text
UI action
→ validate permission/input
→ Firestore transaction/batch
→ create activity/audit event
→ enqueue sheetSyncJob
→ return success to user
→ asynchronous/retriable sheet sync
```

A temporary Google Sheets outage must not prevent a rep from completing a call or updating a lead.

### 9.5 Spreadsheet upsert logic

1. Resolve destination by `officeId`.
2. Search the `LeadID` column for exact LeadID.
3. If found, update the mapped fields in that row.
4. If not found, append a new row.
5. Persist sync result and timestamp.
6. Never use previously remembered row numbers as durable identity.

### 9.6 Notes mapping

For survey-generated leads, the sheet may continue to receive a concise compatibility notes string, for example:

```text
FT/PT: Full Time | Cost of Living: Yes | Too Much Tax?: Yes
```

The full structured values remain stored in Firestore.

### 9.7 Sync retries

Use bounded exponential backoff and a visible failed-sync state for managers/admins.

Do not silently discard failed syncs.

### 9.8 Secrets

Google credentials must exist only in secure server environment variables/secret storage.

Never expose them through:

- `NEXT_PUBLIC_*` variables;
- client bundles;
- browser network payloads;
- committed `.env` files.

---

## 10. Call Queue Architecture

### 10.1 Queue eligibility

Default rep queue should include assigned, active leads in callable statuses such as:

```text
new
no_answer
callback
contacted
revisit
```

Exact rules should live in a shared domain function, not in a page component.

### 10.2 Ordering

Recommended initial priority:

1. overdue callbacks;
2. callbacks due now/today;
3. new leads;
4. no-answer retries;
5. revisit/contacted leads requiring action;
6. oldest actionable lead first within equal priority.

Make this deterministic and testable.

### 10.3 Call lease

To reduce simultaneous work on the same lead, use a temporary lease:

```ts
activeCallLease: {
  claimedBy: uid,
  claimedAt: Timestamp,
  expiresAt: Timestamp
}
```

Recommended initial lease duration: 15 minutes.

Claim via Firestore transaction:

- allow if no active lease;
- allow if lease expired;
- allow if already claimed by the same user;
- otherwise skip/deny the lead.

The lease must expire automatically by timestamp logic. Never require manual release to make the lead usable again.

### 10.4 Save & Next transaction

A call result should atomically or near-atomically accomplish the required set:

- update lead status;
- update `lastContactAt`;
- update notes where supplied;
- create call activity;
- create/update follow-up where applicable;
- record appointment activity where applicable;
- clear/release call lease;
- enqueue spreadsheet sync.

If some of these are implemented through server orchestration rather than one Firestore batch because of collection boundaries/limits, the operation must still be idempotent and recoverable.

---

## 11. Follow-Up Rules

A callback requires:

- lead;
- assigned rep;
- scheduled timestamp;
- pending state;
- linkage to originating call/result where appropriate.

Rules:

- one completed call may create one new follow-up;
- rescheduling should cancel/update the previous outstanding follow-up rather than create uncontrolled duplicates;
- completing a follow-up records who completed it and when;
- overdue is derived at query/render time;
- manager views can filter by rep and office.

---

## 12. Survey Architecture

### 12.1 Session model

A survey session groups a field rep's respondents.

Initial UI targets up to 10 respondents per session, but the backend should not hard-code exactly 10 as an irreversible schema constraint.

### 12.2 Autosave

Each completed/changed response should autosave.

UI states:

```text
Saving…
Saved
Offline / pending sync
```

Do not force repeated manual save actions during field use.

### 12.3 Anonymous respondent vs lead

Every respondent is a survey response.

Only respondents who provide details/qualify for lead capture create a `lead`.

Flow:

```text
Survey Response
      │
      ├─ becameLead = false → survey analytics only
      │
      └─ becameLead = true
               ↓
          create Lead
               ↓
      response.leadId = new LeadID
               ↓
       queue sheet sync
```

This prevents anonymous survey data from polluting the live lead calling list.

### 12.4 Survey analytics

Compute/report from structured response fields, not from parsed note strings.

Initial metrics:

- cost of living response;
- tax response;
- renter/owner;
- employment;
- superannuation range/knowledge;
- lead conversion rate;
- responses by rep;
- responses by office;
- responses by time period.

---

## 13. Lead Import Architecture

### 13.1 Accepted MVP formats

- CSV
- XLSX

### 13.2 Import stages

```text
1. Upload
2. Parse
3. Column mapping
4. Normalisation
5. Validation
6. Duplicate detection
7. Assignment configuration
8. Preview
9. Commit
10. Audit/report
```

### 13.3 No partial mystery imports

Before committing, show:

- total records;
- valid rows;
- invalid rows;
- duplicate candidates;
- missing required fields;
- chosen office;
- chosen lead source;
- assignment strategy.

### 13.4 Round-robin assignment

For selected rep IDs:

```text
Rep A → Rep B → Rep C → Rep A → ...
```

Rules:

- include active reps only;
- all selected reps must have access to destination office;
- assignment order must be deterministic within one import;
- audit the final distribution.

### 13.5 Duplicate detection

Initial duplicate indicators:

1. exact LeadID match;
2. exact normalised mobile match;
3. optionally name + address match as a review signal.

Do not automatically merge ambiguous records.

---

## 14. Reporting and Metrics

Do not hard-code demonstration statistics after Firestore integration.

Initial operational metrics:

### Rep

- assigned callable leads;
- new leads;
- follow-ups due;
- calls completed today;
- contacts;
- qualified leads;
- appointments booked.

### Manager

- total active leads;
- calls today;
- contact rate;
- qualification rate;
- booking rate;
- overdue follow-ups;
- rep performance;
- source performance.

### Admin

- Perth vs Brisbane;
- organisation totals;
- cross-office conversion;
- import/sync health;
- user activity.

Definitions for metrics must be documented centrally. For example, `contact rate` must have one consistent numerator/denominator throughout the app.

---

## 15. Server/API Boundaries

Use trusted server routes/actions for operations that:

- require Firebase Admin privileges;
- involve Google Sheets;
- manage users/custom claims;
- perform bulk imports;
- change role/office authorisation;
- execute bulk lead assignment;
- create sensitive exports;
- replay failed sync jobs.

Client-direct Firestore operations may be used for low-risk, tightly ruled interactions where security rules are clear and testable.

Do not make all mutations client-direct merely because Firestore supports it.

---

## 16. Validation

Use shared validation schemas at all trusted boundaries.

Recommended library: Zod, unless an existing project standard supersedes it.

Validate at minimum:

- lead create/update payloads;
- mobile numbers;
- office IDs;
- rep IDs and office membership;
- lead statuses;
- call results;
- callback timestamps;
- survey response values;
- import mappings;
- bulk actions.

Never trust UI dropdown constraints as sufficient validation.

---

## 17. Firestore Indexes

Expected compound indexes will include combinations such as:

```text
leads: officeId + status + createdAt
leads: officeId + assignedRepId + status + createdAt
leads: assignedRepId + nextFollowUpAt
leads: officeId + mobileNormalized
followUps: officeId + status + scheduledAt
followUps: assignedRepId + status + scheduledAt
surveySessions: officeId + startedAt
surveySessions: repId + startedAt
imports: officeId + createdAt
```

Do not add indexes blindly. Run emulator/query tests and commit `firestore.indexes.json` as the authoritative index definition.

---

## 18. Firestore Security Rules

Rules must be version-controlled and covered by emulator tests.

Minimum test scenarios:

### Rep

- can read own profile;
- cannot change own role;
- can read assigned lead;
- cannot read another rep's restricted lead unless policy explicitly permits it;
- cannot move a lead into another office;
- cannot assign themselves arbitrary leads if not permitted;
- can add permitted activity/follow-up entries;
- cannot modify audit events.

### Manager

- can access leads in authorised office;
- cannot access unauthorised office;
- can assign to reps in authorised office;
- cannot elevate users to admin.

### Admin

- can operate across authorised organisation scope.

### Anonymous

- no operational data access.

---

## 19. Auditability

The system must make important changes explainable after the fact.

Audit fields/events should answer:

- who changed it;
- what changed;
- when;
- which office;
- which lead/import/user was affected;
- whether the action originated from survey, import, call workspace, admin or sync.

Do not store passwords, secrets or excessive sensitive payloads in audit logs.

---

## 20. Error Handling and Resilience

### Firestore/network issue

- show actionable user feedback;
- preserve unsent field survey state locally where practical;
- never show `Saved` until persistence is confirmed.

### Google Sheets issue

- Firestore operation remains successful;
- sync marked pending/failed;
- automatic retry;
- manager/admin visibility;
- manual retry capability later.

### Import issue

- import has explicit failed state;
- no silent partial commit;
- imported rows have import ID provenance;
- commit process must be idempotent or checkpointed.

### Call workflow issue

- prevent duplicate Save & Next submissions;
- disable action while request is in flight;
- use operation/idempotency identifiers where retries are possible.

---

## 21. PWA / Field Operation

MVP should be PWA-ready even if full offline mutation support is deferred.

Priorities:

- mobile home-screen installation compatibility;
- fast initial load;
- touch-friendly call/survey screens;
- `tel:` links;
- viewport-safe mobile UI;
- autosaved survey progress;
- clear connection/sync state.

Full offline calling/lead mutation is **not** required for initial MVP unless explicitly added later.

---

## 22. Environment Configuration

Expected public/client variables:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

Expected server-only variables depend on chosen Firebase Admin deployment strategy and Google service credentials.

Examples:

```text
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
GOOGLE_SHEETS_CLIENT_EMAIL
GOOGLE_SHEETS_PRIVATE_KEY
PERTH_SPREADSHEET_ID
BRISBANE_SPREADSHEET_ID
```

Where possible, avoid duplicating service-account credentials if one appropriately scoped account can securely support both Firebase Admin and Sheets requirements.

Never commit real values.

Provide `.env.example` with names and explanatory comments only.

---

## 23. Health Endpoint

`/api/health` should become a safe production health response.

It may report non-secret status such as:

```json
{
  "ok": true,
  "service": "asg-leads",
  "version": "<build version>",
  "environment": "production"
}
```

Do not expose credentials, raw environment variables or unnecessary infrastructure detail.

Optional deeper dependency health must be protected or designed so it does not leak sensitive configuration.

---

## 24. Testing Strategy

### 24.1 Unit tests

Test pure domain behaviour:

- lead status/result mapping;
- queue eligibility/order;
- Australian mobile normalisation;
- duplicate detection;
- round-robin assignment;
- sheet row mapping;
- survey → lead transformation;
- metric calculations.

### 24.2 Firebase Emulator integration tests

Test:

- auth boundaries;
- security rules;
- lead CRUD permissions;
- manager office boundaries;
- survey submission;
- follow-up creation/completion;
- call lease concurrency;
- batch/transaction behaviour.

### 24.3 Google Sheets adapter tests

Use a mock/fake adapter for normal automated tests.

Test:

- LeadID lookup;
- append when absent;
- update when present;
- office routing;
- mapping correctness;
- idempotent retries;
- API failures;
- duplicate LeadID anomaly handling.

Any live spreadsheet test must use an explicitly approved test workbook/range, never production sheets by default.

### 24.4 UI tests

Use Playwright for critical paths:

1. sign in;
2. rep dashboard;
3. lead list/detail;
4. start call;
5. select result + note;
6. callback scheduling;
7. Save & Next;
8. survey completion;
9. survey lead capture;
10. manager import flow;
11. admin user access control.

### 24.5 Required verification before production

```text
npm run lint
npm run typecheck
npm run build
unit tests
Firebase rule/emulator tests
critical Playwright tests
```

---

## 25. Observability

At minimum log server-side failures for:

- authentication/admin operations;
- Sheets sync;
- import processing;
- bulk assignment;
- user management;
- unexpected server errors.

Logs must include correlation IDs where useful, but must not include passwords, private keys or unnecessary sensitive lead data.

Future optional additions:

- Sentry or equivalent error monitoring;
- structured Vercel logs;
- admin sync-health dashboard.

---

## 26. Implementation Phases

### Phase 0 — Baseline audit and safety checkpoint

Goal: establish an exact known-good baseline before backend changes.

Tasks:

- inspect full repository;
- run lint/typecheck/build;
- document current routes and user flows;
- identify all mock dependencies;
- capture existing UI behaviour;
- add tests around critical existing interaction logic where practical;
- create a git checkpoint/branch;
- do not redesign UI.

Exit criteria:

- current app builds cleanly or all pre-existing failures are documented;
- prototype behaviour is understood;
- working tree is clean.

### Phase 1 — Firebase foundation

Tasks:

- remove unused PostgreSQL/Drizzle scaffold;
- install/configure Firebase client SDK;
- configure Firebase Admin SDK;
- add environment validation;
- add emulator configuration;
- create canonical domain types;
- create Firestore converters/repositories;
- add baseline rules and indexes;
- add emulator test harness.

Exit criteria:

- application builds without `DATABASE_URL`;
- Firebase configuration is isolated and testable;
- no production secrets committed.

### Phase 2 — Authentication and users

Tasks:

- Firebase Auth login;
- logout;
- password reset;
- protected application routes;
- user profile loading;
- active/inactive access;
- roles and office scope;
- Admin user provisioning/update path;
- custom claims where required;
- auth boundary tests.

Exit criteria:

- fake login removed;
- unauthenticated users cannot access application data;
- role/office restrictions tested.

### Phase 3 — Leads and activity timeline

Tasks:

- move lead list/detail to Firestore;
- create lead;
- update lead;
- assignments;
- structured activity timeline;
- filters/search/pagination strategy;
- manager office access;
- remove lead mock dependency from production paths.

Exit criteria:

- leads persist across reload/session;
- activity history is durable;
- role restrictions work.

### Phase 4 — Calling and follow-ups

Tasks:

- shared queue rules;
- deterministic ordering;
- call lease transaction;
- `tel:` call action;
- call results;
- notes;
- Save & Next;
- callback scheduling;
- appointment activity;
- follow-up completion/rescheduling;
- concurrency/idempotency tests.

Exit criteria:

- two users cannot unintentionally work the same actively leased lead;
- call outcome persists correctly;
- follow-up queues reflect saved callbacks.

### Phase 5 — Survey productionisation

Tasks:

- persisted sessions/responses;
- autosave;
- resume in-progress session;
- respondent → lead conversion;
- survey history;
- analytics from structured data;
- mobile field QA.

Exit criteria:

- browser refresh does not destroy active survey;
- anonymous respondents do not create leads;
- converted respondents create valid leads with source linkage.

### Phase 6 — Import engine

Tasks:

- CSV/XLSX parsing;
- field mapping;
- normalisation;
- duplicate detection;
- preview;
- validation;
- assignment/round robin;
- import audit;
- safe bulk commit.

Exit criteria:

- malformed data cannot silently enter production;
- duplicate candidates are surfaced;
- imported leads have provenance.

### Phase 7 — Google Sheets sync

Tasks:

- server-side Sheets adapter;
- exact Perth/Brisbane routing;
- central column mapping;
- LeadID upsert;
- sync job queue/state;
- retries;
- failure visibility;
- sync integration tests;
- controlled production verification.

Exit criteria:

- Firestore remains authoritative;
- app updates mirror correctly to appropriate workbook;
- Sheets outage does not block lead operations.

### Phase 8 — Reporting and admin completion

Tasks:

- replace demo metrics;
- rep performance;
- office comparison;
- admin users/teams/offices/settings;
- sync/import health;
- exports where required.

Exit criteria:

- no material dashboard metric remains hard-coded.

### Phase 9 — Production hardening and Vercel launch

Tasks:

- full test suite;
- security-rule review;
- environment separation;
- Firebase production project review;
- Vercel production variables;
- logging/monitoring;
- mobile/tablet/desktop QA;
- rollback plan;
- production deployment;
- controlled staff pilot.

---

## 27. Non-Goals for MVP

Unless separately approved, do not expand MVP into:

- full Salesforce replacement;
- browser VoIP/telephony provider integration;
- SMS/email marketing automation;
- complex marketing attribution platform;
- AI lead scoring;
- full offline CRM mutation sync;
- customer-facing portal;
- native iOS/Android apps;
- accounting/property transaction management.

MVP success is a fast, reliable internal workflow:

**Capture → Assign → Call → Update → Follow Up → Book → Report**

---

## 28. Coding Constraints

Implementation agents must:

1. Preserve existing behaviour unless the phase explicitly changes it.
2. Keep diffs focused and reviewable.
3. Avoid broad component rewrites solely for style preference.
4. Put business logic in domain/service modules, not page components.
5. Use stable IDs, never names, as relationship keys.
6. Use server timestamps for authoritative event times.
7. Avoid storing derived values when they can safely be computed.
8. Prefer transactions/batches for related writes.
9. Make retryable operations idempotent.
10. Never expose server credentials to the client.
11. Add tests with every production behaviour change.
12. Update this architecture document if an approved implementation decision changes the source of truth.

---

## 29. Suggested Project Structure

The exact structure can evolve, but a target separation should resemble:

```text
src/
  app/
    ...existing route structure...
    api/
      health/
      admin/
      imports/
      sync/

  components/
    ...existing Astra components...

  domain/
    leads/
      types.ts
      queue.ts
      statuses.ts
      validation.ts
    surveys/
    follow-ups/
    imports/

  lib/
    firebase/
      client.ts
      admin.ts
    auth/
    validation/
    phone/

  repositories/
    leads.ts
    users.ts
    follow-ups.ts
    surveys.ts
    imports.ts

  services/
    lead-service.ts
    call-service.ts
    survey-service.ts
    import-service.ts
    sheets-sync-service.ts

  integrations/
    google-sheets/
      client.ts
      mapping.ts
      adapter.ts

  test/
```

Do not mechanically reorganise the entire prototype in one commit. Move code toward this separation incrementally as phases require it.

---

## 30. Definition of Done

ASG Leads V1 is ready for controlled staff use when:

- Firebase Authentication is real and role-scoped;
- leads are durable in Firestore;
- reps can view and work assigned leads;
- call outcomes and notes persist;
- callbacks/follow-ups are reliable;
- surveys autosave and create leads correctly;
- imports validate and de-duplicate safely;
- Perth and Brisbane Google Sheets sync by LeadID;
- spreadsheet failures do not block operational work;
- managers can assign leads and view office performance;
- admins can manage users/access;
- audit/activity history is available;
- security rules are emulator-tested;
- core Playwright workflows pass;
- lint, typecheck and production build pass;
- Vercel production deployment is verified on desktop and mobile.

---

## 31. First Implementation Instruction

Do **not** begin by wiring Google Sheets or rewriting screens.

The first implementation milestone is **Phase 0 + Phase 1**:

1. verify the supplied Astra baseline;
2. protect the current visual design;
3. remove the unused PostgreSQL requirement;
4. establish a tested Firebase foundation;
5. leave mock application flows working until each domain is deliberately migrated.

This staged migration reduces the risk of replacing a functional prototype with a partially connected application that cannot be tested end-to-end.
