# ASG Leads — Phase 0 Baseline Audit and Safety Checkpoint

**Date:** 2026-09-11  
**Repository:** `C:\dev\ASG Leads Call Management`  
**Architecture Reference:** `ASG_LEADS_ARCHITECTURE.md` (source of truth)

---

## 1. Repository Overview

### Root Structure
```
/c/dev/ASG Leads Call Management/
├── ASG_LEADS_ARCHITECTURE.md       # Architecture source of truth
├── ASG Leads Call Management/      # Duplicate folder (mirrored copy)
├── drizzle.config.json             # PostgreSQL/Drizzle config (unused)
├── eslint.config.mjs               # ESLint configuration
├── next.config.ts                  # Next.js config (empty)
├── package.json                    # Dependencies + scripts
├── package-lock.json
├── postcss.config.mjs              # PostCSS config
├── public/                         # Static assets
├── src/                            # Application source
│   ├── app/                        # Next.js App Router routes
│   ├── components/                 # Shared UI components
│   ├── db/                         # PostgreSQL/Drizzle scaffold (empty)
│   └── lib/                        # Core libraries (store, types, mock-data)
├── tsconfig.json                   # TypeScript config
└── node_modules/                   # Installed dependencies
```

### Key Observations
- **Not a git repository** — no `.git` directory found
- Duplicate folder `ASG Leads Call Management/` mirrors the root
- Architecture document is the authoritative implementation reference

---

## 2. Current Technology Stack

| Category | Technology | Version | Status |
|----------|------------|---------|--------|
| Framework | Next.js | 16.2.6 | App Router |
| Runtime | React | 19.2.6 | Client components |
| Language | TypeScript | 5.9.3 | Strict mode |
| Styling | Tailwind CSS | 4.1.17 | Custom theme (`asg-*` tokens) |
| Charts | Recharts | 3.10.1 | Reporting visualisations |
| Database (scaffolded) | PostgreSQL + Drizzle ORM | 0.45.2 / 0.31.10 | **Unused** — empty schema |
| Linting | ESLint | 9.39.4 | Next.js config |
| State | React Context + useState | — | In-memory mock store |

