# Phase 5 — Lead Import Engine

## Status: COMPLETE

## Overview

The Lead Import Engine enables ASG managers and administrators to import leads from CSV and XLSX files into the ASG Leads Call Management system. The engine supports automatic column mapping, validation, duplicate detection, round-robin assignment, and partial failure handling.

## Import Schema

### Import Job (`imports/{importId}`)

```typescript
interface ImportJob {
  importId: string;          // UUID
  fileName: string;          // Original file name
  fileType: 'csv' | 'xlsx'; // Detected file type
  fileSize: number;          // Bytes
  officeId: string;          // Target office
  status: ImportStatus;      // Current status
  createdBy: string;         // User ID (from session)
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  importedRows: number;
  failedRows: number;
  assignmentMode: 'single' | 'round-robin' | 'none';
  assignedRepIds: string[];  // Target reps for assignment
  source: string;            // Lead source (e.g., 'csv_import')
  version: number;           // Schema version (1)
}
```

### Import Row (`imports/{importId}/importRows/{rowId}`)

```typescript
interface ImportRow {
  rowId: string;             // `row-{rowNumber}`
  importId: string;          // Parent import job
  rowNumber: number;         // 1-based row number from source
  raw: Record<string, string>;    // Original header -> value
  mapped: Partial<Record<ImportableField, string>>; // Mapped values
  normalizedMobile: string | null; // Normalized mobile (+61...)
  errors: string[];          // Validation errors
  status: ImportRowStatus;   // Current status
  duplicateLeadId?: string;  // ID of existing lead (if duplicate)
  createdLeadId?: string;    // ID of created lead (if imported)
  assignedRepId?: string;    // Assigned rep ID
  createdAt: Date;
  updatedAt: Date;
}
```

### Status Lifecycle

```
uploaded → mapping → validated → importing → completed
                                        → completed_with_errors
                                        → failed
                   → cancelled
```

Row statuses: `pending` → `valid` | `invalid` → `imported` | `failed` | `duplicate`

## CSV Parser

Uses PapaParse with:
- Quoted comma support
- UTF-8 encoding
- Empty line skipping
- Header row detection
- Duplicate header detection
- Malformed CSV error reporting

## XLSX Parser

Uses SheetJS (xlsx) with:
- **First-sheet-only** behavior (additional sheets ignored)
- Empty workbook rejection
- Duplicate header detection
- Safe cell value conversion
- Formula evaluation disabled (raw values only)

## Limits

| Limit | Value |
|-------|-------|
| Max file size | 10 MB |
| Max rows | 10,000 |
| Max columns | 50 |
| Max field length | 500 characters |

Oversized files are **rejected** before processing. No silent truncation.

## Mapping

### Auto-Mapping

Conservative header matching (case-insensitive, 40+ synonyms):

| Synonyms | Target Field |
|----------|--------------|
| name, lead name, full name, contact name | `name` |
| mobile, phone, contact number, phone number, mobile number | `mobile` |
| address, street address | `address` |
| suburb, city | `suburb` |
| postcode, zip | `postcode` |
| notes, comments | `notes` |
| renterowner, renter owner, owner status | `renterOwner` |
| employmentstatus, employment status | `employmentStatus` |
| superannuation, super | `superannuation` |
| status, lead status | `status` |
| assignedrep, assigned rep, rep, consultant, agent, staff | `assignedRep` |
| source, lead source, origin, campaign | `source` |

Unknown headers are marked as `"ignore"` — not aggressively guessed.

### Manual Mapping

Users can override auto-mapped columns via the import wizard. Required fields (`name`, `mobile`) must be mapped; duplicate target-field mapping is prevented.

## Validation

Row validation verifies:
- Name present (required)
- Mobile valid and normalized (required)
- Australian mobile format (04xx xxx xxx → +61...)
- Enum fields valid (status, renterOwner, employmentStatus, superannuation, source)
- Field lengths within limits

## Duplicate Detection

### In-File Duplicates

Tracks normalized mobiles within the import file. Second occurrence of a mobile is marked as duplicate.

### Existing-Lead Duplicates

Queries Firestore `leadMobileKeys` collection (batched in groups of 10 due to Firestore `in` limit). Matching mobiles mark the row as duplicate with reference to the existing lead.

### leadMobileKeys Enforcement

The `leadMobileKeys` collection enforces uniqueness at the database level. Document ID is the normalized mobile number, preventing duplicate leads even under concurrent imports.

## Assignment Modes

| Mode | Behavior |
|------|----------|
| `single` | All rows assigned to the first rep in `assignedRepIds` |
| `round-robin` | Deterministic cycling through `assignedRepIds` |
| `none` | No assignment (`assignedRepId` = null) |

## Deterministic Round-Robin

Assignment uses `roundRobinIndex % assignedRepIds.length`, ensuring deterministic distribution across rows.

## Execution

### Idempotency

Rows already marked as `imported` with a `createdLeadId` are **skipped** on re-execution. This prevents duplicate leads if the import is retried after partial failure.

### Bounded Execution

Processes all rows in a single batch (V1). Each row transitions through:
1. Skip if already imported
2. Skip if marked invalid (count as failed)
3. Skip if marked duplicate (count as duplicate)
4. Validate name presence
5. Check leadMobileKeys for existing duplicate
6. Create lead + activity + leadMobileKeys atomically
7. Update row status to `imported`

