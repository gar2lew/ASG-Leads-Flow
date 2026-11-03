# Executive Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Present a sharper, role-aware executive dashboard and add ASG logo branding.

**Architecture:** Reorder and refine existing manager/admin dashboard sections using the current data model and components. Copy the existing logo asset into `public` and render it in shared desktop/mobile navigation and authentication branding.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-03-executive-dashboard-design.md`

## Global Constraints

- Keep rep and manager/admin experiences role-aware as they are today.
- Keep Perth/Brisbane office selection and current metric definitions intact.
- Use the existing logo file; no logo redraw is included.
- Retain responsive and touch-first behavior.
- Change no APIs, data access, permissions, or lead workflows.

## Review Focus

- Rep dashboard behavior: preserve its action-first layout and data visibility.
- Manager/admin dashboard: preserve current metric values and office selection behavior.
- Narrow screens: retain readable cards and usable touch targets.
- Logo rendering: maintain image proportions and legibility on light and dark branded surfaces.

---

### Task 1: Add ASG Logo to App Branding

**Files:**
- Create: `public/asg-logo.png` (copy of existing `ASG Logo White.png`)
- Modify: `src/components/sidebar.tsx`
- Modify: `src/components/mobile-nav.tsx`
- Modify: `src/app/login/page.tsx`

- [x] Copy the existing PNG asset to `public/asg-logo.png` without altering its pixels.
- [x] Render the image with preserved aspect ratio on a light background in desktop sidebar, mobile header/menu, and both login/reset branding panels.
- [x] Run TypeScript and ESLint checks for the changed components.

### Task 2: Recompose Executive Dashboard

**Files:**
- Modify: `src/app/dashboard/DashboardClient.tsx`

- [x] Keep the rep branch unchanged.
- [x] In the manager/admin branch, surface a concise executive header and metrics/due-work summary first, pipeline counts next, and recent activity/supporting office figures after.
- [x] Keep existing metric definitions, office labels, statuses, links, and callback data.
- [x] Check mobile and desktop layout with the existing responsive grid utilities.
- [x] Run typecheck, ESLint on touched files, and the full Vitest suite. Typecheck and ESLint passed; focused tests passed (2/2). The full suite ran 180 tests successfully but 5 Firestore integration suites could not initialize because the available Java runtime is 17 and Firebase CLI requires Java 21 or newer.

## Verification Results

- `npm run typecheck` — passed.
- `npx eslint` on touched components/tests — passed.
- Focused logo/dashboard tests — passed (2/2).
- `npm run build` — passed after allowing Next.js to fetch the configured Inter font.
- `npm test` — 191 passed; 5 Firestore emulator suites could not connect to local port 8080; 87 tests in those suites were skipped.
- Read-only code review — no actionable dashboard, logo, or responsive UI findings.
