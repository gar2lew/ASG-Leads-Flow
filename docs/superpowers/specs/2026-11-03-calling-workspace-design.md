# Calling Workspace Design

## Intent

Make the one-lead-at-a-time calling workspace faster for office callers while ensuring call outcomes, callbacks, and booked appointments are recorded completely and at the correct office-local time.

## Goals

- Preserve the single-screen, one-lead-at-a-time queue and existing claim/lease protections.
- Keep the phone number, queue progress, survey context, and selected outcome easy to scan.
- Reduce friction in repetitive use with clear keyboard and mouse focus order, compact context, and an always-available Save & Next action.
- Require callback date and time when the outcome is Callback; require appointment date and time when the outcome is Booked.
- Save callback time as a pending follow-up and `nextFollowUpAt`, interpreted in the lead's office timezone (`Australia/Perth` or `Australia/Brisbane`).
- Save booked appointments as an `appointment_booked` activity with the scheduled appointment time in metadata and a clear timeline description; keep lead status as Booked.
- Preserve the optional call note, version conflict handling, and existing status choices.

## Non-goals

- Add a telephony provider or call recording integration.
- Change lead assignment, queue eligibility, permissions, or claim/lease semantics.
- Replace the existing follow-up workflow or introduce a separate appointment collection.
- Make notes mandatory or redesign the executive dashboard.

## Approaches

1. Keep the current single-screen queue, improve its focus order and compact layout, and retain inline conditional fields with explicit validation and persistent save controls. This is selected because it supports both call cadence and complete capture without adding navigation between calls.
2. Split each call into guided call, outcome, and details steps. This would make required fields more prominent but adds interaction steps and interrupts a repetitive office workflow.

## Constraints and implementation calls

- Use existing Next.js, React, Tailwind, Firestore, and `officeToTimeZone` conventions; add no dependency.
- Use existing `appointment_booked` activity type and activity metadata rather than adding a new collection or lead field.
- Keep touch targets at least 44px while making the tab order natural for keyboard/mouse use.
- Treat input date/time as local to the lead's office and convert it to a UTC timestamp server-side.
- Do not add global single-key shortcuts; native focus and keyboard activation avoid accidental outcomes while typing notes.

## Approval

Approved by the user on 3 November 2026.
