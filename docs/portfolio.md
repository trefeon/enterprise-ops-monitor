# Portfolio Story — Enterprise Ops Monitor

This document restores the in-app portfolio catalog: every feature surface, its route, tagline, problem/solution/impact narrative, and the key metrics exactly as shown in the app. The source of truth is `apps/web/src/data/stories.js`, rendered on the Case Study page at `/case-study` (`apps/web/src/pages/CaseStudy/index.tsx`); the legacy `/about` route redirects to `/case-study`.

The project story, as stated in the app:

> **Enterprise Ops Starter** — Real-time visibility for End-of-Day operations, store sync health, backups, agents, access control, and after-hours activity across a simulated retail branch network.

**Context** — This portfolio demo models the kind of operational dashboard a distributed retail team needs when nightly branch uploads, employee-store mappings, system health, and access controls all have to stay visible from one place.

**Outcome** — The app turns scattered operational checks into a single authenticated console: teams can review EOD progress, isolate sync problems, audit backups, monitor services, manage branch-scoped users, and inspect agent rollout status without leaving the dashboard.

**Demo Disclosure** — All data in this demo is simulated or anonymized for portfolio use. No real store, employee, customer, credential, message-provider, or operational data is included.

## Project origin

Built on operational experience from a retail-IT internship: nightly End-of-Day uploads, store sync health, backup confidence, and branch-scoped access were daily realities. The internal system behind that work is confidential and cannot be shown, so this app is a from-scratch rebuild — the same operational domain, on a modern stack, with 100% simulated data. No original code, employer technology, or real records are reused.

> Original code, modern stack, simulated data — nothing from the internal system it models.

---

## Feature catalog (18 surfaces)

**18 = 17 + 1.** The in-app story catalog (`featureStories` in `apps/web/src/data/stories.js`) contains **17 story entries**; the **Login** screen below is the 18th, documented from the page itself (`apps/web/src/pages/Login/index.tsx`) because it is a route the portfolio showcases but carries no story card.

Beyond these 18, the app also ships 6 routed marketing and auxiliary surfaces that the story catalog deliberately does not cover: Landing (`/`), Pricing (`/pricing`), Signup (`/signup`), Starter (`/starter`), Live TV Display (`/display/:screenToken`), and Live Menu Dashboard (`/app/live-menu`). Together that is **24 routed page components across 25 directories** in `apps/web/src/pages/`; the one un-routed directory — `Billing/` — is a refactor remnant kept in the tree by decision (roadmap task R1.5).

### 1. Dashboard

- **Route:** `/app`
- **Tagline:** "The daily control room for store operations."
- **The Problem:** Ops teams need a fast answer to one question: are stores, EOD uploads, sync jobs, employees, backups, and system signals healthy today?
- **The Solution:** The dashboard aggregates KPI cards, EOD completion, recent alerts, employee/store totals, backup availability, and operational shortcuts into one scan-friendly page.
- **Business Impact:** A user can understand the day-state in seconds, then jump directly into the feature that needs attention.
- **Metrics:** Primary view: 1 page · Alert feed: Latest 10 · EOD refresh window: 60 sec
- **Engineering Note:** The page pulls dashboard summary and alert data together, then attempts a one-time sync when a fresh install has no usable data yet.

### 2. Login

- **Route:** `/login`
- **Tagline:** "Demo access for a sanitized operations dashboard starter with RBAC, exports, and system health." (login page hero copy)
- **The Problem:** A reviewer or operator should reach the dashboard with the demo account in one step, and bad credentials should fail with a clear message.
- **The Solution:** The login screen ships a one-click **Demo Account** quick-login that types `demo` / `demo123` with an animated keystroke effect, plus a standard form with error normalization, "remember me", a System Support dialog, and a Live TV link.
- **Business Impact:** The demo is frictionless for reviewers while the form, error handling, and session flow mirror a production login.
- **Metrics:** Demo account: 1 (quick-login) · Credentials: `demo` / `demo123` · Success redirect: `/app`
- **Notes:** Backend is `POST /api/auth/login` on the mock API — it only accepts the demo account (`INVALID_CREDENTIALS` otherwise) and returns a mock JWT stored in an in-memory session map.

### 3. Logout

