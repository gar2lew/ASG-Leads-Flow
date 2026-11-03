# Executive Dashboard Design

## Intent

Give ASG managers and administrators a faster, more polished read of the business at a glance, while preserving the existing data, role permissions, and responsive behavior. Add the supplied ASG logo to the shared app identity.

## Goals

- Put the most decision-useful measures and due follow-ups near the top.
- Make pipeline status easy to scan before showing recent lead activity.
- Use the existing navy, gold, cream, and card styling as the visual foundation, with clearer hierarchy and spacing.
- Add the supplied logo to the app shell and sign-in/reset branding. The image has a white background, so show it on a light, contained surface where it remains legible.
- Preserve touch-friendly controls and existing manager/admin data visibility.

## Non-goals

- Change metrics, API responses, data access, permissions, or lead workflows.
- Redesign the rep dashboard or calling workspace in this pass. The office calling workflow will be reviewed separately with its primary users in mind.
- Introduce new dependencies or a new visual theme.

## Approaches

1. Refine the current layout with spacing, typography, and logo placement. Lowest change, but leaves the current information order intact.
2. Recompose the manager/admin view as an executive summary: headline metrics and due work first, pipeline overview next, then recent activity and supporting office figures. This is the selected approach because it improves the first-glance decision flow while reusing current data and components.

## Constraints and implementation calls

- Keep rep and manager/admin experiences role-aware as they are today.
- Keep Perth/Brisbane office selection and current metric definitions intact.
- Use the existing logo file; no logo redraw is included.
- Retain responsive and touch-first behavior.

## Approval

Approved by the user on 3 November 2026.
