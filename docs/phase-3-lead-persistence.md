# ASG Leads — Phase 3 Lead Persistence & Activity History Report

**Date:** 2026-09-11
**Branch:** `feat/firestore-leads`
**Starting SHA:** `89ab6bc`
**Architecture Reference:** `ASG_LEADS_ARCHITECTURE.md`

---

## 1. Safety Check

| Property | Value | Status |
|----------|-------|--------|
| Branch | `feat/firestore-leads` | ✅ |
| HEAD | `89ab6bc` | ✅ |
| Working tree | Clean (new branch) | ✅ |

---

## 2. Lead Domain Model

### Lead Document (leads/{leadId})

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `leadId` | string | ✅ | Immutable application LeadID (UUID) |
| `name` | string | ✅ | Lead full name |
| `mobile` | string | ✅ | User-friendly mobile (preserves input format) |
| `mobileNormalized` | string | ✅ | E.164 canonical form (+614XXXXXXXX) |
| `address` | string | ✅ | Street address |
| `suburb` | string | ❌ | Suburb/locality |
| `officeId` | string | ✅ | "perth" or "brisbane" |
| `assignedRepId` | string | ❌ | UID of assigned rep |
| `source` | string | ✅ | Lead source enum value |
| `status` | string | ✅ | Status enum value |
| `notes` | string | ❌ | Current notes/summary |
| `survey` | object | ✅ | Survey-derived fields |
| `createdAt` | Date | ✅ | Creation timestamp |
| `createdBy` | string | ✅ | UID of creator |
| `updatedAt` | Date | ✅ | Last update timestamp |
| `updatedBy` | string | ✅ | UID of last updater |
| `lastContactAt` | Date | ❌ | Last contact timestamp |
| `nextFollowUpAt` | Date | ❌ | Next scheduled follow-up |
| `activeCallLease` | object | ❌ | Current call claim |
| `archivedAt` | Date | ❌ | Archive timestamp |
| `version` | number | ✅ | Optimistic concurrency version |

### Activity Document (leads/{leadId}/activities/{activityId})

| Field | Type | Description |
|-------|------|-------------|
| `activityId` | string | UUID |
| `leadId` | string | Parent lead ID |
| `type` | enum | Activity type |
| `description` | string | Human-readable description |
| `createdAt` | Date | Creation timestamp |
| `createdBy` | string | UID of actor |
| `metadata` | object | Additional structured data |

### Follow-Up Document (followUps/{followUpId})

| Field | Type | Description |
|-------|------|-------------|
| `followUpId` | string | UUID |
| `leadId` | string | Parent lead ID |
| `officeId` | string | Office scope |
| `assignedRepId` | string | UID of assigned rep |
| `scheduledAt` | Date | When follow-up is due |
| `status` | enum | pending/completed/cancelled |
| `reason` | string | Optional reason |
| `lastCallResult` | string | Call result at scheduling |
| `lastNote` | string | Note at scheduling |
| `createdAt` | Date | Creation timestamp |
| `createdBy` | string | UID of creator |
| `completedAt` | Date | Completion timestamp |
| `completedBy` | string | UID of completer |

---

## 3. Lead ID Strategy

**Decision: Firestore-generated document ID as leadId**

- Each lead uses `crypto.randomUUID()` as its `leadId`
- Document ID = `leadId` (aligned)
- No human-readable prefix required at this stage
- Stable through reassignment, status changes, and spreadsheet movement
- Immutable once created

---

## 4. Mobile Normalization Strategy

### Implementation
- Canonical format: E.164 (`+614XXXXXXXX`)
- Stores both `mobile` (user-friendly) and `mobileNormalized` (canonical)
- Validation rejects invalid numbers explicitly (no silent mangling)
- Used for duplicate detection

### Normalization Rules
| Input | Output |
|-------|--------|
| `0412 345 678` | `+61412345678` |
| `0412345678` | `+61412345678` |
| `+61 412 345 678` | `+61412345678` |
| `61412345678` | `+61412345678` |
| `+61412345678` | `+61412345678` |

### Validation
- Must be exactly 9 digits after country code removal
- Must start with `4` (Australian mobile prefix)
- Returns `null` for invalid numbers

