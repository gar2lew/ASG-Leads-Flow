# Phase 4 — Community Survey Persistence & Lead Conversion

**Status:** ✅ **Complete**
**Committed:** TBD
**Starting SHA:** `f0d2d39`
**Branch:** `feat/survey-persistence`

---

## 1. Objective

Replace the prototype Community Awareness Survey flow with real Firestore persistence and safe lead conversion.

At completion:
- Survey sessions are stored in Firestore
- Survey responses are stored in Firestore
- Autosave works
- Respondents can remain anonymous
- Respondents can optionally become leads
- Lead conversion uses the existing Phase 3 lead creation rules
- Duplicate-mobile protection applies to converted leads
- Survey completion is persisted
- Survey history uses real data
- Survey analytics use real data
- Office/rep ownership is enforced
- Mobile workflow remains fast
- Mock survey data is retired from production
- Emulator-backed tests cover the full survey lifecycle
- lint/typecheck/build/tests all pass

---

## 2. Survey Session Schema

Collection: `surveySessions/{sessionId}`

```typescript
interface SurveySession {
  sessionId: string;
  officeId: string;
  repUserId: string;
  status: "draft" | "in_progress" | "completed" | "cancelled";
  startedAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  respondentCount: number;
  leadCount: number;
  createdBy: string;
  version: number;
}
```

- `officeId` — derived from authenticated user's authorized offices
- `repUserId` — derived from authenticated server session
- `status` — lifecycle: `draft` → `in_progress` → `completed` | `cancelled`
- `respondentCount` — server-calculated from persisted responses on completion
- `leadCount` — server-calculated from `becameLead=true` responses
- `version` — optimistic concurrency control

---

## 3. Survey Response Schema

Collection: `surveySessions/{sessionId}/responses/{responseId}`

```typescript
interface SurveyResponse {
  responseId: string;
  sessionId: string;
  sequenceNumber: number;
  costOfLivingIncreased: "yes" | "no" | null;
  payingTooMuchTax: "yes" | "no" | null;
  housingStatus: "renter" | "owner" | "other" | null;
  employmentStatus: "full_time" | "part_time" | "casual" | "self_employed" | "retired" | "other" | null;
  superannuation: "under_50k" | "50k_100k" | "75k_150k" | "100k_200k" | "200k_500k" | "500k_plus" | "dont_know" | null;
  becameLead: boolean;
  leadId: string | null;
  leadCaptureDraft: LeadCaptureDraft | null;
  createdAt: Date;
  updatedAt: Date;
}
```

- `sequenceNumber` — stable position within the session (1-10)
- `becameLead` — true after successful conversion to lead
- `leadId` — reference to the created lead document
- `leadCaptureDraft` — temporary data before conversion (name, mobile, address, notes)

---

## 4. Domain Enums (`src/lib/domain/survey.ts`)

All canonical values are centralized in a single file:

| Type | Values |
|------|--------|
| `HousingStatus` | `renter`, `owner`, `other` |
| `EmploymentStatus` | `full_time`, `part_time`, `casual`, `self_employed`, `retired`, `other` |
| `SuperannuationRange` | `under_50k`, `50k_100k`, `75k_150k`, `100k_200k`, `200k_500k`, `500k_plus`, `dont_know` |
| `CostOfLivingAnswer` | `yes`, `no`, `null` |
| `TaxAnswer` | `yes`, `no`, `null` |
| `SurveySessionStatus` | `draft`, `in_progress`, `completed`, `cancelled` |

Display labels are provided for all canonical values.

---

## 5. Autosave Architecture

The New Survey UI implements a 500ms debounced autosave:

```
User Input → updateResponse()
              ├─ setResponses() (immediate UI update)
              └─ scheduleSave()
                   └─ setTimeout(500ms)
                        └─ flushSave()
                             └─ fetch(PUT /api/surveys/[id]/responses/[responseId])
                                  └─ setSaveStatus("saved" | "error")
```

### Requirements Met
- **Latest response state wins**: `pendingSaveRef` holds only the latest updates
- **Stale debounce cannot overwrite newer state**: `clearTimeout` cancels stale timers
- **Navigation flushes pending save**: Previous/Next buttons trigger immediate flush
- **Completion flushes pending save**: Submit waits for flush before calling complete API
- **Failed save surfaces visible state**: `setSaveStatus("error")` shows error indicator
- **Component unmount does not silently discard unsaved data**: `flushSave` is called before unmount via cleanup
- **Avoids excessive writes**: 500ms debounce coalesces rapid changes