### Partial Failure

If any row fails, the import completes with status `completed_with_errors`. Successfully imported rows remain imported. The `failedRows` counter tracks failures.

### Progress Tracking

The import job document tracks:
- `importedRows` — successfully imported
- `failedRows` — failed rows
- `duplicateRows` — duplicate rows
- `status` — current status

## Import History

Managers can view past imports filtered by office. Import detail shows per-row outcomes (valid, invalid, duplicate, imported, failed).

## Authorization

All import operations are server-authoritative:
- API routes use Firebase Admin SDK (bypasses security rules)
- `createdBy` derived from session (not client-provided)
- `officeId` validated against current user's permissions
- Direct client writes to `imports` collection denied by Firestore rules

## Firestore Rules

```javascript
// Imports - server-only writes
match /imports/{importId} {
  allow read: if isAuthenticated() && hasOfficeAccess(resource.data.officeId);
  allow write: if false; // Server-only via Admin SDK
}

// Import rows - server-only writes
match /imports/{importId}/importRows/{rowId} {
  allow read: if isAuthenticated() && hasOfficeAccess(getImportOffice(importId));
  allow write: if false; // Server-only via Admin SDK
}
```

## Firestore Indexes

```json
{
  "indexes": [
    {
      "collectionGroup": "imports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "officeId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "importRows",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "rowNumber", "order": "ASCENDING" }
      ]
    }
  ]
}
```

## Parser/Formula Safety

- XLSX formulas are **not evaluated** — raw cell values only
- No external entity resolution
- File size limits prevent memory exhaustion
- Column/row limits prevent excessive processing

## Performance Findings

- PapaParse handles 10,000 rows in < 2 seconds
- XLSX parsing (first sheet) is O(n) with row count
- leadMobileKeys batched lookups (10 per query) minimize Firestore round-trips
- Round-robin assignment is O(1) per row

## Security Findings

- All writes via Admin SDK (server-only)
- No client-provided user IDs
- Office access enforced at API layer
- leadMobileKeys prevents duplicate leads at database level
- No PII in test fixtures (test data only)

## Test Results

| Test File | Tests | Status |
|-----------|-------|--------|
| import-parsing.test.ts | 17 | PASS |
| import-mapping-validation.test.ts | 26 | PASS |
| import-execution.test.ts | 17 | PASS |
| **Total Phase 5** | **60** | **PASS** |

**Full suite: 227 tests PASS**

### Test Coverage

- **Parsing**: CSV (valid, quoted, UTF-8, CRLF, blank rows, missing headers, duplicates, malformed, extra columns, empty) + XLSX (valid, empty, first-sheet, multiple sheets, duplicate headers, malformed, unsupported)
- **Mapping**: Exact, case-insensitive, synonyms, unknown headers, Ignore Column, manual override, missing required, duplicate target, sample values, ambiguous headers
- **Validation**: Valid row, missing name, missing mobile, invalid Australian mobile, normalized mobile, invalid enums, oversized fields, duplicate-in-file, existing Firestore duplicate
- **Execution**: Single valid row, duplicate detection, row status update, invalid rows, multiple rows, single assignment, round-robin (2 reps, 3 reps), none assignment, idempotency, partial failure, concurrent duplicate protection

## Known Limitations

1. **First-sheet-only**: Additional XLSX sheets are silently ignored
2. **No formula evaluation**: XLSX formulas return raw values
3. **Single-batch execution**: All rows processed in one transaction (no chunked processing)
4. **No real-time progress**: Progress tracked via Firestore document polling
5. **No undo**: Imported leads cannot be automatically rolled back
6. **Mobile-only duplicate detection**: Name-based duplicate detection not implemented

## Phase 6 Prerequisites

Phase 6 (Google Sheets Synchronization) can begin after:
- Phase 5 commit is stable
- Import API routes are tested with real Firebase project
- leadMobileKeys uniqueness verified in production

## Files Added

- `src/lib/domain/import.ts` — Import domain types
- `src/lib/import-pure.ts` — Pure parsing/mapping/validation logic
- `src/lib/server/import-engine.ts` — Server-side import processing
- `src/lib/server/imports.ts` — Import repository functions
- `src/lib/client/import-service.ts` — Client-side import service
- `src/app/api/imports/route.ts` — Create/list imports
- `src/app/api/imports/[id]/route.ts` — Get import detail
- `src/app/api/imports/[id]/parse/route.ts` — Parse uploaded file
- `src/app/api/imports/[id]/validate/route.ts` — Validate mapped rows
- `src/app/api/imports/[id]/execute/route.ts` — Execute import
- `src/app/api/imports/[id]/cancel/route.ts` — Cancel import
- `src/app/imports/page.tsx` — Import wizard UI
- `src/app/imports/history/page.tsx` — Import history UI
- `src/app/imports/[id]/page.tsx` — Import detail UI
- `src/test/import-parsing.test.ts` — Parsing tests
- `src/test/import-mapping-validation.test.ts` — Mapping/validation tests
- `src/test/import-execution.test.ts` — Execution tests
- `src/types/papaparse.d.ts` — PapaParse type declarations