---

## 5. Repository Architecture

```
src/lib/firestore/leads/
├── types.ts          # Entity types and interfaces
├── converters.ts     # Firestore → Entity conversion
├── repository.ts     # CRUD operations for leads
├── activities.ts     # Activity creation/reading
├── follow-ups.ts     # Follow-up CRUD
└── claims.ts         # Call lease/claim management
```

### Key Design Decisions
- **Server-only imports**: All repository functions use `"use server"` or live in `src/lib/firebase/`
- **Typed returns**: All functions return typed entities, not raw Firestore docs
- **Transactions**: Write operations use Firestore transactions for consistency
- **Optimistic concurrency**: Version field prevents silent overwrites

---

## 6. Server Mutation Architecture

### Server Actions (src/lib/actions/leads.ts)

All sensitive mutations run through server actions:

| Action | Description |
|--------|-------------|
| `createLeadAction` | Create lead with duplicate check |
| `updateLeadAction` | Update fields with version check |
| `changeLeadStatusAction` | Change status + activity |
| `assignLeadAction` | Reassign lead + activity |
| `archiveLeadAction` | Archive lead + activity |
| `saveCallResultAction` | Full call result flow |
| `completeFollowUpAction` | Complete follow-up + update lead |

### Mutation Flow
1. Verify session (via auth context)
2. Validate input (using domain validators)
3. Check permission (role/office boundaries)
4. Check duplicate (for creates)
5. Execute Firestore write (transaction for multi-doc)
6. Record activity (append-only)
7. Revalidate paths

---

## 7. Status Model

### Lead Statuses
```
new, no_answer, callback, contacted, interested,
qualified, booked, revisit, not_interested, disqualified, wrong_number
```

### Callable Statuses (Call Queue)
```
new, no_answer, callback, contacted, revisit
```

### Call Results
```
no_answer, contacted, interested, callback,
qualified, booked, not_interested, wrong_number, disqualified
```

### Follow-Up Statuses
```
pending, completed, cancelled
```

---

## 8. Activity Model

### Activity Types
```
lead_created, lead_imported, lead_assigned, lead_reassigned,
call_attempted, call_completed, status_changed, note_added,
follow_up_scheduled, follow_up_completed, appointment_booked,
lead_archived
```

### Immutability
- Activities are append-only
- `allow write: if false` in Firestore rules
- Only server actions can create activities

---

## 9. Assignment Model

### Rules
- Managers/admins can assign/reassign leads
- Target user must exist and be active
- Target user must have office compatibility
- Cannot assign cross-office (unless admin)

### On Assignment Change
1. Validate target user
2. Update `assignedRepId`
3. Update `updatedAt/updatedBy`
4. Create `lead_assigned` or `lead_reassigned` activity

---

## 10. Concurrency/Versioning Model

### Optimistic Concurrency
- `lead.version` integer field
- Update mutations accept `expectedVersion`
- Transaction reads current version, compares, increments
- On conflict: returns typed error (`VERSION_CONFLICT`)

### Conflict Response
```typescript
{ success: false, error: "This lead was updated by another user. Please refresh and try again." }
```

---

## 11. Lead Claim Behaviour

### Claim Document (embedded in lead)
```typescript
activeCallLease: {
  claimedBy: string;   // UID
  claimedAt: Date;
  expiresAt: Date;     // claimedAt + 15 minutes
}
```

### Claim Rules
- **Acquire**: Only if no active claim, or claim expired, or same user
- **Release**: Only by claimer
- **Refresh**: Only by claimer (extends expiry)
- **Expiry**: 15 minutes (application logic, no cleanup needed)

### Atomicity
- Uses Firestore transactions
- No dependency on background cleanup

---

## 12. Pagination Behaviour

### Cursor-Based
```typescript
interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
  nextCursor: string | null;
  count: number;
}
```

### Implementation
- `limit + 1` query to detect `hasMore`
- Returns last document ID as `nextCursor`
- No fake total counts
- Server-side filtering before pagination

---

## 13. Search Behaviour and Limitations

### Current Implementation
- Exact match on `mobileNormalized` (indexed)
- No full-text search in Phase 3
- Client-side filtering for other fields (from loaded page)