- **Route:** `/app/logout`
- **Tagline:** "Session exit is explicit instead of hidden behind a sidebar click."
- **The Problem:** Operational users need a safe way to end sessions, especially when shared workstations or demo environments are involved.
- **The Solution:** The logout page confirms intent, calls the logout endpoint, handles API failure gracefully, and clears local auth state before returning to login.
- **Business Impact:** Session cleanup is visible, recoverable, and consistent with the rest of the permission-gated workflow.
- **Metrics:** Confirmation: Required · Fallback: Local logout · Redirect: `/login`

### 4. Profile

- **Route:** `/app/profile`
- **Tagline:** "Current-user context and account actions stay close to the operator."
- **The Problem:** Users need to confirm which account and role are active before taking guarded operational actions.
- **The Solution:** Profile displays username, role, initials, account-management navigation, password change controls, and logout access.
- **Business Impact:** Reviewers can see how account identity connects to permissions without opening the admin console first.
- **Metrics:** Password flow: Self-service · Admin shortcut: Conditional · Session action: Logout

### 5. Store Sync

- **Route:** `/app/sync`
- **Tagline:** "Find stale store uploads before they become reporting failures."
- **The Problem:** Branch data can arrive late, disappear behind stale timestamps, or fail for one branch while other branches continue operating normally.
- **The Solution:** Store Sync shows branch health, store-level freshness, stale/problem filters, manual refresh, and per-store history with recent or bucketed daily views.
- **Business Impact:** Operators can identify exactly which store is late, when it last synced, and whether the problem is isolated to a branch or store.
- **Metrics:** UI refresh: 10 sec · History window: 30 min · Branches modeled: 8
- **Engineering Note:** The sync-audit source is fetched sequentially because the upstream endpoint can duplicate or miss data when branches are queried in parallel.

### 6. EOD Monitor

- **Route:** `/app/eod`
- **Tagline:** "Deadline compliance made visible while there is still time to act."
- **The Problem:** Nightly End-of-Day uploads are only useful if missing or failed stores are visible before the next business day starts.
- **The Solution:** The EOD monitor tracks store status by date, branch, and status; supports manual sync and retry actions; exports workbook reports; and shows branch-level completion cards.
- **Business Impact:** Late stores, failed uploads, and branch-level bottlenecks become actionable from a single operational view.
- **Metrics:** Auto-refresh: 30 sec · EOD starts: 19:30 WIB · Export: XLSX
- **Engineering Note:** Database upserts preserve completed EOD records with "Ok is Final" protection, so nightly resets do not downgrade already-complete stores.

### 7. Store Directory

- **Route:** `/app/stores`
- **Tagline:** "One searchable source for store and branch metadata."
- **The Problem:** Store metadata is hard to trust when branch, region, contact, and active-status fields are scattered across tools or stale spreadsheets.
- **The Solution:** The directory provides searchable, filterable, paginated store records with branch and region filters plus an Excel export.
- **Business Impact:** Store identity and ownership questions can be answered without leaving the operations console.
- **Metrics:** Branches modeled: 8 · Page size: 50 · Export: XLSX

### 8. Employee Directory

- **Route:** `/app/identity`
- **Tagline:** "Employee-store mapping that can be searched under pressure."
- **The Problem:** Employee identifiers and store assignments need to be checked quickly when identity or branch ownership mismatches affect operations.
- **The Solution:** The employee directory lists people by NIK/name, branch, and role with pagination, branch filtering, role filtering, and Excel export.
- **Business Impact:** Teams can validate NIK-to-store relationships without manual spreadsheet reconciliation.
- **Metrics:** Search modes: NIK/name · Page size: 20 · Export: XLSX
- **Engineering Note:** Employee and EOD source fetches use limited concurrency across branches to balance speed with upstream stability.

### 9. Backups

- **Route:** `/app/backups`
- **Tagline:** "Backup confidence needs timestamps, files, and restore controls."
- **The Problem:** A backup process is not trustworthy if operators cannot see the latest snapshot, confirm its size/status, download it, or prove restore controls exist.
- **The Solution:** The backup page shows summary health, recent snapshots, manual backup runs, downloads, delete confirmation, and guarded restore actions.
- **Business Impact:** Database recovery moves from an invisible background job to an auditable operational workflow.
- **Metrics:** Default schedule: 00:05 daily · Page size: 25 · Restore guard: Confirm text