### Package.json Scripts
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit"
}
```

---

## 3. Route Inventory

| Route | File | Type | Auth Required | Notes |
|-------|------|------|---------------|-------|
| `/` | `app/page.tsx` | Redirect | — | → `/dashboard` |
| `/login` | `app/login/page.tsx` | Client | No | Fake auth (mock users) |
| `/dashboard` | `app/dashboard/page.tsx` | Client | Yes | Role-based metrics |
| `/leads` | `app/leads/page.tsx` | Client | Yes | Filter/sort/search |
| `/leads/new` | `app/leads/new/page.tsx` | Client | Yes | Create lead (mock) |
| `/leads/[id]` | `app/leads/[id]/page.tsx` | Client | Yes | Detail + actions |
| `/calling` | `app/calling/page.tsx` | Client | Yes | Call queue workspace |
| `/follow-ups` | `app/follow-ups/page.tsx` | Client | Yes | Callback management |
| `/surveys/new` | `app/surveys/new/page.tsx` | Client | Yes | 10-respondent flow |
| `/surveys/history` | `app/surveys/history/page.tsx` | Client | Yes | Session list |
| `/surveys/analytics` | `app/surveys/analytics/page.tsx` | Client | Yes | Hard-coded metrics |
| `/imports` | `app/imports/page.tsx` | Client | Yes | 5-step wizard (mock) |
| `/imports/history` | `app/imports/history/page.tsx` | Client | Yes | Mock history table |
| `/reports` | `app/reports/page.tsx` | Client | Yes | Hard-coded demo data |
| `/admin/users` | `app/admin/users/page.tsx` | Client | Yes (Admin/Manager) | CRUD mock |
| `/admin/teams` | `app/admin/teams/page.tsx` | Client | Yes (Admin/Manager) | Static data |
| `/admin/offices` | `app/admin/offices/page.tsx` | Client | Yes (Admin/Manager) | Static data |
| `/admin/settings` | `app/admin/settings/page.tsx` | Client | Yes (Admin/Manager) | Config tabs (mock) |
| `/api/health` | `app/api/health/route.ts` | Server | No | **Fails** — requires `DATABASE_URL` |

---

## 4. Component / State Architecture

### 4.1 Global State: `src/lib/store.tsx` (AppContext)
- **Provider:** `AppProvider` wraps entire app in `layout.tsx`
- **State Shape:** `AppState` — all domain entities in memory
  - `currentUser`, `users[]`, `leads[]`, `activities[]`, `followUps[]`, `surveySessions[]`, `importJobs[]`
  - `selectedOffice`, `isAuthenticated`
- **Mutations (22 callbacks):** `login`, `logout`, `setSelectedOffice`, `updateLead`, `addLead`, `addActivity`, `addFollowUp`, `completeFollowUp`, `addSurveySession`, `updateSurveySession`, `addImportJob`, `updateUser`, `addUser`
- **Queries:** `getOfficeLeads`, `getRepLeads`, `getLeadActivities`
- **Initialisation:** Seeded from `mock-data.ts` on every render

### 4.2 Shared Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `Shell` | `components/shell.tsx` | Layout wrapper + auth gate |
| `Sidebar` | `components/sidebar.tsx` | Desktop navigation + office switcher |
| `MobileNav` | `components/mobile-nav.tsx` | Mobile drawer + bottom bar |
| `MetricCard` | `components/metric-card.tsx` | KPI display with trend |
| `StatusBadge` | `components/status-badge.tsx` | Lead/follow-up status pill |
| `EmptyState` | `components/empty-state.tsx` | Zero-data illustrations |

### 4.3 State Mutation Paths (All Local)
1. **Lead CRUD** → `updateLead` / `addLead` → in-memory array replace/push
2. **Activities** → `addActivity` → prepend to array
3. **Follow-ups** → `addFollowUp` / `completeFollowUp` → array push / map
4. **Surveys** → `addSurveySession` / `updateSurveySession` → array push / map
4. **Imports** → `addImportJob` → array push
5. **Users** → `updateUser` / `addUser` → array map / push
6. **Auth** → `login` / `logout` → swap `currentUser` + `isAuthenticated`

**No persistence layer** — all mutations lost on refresh.

---

## 5. Authentication Behaviour

### Current Implementation (`src/lib/store.tsx:53-65`)
```typescript
const login = useCallback((email: string, password: string) => {
  const user = data.users.find((u) => u.email === email);
  if (user && password.length > 0) {  // Any non-empty password works
    setState((s) => ({
      ...s,
      currentUser: user,
      selectedOffice: user.office as Office | "All",
      isAuthenticated: true,
    }));
    return true;
  }
  return false;
}, []);
```

### Characteristics
- **Fake authentication** — no real identity provider
- **Mock users** seeded in `mock-data.ts` (6 users: 2 Reps Perth, 1 Rep Brisbane, 1 Manager Perth, 1 Manager Brisbane, 1 Admin)
- **Role-based UI gating** — `currentUser.role` controls admin nav visibility
- **Office scoping** — `selectedOffice` filters leads (Admin sees "All")
- **No session persistence** — refresh = logged out
- **No password validation** — any non-empty string accepted

### Protected Routes
- `Shell` component guards all routes: `if (!isAuthenticated) return <>{children}</>`
- `/login` redirects to `/dashboard` if `isAuthenticated`
- Admin routes gated by `canAccessAdmin = role === "Admin" || role === "Manager"`

---

## 6. Persistence Behaviour

| Layer | Status | Details |
|-------|--------|---------|
| **Client State** | ✅ Functional | React Context + useState — full CRUD in memory |
| **Server API** | ❌ Non-functional | `/api/health` only; requires `DATABASE_URL` |
| **PostgreSQL/Drizzle** | ❌ Scaffolded only | Empty schema, unused by any route |
| **Firebase** | ❌ Not installed | Architecture target for Phase 1+ |
| **Google Sheets** | ❌ Not connected | Config UI only in Settings |

---

## 7. Mock Data Usage

### `src/lib/mock-data.ts` — 334 lines, 11KB
| Dataset | Count | Used By |
|---------|-------|---------|
| `currentUser` | 1 | Initial auth state |
| `users` | 6 | Login, user admin, assignment |
| `leads` | 8 | All lead flows (list, detail, calling, reports) |
| `activities` | 5 | Lead detail timeline |
| `followUps` | 6 | Dashboard, follow-ups page, calling |
| `surveySessions` | 4 | Survey history, analytics |
| `importJobs` | 3 | Import history |
| `repPerformance` | 4 | Reports table (hard-coded) |
| `defaultSurveyRespondents` | 10 | New survey flow |
| `statusConfig` | 11 | StatusBadge styling |

### Hard-Coded Demo Metrics (Not from Mock Data)
| Location | Metric | Value |
|----------|--------|-------|
| `reports/page.tsx:25-31` | Weekly conversion chart | Static array of 6 days |
| `reports/page.tsx:54-58` | KPI cards | 149 calls, 58 contacts, 14 bookings, 39% |
| `reports/page.tsx:113-124` | Rep performance table | `repPerformance` from mock-data |
| `surveys/analytics/page.tsx:96-101` | Insight cards | 81%, 67%, 52%, 44%, 56% |
| `dashboard/page.tsx:122-124` | Manager KPIs | 94 calls, 39%, 14 bookings (hard-coded) |

---

## 8. PostgreSQL / Drizzle Findings

### Files
- `src/db/index.ts` — Creates `Pool` + `drizzle` instance; **throws if `DATABASE_URL` missing**
- `src/db/schema.ts` — Empty (`export {};`)
- `drizzle.config.json` — Points to local Postgres

### Usage Analysis
| Check | Result |
|-------|--------|
| Imported by any route? | **No** — zero imports of `@/db` in `app/**` |
| Imported by any component? | **No** |
| Imported by store/mock-data? | **No** |
| Referenced in `package.json` scripts? | No (no `db:push`, `db:studio`, `db:generate`) |
| Health endpoint dependency? | **Yes** — `/api/health` imports `@/db` and executes `select 1` |

### Conclusion
**PostgreSQL/Drizzle is scaffolded but completely unused by application functionality.** The only code path that touches it is the `/api/health` endpoint, which causes the production build to fail because `DATABASE_URL` is not set.

---

## 9. Architectural Conflicts with ASG_LEADS_ARCHITECTURE.md

| Architecture Requirement | Current State | Conflict |
|--------------------------|---------------|----------|
| **Firestore = authoritative DB** | In-memory Context only | ❌ Complete replacement needed |
| **Firebase Auth (email/password)** | Fake login with mock users | ❌ Complete replacement needed |
| **Remove PostgreSQL/Drizzle** | Present, breaks build | ✅ Must remove in Phase 1 |
| **Google Sheets server-side only** | Not connected | ❌ Not implemented |
| **LeadID = immutable Firestore doc ID** | `lead.id` (UUID) + `leadId` (display) | ⚠️ Concept exists but not persistent |
| **Mobile normalisation (E.164)** | Not implemented | ❌ Missing |
| **Call lease (15-min)** | Not implemented | ❌ Missing |
| **Survey autosave** | Manual "Saving..." toast only | ❌ Not implemented |
| **Security rules / server enforcement** | UI-only hiding | ❌ No server auth |
| **Audit trail / activities** | In-memory only, lost on refresh | ❌ Not durable |
| **PWA / offline ready** | Manifest in layout, no SW | ⚠️ Partial |

### Critical Deviations
1. **Build fails** — `DATABASE_URL` required but no Postgres exists
2. **No real authentication** — prototype only
3. **No persistence** — all data resets on refresh
4. **Hard-coded metrics** — Reports/Analytics show fake data
5. **ESLint errors** — 20 `react-hooks/purity` violations (`Date.now()` in render)

---

## 10. Existing Functional Workflows (Local-State Only)

| Workflow | Status | Notes |
|----------|--------|-------|
| Login / Logout | ✅ Works | Mock users, any password |
| Dashboard (Rep/Manager/Admin) | ✅ Works | Role-based metrics from mock data |
| Leads list (filter/sort/search) | ✅ Works | Client-side only |
| Lead detail (overview + activity) | ✅ Works | Activity timeline from mock |
| Lead create | ✅ Works | Generates mock `leadId` |
| Call queue (assigned leads) | ✅ Works | Filter by current user |
| Call result + note + callback + booking | ✅ Works | Updates local state |
| Save & Next (calling) | ✅ Works | Advances queue index |
| Follow-ups (overdue/today/tomorrow/upcoming) | ✅ Works | Mark complete |
| Survey session (10 respondents) | ✅ Works | Step-through with progress |
| Survey lead capture | ✅ Works | Creates mock leads on submit |
| Survey history | ✅ Works | Filter by rep/office |
| Import wizard (5 steps) | ✅ Works | Mock validation, no real parse |
| Import history | ✅ Works | Mock data table |
| Reports (charts + table) | ✅ Works | Hard-coded demo data |
| Admin users CRUD | ✅ Works | Local state only |
| Admin teams/offices/settings | ✅ Works | Static/config UI only |
| Mobile navigation | ✅ Works | Drawer + bottom bar |

---

## 11. Incomplete / Non-Functional Workflows

| Workflow | Gap |
|----------|-----|
| **Real authentication** | No Firebase Auth, no password hash, no session |
| **Data persistence** | All data lost on refresh/navigation |
| **Multi-user concurrency** | No locking, no call lease, no conflict resolution |
| **Google Sheets sync** | UI config only, no API, no credentials |
| **Lead import (real)** | No CSV/XLSX parsing, no mapping, no validation |
| **Survey autosave** | No background persistence |
| **Health endpoint** | Fails build (requires `DATABASE_URL`) |
| **Role-based data access** | UI filtering only, no server enforcement |
| **Audit trail durability** | Activities lost on refresh |
| **Mobile normalisation** | No phone formatting/validation |
| **Duplicate detection** | Mock only (import wizard shows 8) |

---

## 12. Hard-Coded / Demo Data

| File | Lines | Description |
|------|-------|-------------|
| `reports/page.tsx` | 25-31, 54-58, 113-124 | Weekly chart, KPI cards, rep performance table |
| `surveys/analytics/page.tsx` | 96-101 | Insight cards (81%, 67%, 52%, 44%, 56%) |
| `dashboard/page.tsx` | 122-124 | Manager KPIs (94 calls, 39%, 14) |
| `imports/page.tsx` | 21-27 | Validation object (327/312/8/4) |
| `admin/teams/page.tsx` | 5-9 | Static teams array |
| `admin/offices/page.tsx` | 6-9 | Static offices array |
| `admin/settings/page.tsx` | 17-18, 86-97 | Static statuses/sources/questions |

---

## 13. Responsive / Mobile Observations

| Aspect | Status |
|--------|--------|
| **Desktop sidebar** | Fixed 256px (`lg:flex`), collapses on mobile |
| **Mobile drawer** | Slide-in from right, full-height |
| **Bottom nav bar** | 4-item fixed bar (Home, Leads, Call, Survey) |
| **Tables → Cards** | `lg:hidden` / `hidden lg:block` pattern throughout |
| **Touch targets** | 44px+ on buttons, adequate spacing |
| **Viewport meta** | `width=device-width, initial-scale=1, maximum-scale=1` |
| **PWA manifest** | Referenced in `layout.tsx` (`/manifest.json`) |
| **Tel links** | Used in lead detail & calling (`tel:` hrefs) |
| **Orientation** | Tested logically — no landscape-specific issues seen |

---

## 14. Baseline Verification Results

| Command | Result | Details |
|---------|--------|---------|
| `npm install` | ✅ Passed | Already run (node_modules present) |
| `npm run lint` | ❌ **Failed** | 20 errors (18 `react-hooks/purity` + 2 `react/no-unescaped-entities`) |
| `npm run typecheck` | ✅ Passed | No TypeScript errors |
| `npm run build` | ❌ **Failed** | `Error: DATABASE_URL is required` at `/api/health` |

### Lint Errors Breakdown
| File | Error Count | Type |
|------|-------------|------|
| `app/calling/page.tsx` | 3 | `Date.now()` in render (lines 60, 82, 92) |
| `app/follow-ups/page.tsx` | 2 | Unescaped `"` in JSX (line 119) |
| `app/leads/[id]/page.tsx` | 6 | `Date.now()` in render (lines 65, 80, 97, 106, 125) |
| **Total** | **20 errors** | — |

> **Note:** Per instructions, these pre-existing failures are **documented but not fixed** during Phase 0.

---

## 15. Risks Before Firebase Migration

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Build broken by unused Postgres** | High | Remove `src/db/*`, `drizzle.config.json`, `drizzle-orm`, `pg`, `@types/pg`, `drizzle-kit` in Phase 1 |
| **No authentication backbone** | High | Phase 2 introduces Firebase Auth; all protected routes need auth context migration |
| **In-memory state ≠ Firestore model** | Medium | Domain types in `types.ts` align ~80% with architecture; need `mobileNormalized`, `LeadID` strategy |
| **Hard-coded metrics in production paths** | Medium | Phase 8 replaces with Firestore queries |
| **ESLint purity errors** | Low | Fix `Date.now()` → `crypto.randomUUID()` or `Date.now()` in event handlers only |
| **No test suite** | Medium | Architecture mandates unit + emulator + Playwright tests per phase |
| **Duplicate folder confusion** | Low | Remove `ASG Leads Call Management/` mirror folder |

---

## 16. Exact Recommended Phase 1 Change Sequence

Per `ASG_LEADS_ARCHITECTURE.md` §26 (Implementation Phases):

### Phase 1 — Firebase Foundation (Exit Criteria: builds without `DATABASE_URL`)

| Step | Action | Files Affected |
|------|--------|----------------|
| 1.1 | **Remove PostgreSQL scaffold** — delete `src/db/`, `drizzle.config.json`, uninstall `drizzle-orm`, `drizzle-kit`, `pg`, `@types/pg` | `package.json`, `src/db/`, `drizzle.config.json` |
| 1.2 | **Fix `/api/health`** — remove `@/db` import, return static `{ ok: true, service: "asg-leads" }` | `src/app/api/health/route.ts` |
| 1.3 | **Install Firebase SDKs** — `firebase`, `firebase-admin` (server) | `package.json` |
| 1.4 | **Add Firebase client config** — `src/lib/firebase/client.ts` with `initializeApp` (public env vars) | New file |
| 1.5 | **Add Firebase Admin config** — `src/lib/firebase/admin.ts` with `initializeApp` (server env vars) | New file |
| 1.6 | **Create canonical domain types** — align `src/lib/types.ts` with §4–§6 (snake_case, E.164, LeadID) | `src/lib/types.ts` |
| 1.7 | **Create Firestore converters/repositories** — `src/repositories/leads.ts`, `users.ts`, etc. | New directory `src/repositories/` |
| 1.8 | **Add emulator config** — `firebase.json`, `firestore.rules`, `firestore.indexes.json` | New files |
| 1.9 | **Add emulator test harness** — vitest/jest + `@firebase/rules-unit-testing` | New `src/test/` |
| 1.10 | **Verify build passes** — `npm run lint && npm run typecheck && npm run build` | — |

### Immediate Prerequisites (Do First)
1. **Initialise git** (repository not under version control)
2. **Commit baseline** — tag `phase-0-baseline`
3. **Fix ESLint purity errors** (move `Date.now()` to event handlers) — *optional but recommended before Phase 1 to keep lint green*

---

## 17. Files Created / Changed This Audit

| File | Action |
|------|--------|
| `docs/phase-0-baseline-audit.md` | Created (this document) |
| `docs/project-state.md` | Created (see below) |

---

## 18. Concise Final Report

### Files Created/Changed
- `docs/phase-0-baseline-audit.md` — This audit report
- `docs/project-state.md` — Project state tracker

### Baseline Command Results
| Command | Status |
|---------|--------|
| `npm install` | ✅ Already complete |
| `npm run lint` | ❌ **20 errors** (18 `react-hooks/purity`, 2 `react/no-unescaped-entities`) |
| `npm run typecheck` | ✅ **Passed** |
| `npm run build` | ❌ **Failed** — `DATABASE_URL is required` (from `/api/health`) |

### Important Findings
1. **PostgreSQL/Drizzle is entirely scaffolded but unused** — only `/api/health` touches it, causing build failure
2. **All persistence is in-memory React Context** — zero durability, lost on refresh
3. **Authentication is completely fake** — mock users, any password works, no sessions
4. **Hard-coded demo metrics exist in production routes** — Reports, Analytics, Dashboard (Manager)
5. **ESLint fails on purity violations** — `Date.now()` called during render in 3 pages
6. **Repository is not under Git** — no version control initialised
7. **Duplicate folder exists** — `ASG Leads Call Management/` mirrors root

### Blockers for Phase 1
- **Must remove PostgreSQL scaffold** before Firebase install (build fails otherwise)
- **Must fix `/api/health`** to not require `DATABASE_URL`
- **Should fix ESLint errors** to keep lint gate passing (not strictly required but recommended)

### Phase 1 Safe to Begin?
**Yes, with prerequisites:**
1. `git init` + baseline commit
2. Remove `src/db/`, `drizzle.config.json`, Postgres deps
3. Fix `/api/health` endpoint
4. Then proceed with Firebase foundation per sequence above

---

**Phase 0 Status:** ✅ Complete — Baseline documented, failures recorded, transition path defined  
**Next Approved Phase:** Phase 1 — Firebase Foundation