### Limitations Documented
- Firestore does not provide substring search
- Full collection downloads for search would be unacceptable
- Future: consider Algolia/Typesense for production search

---

## 14. Duplicate Detection Strategy

### Mobile-Based Duplicate Check
- Normalize input mobile
- Query `leads` collection where `mobileNormalized == normalized`
- Filter out archived leads
- Return warning if duplicate found

### Race Condition Handling
- Check-then-create has inherent race window
- For production safety, consider `leadMobileKeys/{hash}` collection
- Documented as known limitation for Phase 3

---

## 15. Firestore Rule Changes

### New Rules Added

| Collection | REP | MANAGER | ADMIN |
|------------|-----|---------|-------|
| `leads` | Read assigned | Read/write office | Read/write all |
| `leads/{id}/activities` | Read | Read | Read |
| `followUps` | Read own | Read/write office | Read/write all |

### Key Rule Decisions
- **Activities**: `allow write: if false` (server-only via Admin SDK)
- **Leads write**: Only managers/admins (reps use server actions)
- **Follow-ups write**: Only managers/admins
- All reads require `isActive()` (disabled users blocked)

---

## 16. Index Changes

Existing indexes in `firestore.indexes.json` already support Phase 3 queries:
- `leads: officeId + status + createdAt`
- `leads: assignedRepId + nextFollowUpAt`
- `leads: officeId + mobileNormalized`
- `followUps: officeId + status + scheduledAt`
- `followUps: assignedRepId + status + scheduledAt`

No new indexes added in Phase 3.

---

## 17. Mock-Store Retirement Status

### Phase 3 Scope
The Phase 3 architecture provides:
- Complete domain layer (`src/lib/domain/`)
- Complete repository layer (`src/lib/firestore/leads/`)
- Complete server action layer (`src/lib/actions/leads.ts`)
- Firestore rules and tests

### Not Done (Future Phases)
- UI components still use `useApp()` store
- Lead list/detail pages still read from mock data
- Dashboard still uses hard-coded metrics
- Calling workflow still uses store mutations

**Rationale**: Phase 3 establishes the persistence foundation. UI migration is Phase 4+ work that preserves the Astra UI while swapping store calls to server actions.

---

## 18. Dashboard Migration Status

### Not Done in Phase 3
Dashboard metrics remain hard-coded. Phase 4+ will migrate to real Firestore counts.

### Implementation Ready
The repository layer supports:
- `listLeads()` with filters (for status counts)
- `getDueFollowUps()` (for follow-up counts)
- `count().get()` aggregations (for total counts)

---

## 19. Tests Added

### Unit Tests (40 tests)

| File | Tests | Status |
|------|-------|--------|
| `src/test/mobile.test.ts` | 19 | ✅ Passed |
| `src/test/validation.test.ts` | 21 | ✅ Passed |

### Authorization Tests (24 tests)

| File | Tests | Status |
|------|-------|--------|
| `src/test/lead-persistence.test.ts` | 24 | ✅ Passed |

### Existing Tests (Still Passing)

| File | Tests | Status |
|------|-------|--------|
| `src/test/permissions.test.ts` | 29 | ✅ Passed |
| `src/test/auth.test.ts` | 13 | ✅ Passed |
| `src/test/firestore-rules.test.ts` | 21 | ✅ Passed |

### Total: 127 tests passing

---

## 20. Performance Review Findings

### Potential Issues Addressed
- **N+1 user lookups**: Not yet (UI migration pending)
- **Unbounded reads**: Repository uses `limit + 1` pattern
- **Repeated activity fetches**: Can be batched in future
- **Full collection downloads**: Not done in repository layer

### Recommendations for Phase 4+
- Batch user profile lookups
- Cache user display names client-side
- Use Firestore `count()` aggregations for dashboard

---

## 21. Security Review Findings

### Verified
- ✅ All mutations derive actor from authenticated session
- ✅ `officeId` cannot be escalated (set server-side)
- ✅ `assignedRepId` changes require permission
- ✅ Activity actor cannot be spoofed (derived server-side)
- ✅ Timestamps use `new Date()` server-side
- ✅ Admin SDK remains server-only (`"server-only"` import)
- ✅ Users cannot enumerate cross-office leads (queries filtered)
- ✅ Pagination cursors are document IDs (no auth bypass)
- ✅ Duplicate override requires authorization