### 10. System Health

- **Route:** `/app/system`
- **Tagline:** "Service health, logs, and restart actions in one guarded place."
- **The Problem:** When an operations dashboard degrades, users need to know whether the API, database, scheduler, logs, or services are the source of failure.
- **The Solution:** System Health combines overview metrics, service cards, healthcheck triggers, guarded service restart actions, log filtering, pagination, copy, and export.
- **Business Impact:** Support users get a practical first-response console instead of guessing from user reports alone.
- **Metrics:** Log levels: 4 · Export limit: 10000 · Guarded actions: 2

### 11. Agent Updater

- **Route:** `/app/agent-updater`
- **Tagline:** "Version drift is visible before rollout support starts."
- **The Problem:** Distributed store agents can fall behind, stop checking in, or require manual confirmation during software rollout.
- **The Solution:** The updater shows installed/uninstalled nodes, current suggested version, agent status, last check-in, error details, export, and publisher upload controls.
- **Business Impact:** Operators can see rollout status by branch and store, then focus only on nodes that are outdated or unhealthy.
- **Metrics:** Polling: 30 sec · Upload limit: 100 MB · Artifact: `.exe`

### 12. Office Agent Monitor

- **Route:** `/app/office-agents`
- **Tagline:** "Laptop health signals are visible before support tickets arrive."
- **The Problem:** Office machines can go offline, run hot, fill disks, or stop reporting while users still expect support to know what changed.
- **The Solution:** Office Agent Monitor shows machine inventory, online/offline status, metric thresholds, process load, heartbeat history, label editing, and a fake installer workflow.
- **Business Impact:** Support can identify which laptop needs attention, whether the issue is resource pressure or missed heartbeats, and when it last checked in.
- **Metrics:** Heartbeat cadence: 60 sec · Machines modeled: 6 · Detail depth: 10 heartbeats
- **Engineering Note:** The page uses frontend-only mock state so the portfolio can demonstrate real-time monitoring behavior without requiring a Windows agent backend.

### 13. Accounts

- **Route:** `/app/admin/users`
- **Tagline:** "Accountability starts with named users and scoped access."
- **The Problem:** Shared admin access makes it hard to assign responsibility, restrict branch data, or safely delegate operational tasks.
- **The Solution:** Accounts supports user creation, role assignment, branch scope editing, permission overrides, password changes/resets, and delete controls based on permissions.
- **Business Impact:** Each user can receive only the access they need, with branch-level visibility aligned to their operational responsibility.
- **Metrics:** Scope model: Branch-based · Override types: Allow/deny · Admin page size: 25

### 14. Roles

- **Route:** `/app/admin/roles`
- **Tagline:** "RBAC that is explicit enough for real operations."
- **The Problem:** A simple admin/viewer split cannot safely represent backup actions, EOD retries, service restarts, branch scopes, and account management.
- **The Solution:** Roles exposes system and custom roles with grouped permissions, edit controls, create/delete support for custom roles, and immutable protection for system roles.
- **Business Impact:** Least-privilege access can be configured without changing code whenever responsibility changes.
- **Metrics:** System roles: 6 · Permissions: 30 · Override support: Per user
- **Engineering Note:** RBAC v2 resolves database-backed roles, user permission overrides, and branch scopes while retaining legacy role fallback compatibility.

### 15. After Hours

- **Route:** `/app/admin/afterhours`
- **Tagline:** "After-hours activity is only useful when it becomes an alert, report, and trend."
- **The Problem:** Store computers or uploads active outside operational windows can quietly affect next-day reporting and require branch-level follow-up.
- **The Solution:** After Hours combines daily violation checks, notification settings, staged warning schedules, branch targets, monthly rankings, report generation, and export.
- **Business Impact:** Off-window activity becomes visible, repeat offenders can be ranked, and branch notifications can be managed in one place.
- **Metrics:** Warning stages: 4 · Report view: Monthly · Export: XLSX

### 16. After Hours Report