---

## 6. One-Active-Session Strategy

Policy: **one active session per rep per office**

Implementation:
- `getActiveSurveySession(officeId)` queries:
  ```typescript
  db.collection("surveySessions")
    .where("officeId", "==", targetOffice)
    .where("status", "in", ["draft", "in_progress"])
    .where("repUserId", "==", session.uid)  // for reps
    .orderBy("updatedAt", "desc")
    .limit(1)
  ```
- The UI creates exactly one session on mount and reuses it
- The server validates that the user has access to the requested office
- Concurrent requests are handled by the UI's state management (single `init` call)

---

## 7. Lead Conversion Architecture

### Flow

```
Respondent clicks "Yes — Add Lead"
  → Lead Capture modal (name, mobile, address, notes)
  → convertToLead()
    → POST /api/surveys/[id]/complete { action: "convert", responseId, leadData }
      → convertSurveyResponseToLead()
        → db.runTransaction()
          ├─ Read session (validate access)
          ├─ Read response (validate not already converted)
          ├─ Validate Australian mobile
          ├─ Check leadMobileKeys/{mobile} (duplicate detection)
          ├─ Create lead/{leadId}
          ├─ Create leadMobileKeys/{mobile}
          ├─ Create activities/{activityId}
          ├─ Update response { becameLead: true, leadId }
          └─ Update session { leadCount: leadCount + 1 }
```

### Idempotency

- If `response.becameLead === true`, the transaction throws `ALREADY_CONVERTED`
- Repeated requests return `ALREADY_CONVERTED` error without creating duplicates
- `leadCount` is incremented only once per successful conversion

### Duplicate Mobile Handling

- If `leadMobileKeys/{mobile}` exists, the transaction throws `DuplicateMobileError`
- The API returns `DUPLICATE_MOBILE` with the existing lead ID
- The UI shows: "A lead with this mobile number already exists"
- The existing lead is NOT automatically associated with the survey response

### Failure Paths

| Scenario | Behavior |
|----------|----------|
| Invalid mobile | Returns `INVALID_MOBILE` error |
| Duplicate mobile | Returns `DUPLICATE_MOBILE` error with existing lead ID |
| Already converted | Returns `ALREADY_CONVERTED` error |
| Server error | Returns `SERVER_ERROR` |
| Transaction conflict | Firestore automatically retries |

---

## 8. Survey Completion

When a survey is submitted:
1. Flush any pending autosave
2. POST `/api/surveys/[id]/complete` with `action: "complete"`
3. Server (in transaction):
   - Reads all responses in the session
   - Calculates `respondentCount = responses.length`
   - Calculates `leadCount = responses.filter(becameLead).length`
   - Sets `status = "completed"`, `completedAt = now`

The client does NOT provide counts — the server calculates authoritative values.

---

## 9. Survey History

- **Rep:** Own sessions only
- **Manager:** Sessions for permitted office(s)
- **Admin:** All permitted offices

Pagination:
- Deterministic ordering by `updatedAt` desc
- `limit` parameter (default 50)
- `hasMore` detection by fetching `limit + 1`

---

## 10. Survey Analytics

Aggregated metrics from completed sessions:

| Metric | Calculation |
|--------|-------------|
| Total respondents | Count of all responses |
| Cost of living yes % | `(costOfLivingIncreased === "yes").count / total * 100` |
| Tax yes % | `(payingTooMuchTax === "yes").count / total * 100` |
| Renter % | `(housingStatus === "renter").count / total * 100` |
| Owner % | `(housingStatus === "owner").count / total * 100` |
| Employment breakdown | Distribution of `employmentStatus` values |
| Superannuation distribution | Distribution of `superannuation` values |
| Lead conversion rate | `totalLeads / totalRespondents * 100` |

Filters supported:
- Office (for managers/admins)
- Rep (for managers/admins)
- Date range (from/to)

Zero-denominator cases return `0` (not `NaN` or `Infinity`).

---

## 11. Authorization

