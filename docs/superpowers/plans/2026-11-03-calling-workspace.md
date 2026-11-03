# Calling Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make office calling faster while ensuring callbacks and booked appointments are complete and stored in the lead office's local time.

**Architecture:** Add a pure scheduling helper that parses office-local inputs to UTC and validates conditional fields. Wire it into the existing lead call-result action, then reorganize the current calling card into a compact responsive workspace with required scheduling and a sticky action bar.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Firestore, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-03-calling-workspace-design.md`

## Global Constraints

- Preserve the single-screen, one-lead-at-a-time queue and existing claim/lease protections.
- Require callback date and time when the outcome is Callback; require appointment date and time when the outcome is Booked.
- Save callback time as a pending follow-up and `nextFollowUpAt`, interpreted in the lead's office timezone (`Australia/Perth` or `Australia/Brisbane`).
- Save booked appointments as an `appointment_booked` activity with the scheduled appointment time in metadata and a clear timeline description; keep lead status as Booked.
- Preserve the optional call note, version conflict handling, and existing status choices.
- Use existing Next.js, React, Tailwind, Firestore, and `officeToTimeZone` conventions; add no dependency.
- Do not add global single-key shortcuts; native focus and keyboard activation avoid accidental outcomes while typing notes.

## Review Focus

- Perth and Brisbane values: convert office-local input to the correct UTC instant.
- Missing callback or appointment time: block save in the UI and reject server-side.
- Invalid calendar values: reject instead of creating an invalid Firestore date.
- Non-scheduling outcomes: retain their current save path without requiring date fields.
- Responsive/keyboard flow: keep all outcomes accessible and the primary action visible without obscuring fields or the mobile navigation.

---

### Task 1: Office-local Scheduling Helpers

**Files:**
- Create: `src/lib/domain/call-scheduling.ts`
- Create: `src/test/call-scheduling.test.ts`

**Interfaces:**
- Produces: `parseOfficeLocalDateTime(localDateTime: string, officeId: string): Date | null` and `getCallSchedulingError(callResult: string, callbackDate: string, callbackTime: string, appointmentDateTime: string, officeId: string): string | null`.

- [x] Add failing tests for Perth (`2026-11-03T09:30` → `2026-11-03T01:30:00.000Z`), Brisbane (`2026-11-03T09:30` → `2026-11-02T23:30:00.000Z`), invalid dates, missing callback date/time, missing appointment date/time, and a non-scheduling outcome.
- [x] Run `npm test -- src/test/call-scheduling.test.ts` and confirm the missing helper causes the expected failure.
- [x] Implement the two typed pure helpers using the existing `officeToTimeZone` mapping and `Intl.DateTimeFormat`.
- [x] Rerun the focused test and confirm all cases pass (8/8).

### Task 2: Persist Valid Call Scheduling

**Files:**
- Modify: `src/lib/server/actions.ts`
- Modify: `src/app/api/leads/[id]/route.ts`
- Modify: `src/app/calling/CallingClient.tsx`
- Test: `src/test/call-scheduling.test.ts`

**Interfaces:**
- Consumes: Task 1 `parseOfficeLocalDateTime` and `getCallSchedulingError`.
- Produces: `saveCallResultAction(leadId, callResult, note, callbackDate, callbackTime, appointmentDateTime, expectedVersion?)`.

- [x] Add tests for invalid/missing schedule inputs before updating the save action.
- [x] Run the focused tests and confirm the new schedule-validation assertions fail.
- [x] Pass `appointmentDateTime` from the client through the API to the action; validate callback and appointment fields server-side using the lead's `officeId`.
- [x] Persist callbacks as pending follow-ups with office-local conversion and `nextFollowUpAt`; persist bookings as `appointment_booked` activity metadata `{ appointmentAt }` with an office-local description.
- [x] Keep status/version updates, optional notes, call-completed activity, claim release, and existing conflict responses intact.
- [x] Rerun focused helper tests and the nearest non-emulator checks: 11 scheduling tests pass; typecheck and targeted ESLint pass.

### Task 3: Streamline the One-screen Calling UI

**Files:**
- Modify: `src/app/calling/CallingClient.tsx`

- [x] Add failing assertions for conditional schedule validation to the helper test if any UI-required outcome is not represented yet.
- [x] Keep one lead on screen; use a responsive two-column desktop layout for lead/survey context and call outcome/recording, stacking on narrow screens.
- [x] Give the result group an accessible label and `aria-pressed` state; associate labels/inputs and mark conditional schedule fields required.
- [x] Display the selected lead's office-time label beside callback/appointment fields.
- [x] Move the existing Previous, Skip, and Save & Next controls into a sticky action bar above mobile navigation, with at least 44px controls; disable save until required schedule fields are valid.
- [x] Run focused tests, typecheck, ESLint on touched files, production build, and full suite.

## Verification Results

- Focused UI/scheduling tests — 13 passed.
- `npm run typecheck` — passed.
- `npx eslint` on touched production/test files — passed.
- `npm run build` — passed after allowing Next.js to fetch the configured Inter font.
- `npm test` — 191 passed; five Firestore emulator suites could not connect to local port 8080 in this environment; 87 tests skipped.
- Read-only review — no dashboard/calling UI issues. A second pass confirmed transaction ordering and a single lead update. Existing separate post-transaction writes for call-completed and note activities retain a partial-commit retry risk.