- **Route:** `/app/admin/afterhours/report`
- **Tagline:** "Monthly violation patterns are turned into a reviewable branch report."
- **The Problem:** Daily after-hours alerts are useful, but repeated off-window activity needs a monthly view that can be reviewed and shared.
- **The Solution:** The report view summarizes monthly violation days, branch rankings, report windows, generated timestamps, and export-ready detail tables.
- **Business Impact:** Managers can see recurring patterns instead of isolated events, then focus follow-up on branches and stores with repeat violations.
- **Metrics:** Report grain: Monthly · Ranking view: Branch + store · Export: XLSX

### 17. Live Sync

- **Route:** `/live` (alias `/live.html`)
- **Tagline:** "A public wallboard for operational awareness."
- **The Problem:** Not every operational display should require a full authenticated admin session, especially when a team needs a read-only screen during monitoring windows.
- **The Solution:** Live Sync provides a public read-only view for store sync and EOD attention signals, with automatic polling and display-focused layout.
- **Business Impact:** Teams can keep a shared operational screen open without exposing account-management or write-capable workflows.
- **Metrics:** Routes: `/live` + `/live.html` · Mode: Read-only · Display: Wallboard

### 18. About This Project

- **Route:** `/case-study` (the legacy `/about` route redirects here)
- **Tagline:** "The portfolio context is documented inside the product, not only in README files."
- **The Problem:** A reviewer needs to understand the project purpose, simulated data boundary, tech stack, and feature intent while using the app.
- **The Solution:** About centralizes the project story, demo disclosure, tech stack, verified surfaces, and per-feature Problem/Solution/Impact narratives.
- **Business Impact:** The app can explain itself during a live review and connect each operational screen to the portfolio goals it demonstrates.
- **Metrics:** Story catalog: All routes · Disclosure: In-app · Backend changes: None

---

## Story pillars (as grouped on the About page)

| Pillar                 | Description                                                                | Stories                                                                       |
| ---------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Real-Time Monitoring   | Mission-critical visibility for retail operations and system integrity     | Dashboard, Store Sync, EOD Monitor, System Health, Live Sync                  |
| Operational Automation | Self-healing processes, scheduled backups, and automated rollout triggers  | Backups, Agent Updater, Office Agent Monitor, After Hours, After Hours Report |
| Enterprise Governance  | Strict RBAC, branch-scoped access, and comprehensive accountability audits | Accounts, Roles, Store Directory, Employee Directory                          |
| Self-Service & Access  | Unified account management and secure session controls                     | Profile, Logout, About                                                        |

## Demo disclosure

All data in this demo is **simulated or anonymized** for portfolio use. No real store, employee, customer, credential, message-provider, or operational data is included. There is exactly one account (`demo` / `demo123`); sessions live in memory and a mock-api restart resets everything. The real full stack (`apps/api`) is reference material only and is never deployed by the default path.

## Tech stack (as shown in the app)

| Layer      | Technologies                                               |
| ---------- | ---------------------------------------------------------- |
| Frontend   | React, Vite, Tailwind CSS, React Router                    |
| Backend    | Node.js, Express, Sequelize, PostgreSQL                    |
| Security   | JWT auth, bcrypt passwords, RBAC v2, branch scoping        |
| Operations | Docker Compose, Nginx, scheduled sync jobs, backup tooling |
| Demo Data  | Mock API plus generated sample records for local demos     |

(Deployed demo runtime: React 19 + Vite 7 + TypeScript on the web side; the mock API runs Express 5 + @faker-js/faker + exceljs, so the demo needs no database at all. See `docs/architecture.md`.)

## Running locally

```bash
# Terminal 1 — mock API on http://localhost:4000
pnpm dev:mock

# Terminal 2 — Vite dev server on http://localhost:5173
VITE_API_URL=http://localhost:4000 pnpm dev
```

Then open http://localhost:5173 and use the Demo Account quick-login (`demo` / `demo123`). Docker alternative: `docker compose up -d --build`.

## Verification

The demo suite proves every surface renders and reads real mock data:

- `pnpm test:e2e:demo` — Playwright boots mock-api (:4000) and the Vite web app (:5182), authenticates via `playwright/.auth/demo-user.json`, and asserts routes, content, exports, and read-only behavior.
- `pnpm check:all` — lint + typecheck + format + unit tests across the workspace.

Every screen reads from a real mock endpoint through `apps/web/src/lib/api/`; there is no hardcoded page data.