| Role | Survey Sessions | Survey Responses |
|------|-----------------|------------------|
| **Rep** | Read own | Read own |
| **Manager** | Read office(s) | Read office(s) |
| **Admin** | Read all | Read all |
| **Disabled** | Denied | Denied |
| **Unauthenticated** | Denied | Denied |

- Direct client writes are denied for both `surveySessions` and `surveyResponses`
- All mutations go through authenticated API routes
- Actor identity is always server-derived

---

## 12. Firestore Rule Changes

```javascript
// surveySessions
match /surveySessions/{sessionId} {
  allow read: if isActive() && (
    isAdmin() ||
    (isManager() && userBelongsToOffice(resource.data.officeId)) ||
    (isRep() && request.auth.uid == resource.data.repUserId && userBelongsToOffice(resource.data.officeId))
  );
  allow write: if false;  // Server-authoritative only
}

// surveySessions/{sessionId}/responses/{responseId}
match /surveySessions/{sessionId}/responses/{responseId} {
  allow read: if isActive() && (
    isAdmin() ||
    (isManager() && userBelongsToOffice(get(...surveySessions/$(sessionId)).data.officeId)) ||
    (isRep() && request.auth.uid == get(...surveySessions/$(sessionId)).data.repUserId)
  );
  allow write: if false;  // Server-authoritative only
}
```

---

## 13. Index Changes

Added to `firestore.indexes.json`:

```json
{ "collectionGroup": "surveySessions", "fields": [
  { "fieldPath": "officeId", "order": "ASCENDING" },
  { "fieldPath": "status", "order": "ASCENDING" },
  { "fieldPath": "updatedAt", "order": "DESCENDING" }
]},
{ "collectionGroup": "surveySessions", "fields": [
  { "fieldPath": "repUserId", "order": "ASCENDING" },
  { "fieldPath": "status", "order": "ASCENDING" },
  { "fieldPath": "updatedAt", "order": "DESCENDING" }
]},
{ "collectionGroup": "surveySessions", "fields": [
  { "fieldPath": "officeId", "order": "ASCENDING" },
  { "fieldPath": "updatedAt", "order": "DESCENDING" }
]},
{ "collectionGroup": "surveySessions", "fields": [
  { "fieldPath": "repUserId", "order": "ASCENDING" },
  { "fieldPath": "updatedAt", "order": "DESCENDING" }
]}
```

Removed stale indexes:
- `officeId + startedAt` (replaced by `officeId + status + updatedAt`)
- `repId + startedAt` (typo field, replaced by `repUserId + status + updatedAt`)

---

## 14. Mock-Data Retirement

The prototype survey implementation used:
- `defaultSurveyRespondents()` from `src/lib/mock-data.ts`
- Local state management via `src/lib/store.tsx`

Production survey routes now use:
- Firestore-backed sessions via API routes
- Server-side persistence and authorization
- Real analytics aggregation

The mock-data module remains for:
- Tests and demo fixtures
- Unrelated not-yet-migrated modules

---

## 15. Mobile UX Findings

### Strengths
- Touch targets are large (min-w-[80px] buttons)
- Progress indicator is visible
- Save status is visible ("Saving...", "Saved", "Save failed")
- Lead capture modal is usable on narrow screens

### Potential Improvements
- Next button could be disabled while save is in flight
- Keyboard could hide primary actions on small screens
- No accidental double-submit protection beyond debounce

These are minor and do not block Phase 4 completion.

---

## 16. Performance Review

| Area | Finding | Action |
|------|---------|--------|
| Autosave write frequency | 500ms debounce coalesces rapid changes | Adequate |
| Response loading | Single query per session load | Adequate |
| History pagination | `limit + 1` pattern for `hasMore` | Adequate |
| Analytics reads | Scans all completed sessions | Bounded by date filters; future optimization possible |
| User profile resolution | No N+1 (not applicable for surveys) | Adequate |
| Repeated session fetches | UI caches session state | Adequate |

### Future Optimization
If analytics becomes slow with many sessions:
- Add server-side aggregation (e.g., count queries)
- Cache analytics results with TTL
- Add bounded date filters (enforced, not optional)

---

## 17. Security Review