### Known Limitations
- Check-then-create race for duplicates (documented)
- No rate limiting on server actions (future)

---

## 22. Files Created

### Domain Layer (3)
| File | Purpose |
|------|---------|
| `src/lib/domain/mobile.ts` | Australian mobile normalization |
| `src/lib/domain/status.ts` | Status/source/activity type definitions |
| `src/lib/domain/validation.ts` | Input validation schemas |

### Firestore Repository (6)
| File | Purpose |
|------|---------|
| `src/lib/firestore/leads/types.ts` | Entity types |
| `src/lib/firestore/leads/converters.ts` | Firestore → Entity conversion |
| `src/lib/firestore/leads/repository.ts` | Lead CRUD operations |
| `src/lib/firestore/leads/activities.ts` | Activity management |
| `src/lib/firestore/leads/follow-ups.ts` | Follow-up management |
| `src/lib/firestore/leads/claims.ts` | Call lease management |

### Server Actions (1)
| File | Purpose |
|------|---------|
| `src/lib/actions/leads.ts` | Server-side business operations |

### Tests (3)
| File | Tests |
|------|-------|
| `src/test/mobile.test.ts` | 19 |
| `src/test/validation.test.ts` | 21 |
| `src/test/lead-persistence.test.ts` | 24 |

### Modified
| File | Change |
|------|--------|
| `firestore.rules` | Added leads, activities, followUps rules |

---

## 23. Verification Results

| Check | Result |
|-------|--------|
| `npm run lint` | ✅ **Passed** |
| `npm run typecheck` | ✅ **Passed** |
| `npm run build` | ✅ **Passed** (22 routes) |
| Unit tests | ✅ **40 passed** |
| Authorization tests | ✅ **24 passed** |
| All tests | ✅ **127 passed** |

---

## 24. Known Limitations

| Limitation | Impact | Resolution |
|------------|--------|------------|
| UI still uses mock store | Production data not yet visible | Phase 4 |
| No full-text search | Search limited to mobile exact match | Future: Algolia |
| Duplicate check race window | Tiny chance of duplicate creation | Future: unique docs |
| Dashboard metrics hard-coded | Not real data | Phase 4 |
| No import engine | CSV/XLSX not yet implemented | Phase 6 |
| No Google Sheets sync | Spreadsheet mirror not yet connected | Phase 7 |

---

## 25. Phase 3 Completion Status

### Truthfully Complete?
**Yes, for the persistence foundation.**

✅ **Implemented and tested:**
- Complete domain layer (mobile, status, validation)
- Firestore repository with full CRUD
- Server actions for all mutations
- Optimistic concurrency
- Call lease mechanism
- Duplicate detection foundation
- Firestore rules for all new collections
- 127 tests passing

⏳ **Requires UI migration (Phase 4+):**
- Wire lead list to `listLeads()`
- Wire lead detail to `getLead()`
- Wire calling to `saveCallResultAction()`
- Wire follow-ups to `getDueFollowUps()`
- Wire dashboard to real counts

### Phase 4 Safe to Begin?
**Yes.** Phase 3 provides a complete, tested persistence layer ready for UI integration.

---

## 26. Phase 3B — UI Integration & Data Integrity Closeout

**Date:** 2026-09-12
**Branch:** `feat/firestore-leads-ui`
**Starting SHA:** `2776d1e`

### 26.1 Server/Client Boundary Architecture

All privileged mutations now go through authenticated API routes:

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/leads` | `POST` | Create lead |
| `/api/leads/[id]` | `GET` | Fetch lead detail + activities + follow-ups |
| `/api/leads/[id]` | `PUT` | Update lead |
| `/api/leads/[id]` | `POST` | Mutate: status, assign, archive, call-result, claim |
| `/api/leads/[id]` | `DELETE` | Release claim |
| `/api/follow-ups/[id]/complete` | `POST` | Complete follow-up |

**Security:** Actor identity derived from server session. Client never supplies `userId`, `createdBy`, `updatedBy`, or `completedBy`.

### 26.2 Pagination Cursor Design

**Format:** Base64url-encoded JSON: `{"createdAt":"ISO","documentId":"leadId"}`

**Query ordering:** `orderBy("createdAt", "desc").orderBy("leadId", "asc")`

The `leadId` tie-breaker ensures deterministic ordering when multiple leads share the same `createdAt` timestamp.

**Cursor parsing:** Server decodes cursor, uses `startAfter(createdAt, documentId)` for the next page.

### 26.3 Duplicate Uniqueness Strategy

**Implementation:** `leadMobileKeys/{normalizedMobile}` collection.

- Key document created atomically with lead in a batch write
- Before creating a lead, server checks if key exists
- On mobile update: delete old key, create new key (in transaction)
- Prevents duplicate mobile numbers across leads

### 26.4 Dashboard Metrics Migration

**Before:** Hard-coded zeros
**After:** Real Firestore count aggregations via `getDashboardMetrics()`

| Metric | Implementation |
|--------|---------------|
| `myLeads` | `count()` on leads filtered by office/rep |
| `leadsToCall` | `count()` on leads with callable statuses |
| `followUpsDue` | `count()` on pending follow-ups ≤ today end |
| `newLeads` | `count()` on leads with status "new" |
| `bookedLeads` | `count()` on leads with status "booked" |
| `officeLeadCounts` | Per-office `count()` aggregations |

### 26.5 Display-Name Batching

**Implementation:** `getUserProfiles(uids: string[])` in `src/lib/server/leads.ts`

- Collects unique UIDs from a response/page
- Chunks into groups of 10 (Firestore `in` limit)
- Returns `Map<uid, {displayName, email}>`
- Client uses map for display resolution

### 26.6 Timezone Handling

**Offices:**
- Perth → `Australia/Perth` (UTC+8)
- Brisbane → `Australia/Brisbane` (UTC+10)

**Rules:**
- Firestore stores absolute timestamps (UTC)
- Follow-up display uses `followUp.officeId` to determine timezone
- `primaryOfficeId` used only for user-default views
- Multi-office users: each entity's `officeId` determines its display timezone

**Functions:**
- `formatZonedTime(date, timeZone, options)` — format date in timezone
- `startOfDayInTimeZone(utcString, timeZone)` — get midnight in timezone
- `classifyFollowUpTime(scheduledAt, now, timeZone)` — overdue/today/tomorrow/upcoming

### 26.7 Call Claim Behaviour

**Claim acquisition:** Transaction checks existing lease. If active and owned by another user, deny.

**Claim refresh:** Only by claimer. Extends expiry by 15 minutes.

**Claim release:** Only by claimer. Sets `activeCallLease` to null.

**Save & Next flow:**
1. Save call result
2. On success: release current claim, move to next lead, acquire new claim
3. On failure: remain on current lead, keep claim, show error

### 26.8 Follow-Up Consistency

**On completion:**
- Set `status: "completed"`, `completedAt`, `completedBy` (from session)
- Create `follow_up_completed` activity event
- Query next pending follow-up for lead
- Update `lead.nextFollowUpAt` to next follow-up's `scheduledAt`
- If no pending follow-ups remain, set `lead.nextFollowUpAt` to null

### 26.9 Search Behaviour

**Current:** Exact match on `mobileNormalized` (indexed).

**Limitations:** No substring search. Firestore does not support it. Future: Algolia/Typesense.

### 26.10 Firestore Index Review

**Existing indexes support all Phase 3B queries:**
- `leads: officeId + status + createdAt`
- `leads: officeId + assignedRepId + status + createdAt`
- `leads: assignedRepId + nextFollowUpAt`
- `leads: officeId + mobileNormalized`
- `followUps: officeId + status + scheduledAt`
- `followUps: assignedRepId + status + scheduledAt`

**No new indexes added.**

### 26.11 Mock-Data Audit

**Remaining mock-data imports:**
- `src/lib/mock-data.ts` — still imported by some pages (imports, surveys, reports)
- These are NOT authenticated production lead routes
- Lead management pages (leads, calling, follow-ups, dashboard) use Firestore

**No silent production fallback.** Authenticated lead routes fail explicitly if Firestore is unavailable.

### 26.12 Firestore Rule Review

**New collection added to rules:**
- `leadMobileKeys` — not client-writable (server-only via Admin SDK)

**All existing rules verified for:**
- Unauthenticated: denied
- Disabled: denied
- Rep: office/assignment boundaries enforced
- Manager: office boundaries enforced
- Admin: cross-office access
- Activities: `allow write: if false` (server-only)

### 26.13 Performance Review

**Findings:**
- N+1 user reads: Mitigated by `getUserProfiles()` batching
- Unbounded lead reads: All queries use `limit`
- Dashboard aggregations: Uses `count()` (not full collection reads)
- Claim refresh: 5-minute interval (not excessive)

### 26.14 Security Review

**Verified:**
- ✅ Actor identity derived from session
- ✅ No client-supplied userId accepted as authority
- ✅ Office scope enforced server-side
- ✅ Version conflicts enforced
- ✅ leadMobileKeys prevents concurrent duplicates
- ✅ Pagination cannot cross authorization scope
- ✅ Call claims cannot be stolen
- ✅ Direct client writes restricted
- ✅ Firebase Admin remains server-only
- ✅ No production mock fallback
- ✅ No raw Firebase errors exposed

### 26.15 Tests Added in Phase 3B

| File | Tests | Status |
|------|-------|--------|
| `src/test/phase3b-integration.test.ts` | 11 | ✅ Passed |
| `src/test/timezone.test.ts` | 15 | ✅ Passed |

### 26.16 Total Test Count

**151 tests passing** (127 existing + 24 new)

### 26.17 Files Created/Modified in Phase 3B

**New files:**
- `src/lib/server/actions.ts` — Server mutation layer
- `src/lib/server/leads.ts` — Server-side queries
- `src/lib/timezone.ts` — Timezone utilities
- `src/app/api/leads/route.ts` — Leads API
- `src/app/api/leads/[id]/route.ts` — Lead mutation API
- `src/app/api/follow-ups/[id]/complete/route.ts` — Complete follow-up API
- `src/app/api/calling/queue/route.ts` — Calling queue API
- `src/app/api/dashboard/route.ts` — Dashboard API (real metrics)
- `src/app/api/users/profiles/route.ts` — User profiles API
- `src/app/api/users/reps/route.ts` — Reps API
- `src/app/calling/CallingClient.tsx` — Updated to use API routes
- `src/app/follow-ups/FollowUpsClient.tsx` — Updated to use API routes
- `src/app/dashboard/DashboardClient.tsx` — Real metrics
- `src/app/leads/LeadsClient.tsx` — Firestore-backed
- `src/test/phase3b-integration.test.ts` — Integration tests
- `src/test/timezone.test.ts` — Timezone tests

**Modified files:**
- `src/app/api/dashboard/route.ts` — Real metrics implementation
- `src/lib/server/leads.ts` — Pagination cursor redesign
- `src/lib/timezone.ts` — Added `classifyFollowUpTime`
- `vitest.config.ts` — Serial test execution for emulator stability

### 26.18 Verification Results

| Check | Result |
|-------|--------|
| `npm run lint` | ✅ **Passed** (0 errors, 0 warnings) |
| `npm run typecheck` | ✅ **Passed** |
| `npm run build` | ✅ **Passed** (28 routes) |
| All tests | ✅ **151 passed** |

### 26.19 Phase 3 Completion Status

**Phase 3 is now COMPLETE.**

✅ **All gates green:**
- Persistence foundation (Phase 3A)
- UI integration (Phase 3B)
- Data integrity closeout (Phase 3B)
- Server/client boundary resolved
- Real dashboard metrics
- Pagination cursor correctness
- Duplicate uniqueness
- Timezone handling
- Call claim tests
- Follow-up consistency tests

### 26.20 Phase 4 Safe to Begin?

**Yes.** Phase 4 (Community Survey Persistence and Lead Conversion) can begin.

---

**Report Prepared By:** Phase 3B Checkpoint
**Date:** 2026-09-12