| Check | Status | Notes |
|-------|--------|-------|
| Actor identity always server-derived | ✅ | `validateSession()` in all mutations |
| `repUserId` never trusted from client | ✅ | Server reads from session cookie |
| `officeId` never trusted from client | ✅ | Derived from user's authorized offices |
| Client cannot fabricate `leadId` | ✅ | Writes are `false` in rules |
| Client cannot set `becameLead=true` directly | ✅ | Writes are `false` in rules |
| Client cannot increment `leadCount` | ✅ | Writes are `false` in rules |
| Duplicate mobile protected transactionally | ✅ | `leadMobileKeys` check in transaction |
| Cross-office access denied | ✅ | Rules enforce office boundaries |
| Completed session mutation restricted | ✅ | Repository checks status before update |
| Firebase Admin remains server-only | ✅ | `"server-only"` import in repository |
| No raw Firebase errors exposed | ✅ | Errors are mapped to typed codes |
| No production mock fallback | ✅ | Survey routes use real Firestore |

---

## 18. Test Results

### Phase 4 Survey Lifecycle Tests (`src/test/survey-lifecycle.test.ts`)

16 emulator-backed tests:

| Test | Status |
|------|--------|
| Creates a session with correct initial state | ✅ |
| Allows only one active session per rep per office | ✅ |
| Persists survey responses as subcollection | ✅ |
| Persists anonymous respondent with no PII | ✅ |
| Maintains stable sequenceNumber across updates | ✅ |
| Converts respondent to lead with correct metadata | ✅ |
| Blocks duplicate mobile conversion | ✅ |
| Does not double-increment leadCount on repeated conversion | ✅ |
| Completes session with correct counts | ✅ |
| Allows rep to read own session | ✅ |
| Blocks cross-office access for rep | ✅ |
| Allows manager to read office sessions | ✅ |
| Allows admin cross-office access | ✅ |
| Denies direct client writes to survey sessions | ✅ |
| Calculates correct analytics from completed sessions | ✅ |
| Returns zero analytics when no completed sessions | ✅ |

### Full Regression

| Metric | Value |
|--------|-------|
| Test files | 9 |
| Tests run | 167 |
| Passed | 167 |
| Failed | 0 |
| Skipped | 0 |
| Lint | ✅ Passed (0 errors, 0 warnings) |
| Typecheck | ✅ Passed |
| Build | ✅ Passed (34 routes) |

---

## 19. Known Limitations

1. **Concurrent session creation**: The UI creates one session on mount. Two concurrent "start survey" requests from the same rep in the same office could create two active sessions. Mitigation: The UI calls `init` exactly once per mount.

2. **Analytics scaling**: Analytics queries scan all completed sessions. For large datasets, this could become slow. Future optimization: server-side aggregation, caching, or bounded date ranges.

3. **No resume from history**: If a rep closes the browser mid-survey, they can resume by navigating to `/surveys/new` which queries for an active session. However, there is no explicit "resume" UI for historical in-progress sessions.

4. **Lead capture form**: The lead capture modal is simple (no validation beyond required fields). Future enhancements could include address autocomplete, mobile formatting, etc.

---

## 20. Files Created/Changed

### New Files
- `src/lib/domain/survey.ts` — Canonical survey types and labels
- `src/lib/server/surveys.ts` — Server-side survey repository
- `src/app/api/surveys/route.ts` — List/create sessions
- `src/app/api/surveys/[id]/route.ts` — Get/update session
- `src/app/api/surveys/[id]/responses/route.ts` — Create response
- `src/app/api/surveys/[id]/responses/[responseId]/route.ts` — Update response
- `src/app/api/surveys/[id]/complete/route.ts` — Complete/convert
- `src/app/api/surveys/analytics/route.ts` — Analytics
- `src/test/survey-lifecycle.test.ts` — Phase 4 tests

### Modified Files
- `src/app/surveys/new/page.tsx` — Firestore-backed UI with autosave
- `src/app/surveys/history/page.tsx` — Real survey history
- `src/app/surveys/analytics/page.tsx` — Real analytics
- `firestore.rules` — Survey session/response rules
- `firestore.indexes.json` — Survey query indexes
- `docs/project-state.md` — Updated phase status

---

## 21. Phase 5 Prerequisites

✅ Phase 3 (Lead Creation) — Complete
✅ Phase 4 (Survey → Lead Conversion) — Complete

**Next approved phase: Phase 5 — Lead Import Engine**