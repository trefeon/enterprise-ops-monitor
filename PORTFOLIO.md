# Enterprise Operations Monitor

> Real-time visibility for End-of-Day operations, store sync health, backups, agents, access control, and after-hours activity across a simulated retail branch network.

## Demo Disclosure

All data in this demo is simulated or anonymized for portfolio use. No real store, employee, customer, credential, message-provider, or operational data is included.

## Background

This portfolio demo models the kind of operational dashboard a distributed retail team needs when nightly branch uploads, employee-store mappings, system health, and access controls all have to stay visible from one place.

The app turns scattered operational checks into a single authenticated console: teams can review EOD progress, isolate sync problems, audit backups, monitor services, manage branch-scoped users, and inspect agent rollout status without leaving the dashboard.

## Tech Stack

| Layer | Stack |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express, Sequelize, PostgreSQL |
| Security | JWT auth, bcrypt passwords, RBAC v2, branch scoping |
| Operations | Docker Compose, Nginx, scheduled sync jobs, backup tooling |
| Demo Data | Mock API plus generated sample records for local demos |

## Feature Stories

### Dashboard

**Route:** `/`

**Tagline:** The daily control room for store operations.

**Problem:** Ops teams need a fast answer to one question: are stores, EOD uploads, sync jobs, employees, backups, and system signals healthy today?

**Solution:** The dashboard aggregates KPI cards, EOD completion, recent alerts, employee/store totals, backup availability, and operational shortcuts into one scan-friendly page.

**Impact:** A user can understand the day-state in seconds, then jump directly into the feature that needs attention.

| Metric | Value |
| --- | --- |
| Primary view | 1 page |
| Alert feed | Latest 10 |
| EOD refresh window | 60 sec |

**Technical note:** The page pulls dashboard summary and alert data together, then attempts a one-time sync when a fresh install has no usable data yet.

### Store Sync

**Route:** `/sync`

**Tagline:** Find stale store uploads before they become reporting failures.

**Problem:** Branch data can arrive late, disappear behind stale timestamps, or fail for one branch while other branches continue operating normally.

**Solution:** Store Sync shows branch health, store-level freshness, stale/problem filters, manual refresh, and per-store history with recent or bucketed daily views.

**Impact:** Operators can identify exactly which store is late, when it last synced, and whether the problem is isolated to a branch or store.

| Metric | Value |
| --- | --- |
| UI refresh | 10 sec |
| History window | 30 min |
| Branches modeled | 8 |

**Technical note:** The sync-audit source is fetched sequentially because the upstream endpoint can duplicate or miss data when branches are queried in parallel.

### EOD Monitor

**Route:** `/eod`

**Tagline:** Deadline compliance made visible while there is still time to act.

**Problem:** Nightly End-of-Day uploads are only useful if missing or failed stores are visible before the next business day starts.

**Solution:** The EOD monitor tracks store status by date, branch, and status; supports manual sync and retry actions; exports workbook reports; and shows branch-level completion cards.

**Impact:** Late stores, failed uploads, and branch-level bottlenecks become actionable from a single operational view.

| Metric | Value |
| --- | --- |
| Auto-refresh | 30 sec |
| EOD starts | 19:30 WIB |
| Export | XLSX |

**Technical note:** Database upserts preserve completed EOD records with "Ok is Final" protection, so nightly resets do not downgrade already-complete stores.

### Store Directory

**Route:** `/stores`

**Tagline:** One searchable source for store and branch metadata.

**Problem:** Store metadata is hard to trust when branch, region, contact, and active-status fields are scattered across tools or stale spreadsheets.

**Solution:** The directory provides searchable, filterable, paginated store records with branch and region filters plus an Excel export.

**Impact:** Store identity and ownership questions can be answered without leaving the operations console.

| Metric | Value |
| --- | --- |
| Branches modeled | 8 |
| Page size | 50 |
| Export | XLSX |

### Employee Directory

**Route:** `/identity`

**Tagline:** Employee-store mapping that can be searched under pressure.

**Problem:** Employee identifiers and store assignments need to be checked quickly when identity or branch ownership mismatches affect operations.

**Solution:** The employee directory lists people by NIK/name, branch, and role with pagination, branch filtering, role filtering, and CSV export.

**Impact:** Teams can validate NIK-to-store relationships without manual spreadsheet reconciliation.

| Metric | Value |
| --- | --- |
| Search modes | NIK/name |
| Page size | 20 |
| Export | CSV |

**Technical note:** Employee and EOD source fetches use limited concurrency across branches to balance speed with upstream stability.

### Backups

**Route:** `/backups`

**Tagline:** Backup confidence needs timestamps, files, and restore controls.

**Problem:** A backup process is not trustworthy if operators cannot see the latest snapshot, confirm its size/status, download it, or prove restore controls exist.

**Solution:** The backup page shows summary health, recent snapshots, manual backup runs, downloads, delete confirmation, and guarded restore actions.

**Impact:** Database recovery moves from an invisible background job to an auditable operational workflow.

| Metric | Value |
| --- | --- |
| Default schedule | 00:05 daily |
| Page size | 25 |
| Restore guard | Confirm text |

### System Health

**Route:** `/system`

**Tagline:** Service health, logs, and restart actions in one guarded place.

**Problem:** When an operations dashboard degrades, users need to know whether the API, database, scheduler, logs, or services are the source of failure.

**Solution:** System Health combines overview metrics, service cards, healthcheck triggers, guarded service restart actions, log filtering, pagination, copy, and export.

**Impact:** Support users get a practical first-response console instead of guessing from user reports alone.

| Metric | Value |
| --- | --- |
| Log levels | 4 |
| Export limit | 10000 |
| Guarded actions | 2 |

### Agent Updater

**Route:** `/agent-updater`

**Tagline:** Version drift is visible before rollout support starts.

**Problem:** Distributed store agents can fall behind, stop checking in, or require manual confirmation during software rollout.

**Solution:** The updater shows installed/uninstalled nodes, current suggested version, agent status, last check-in, error details, export, and publisher upload controls.

**Impact:** Operators can see rollout status by branch and store, then focus only on nodes that are outdated or unhealthy.

| Metric | Value |
| --- | --- |
| Polling | 30 sec |
| Upload limit | 100 MB |
| Artifact | .exe |

### Accounts

**Route:** `/admin/users`

**Tagline:** Accountability starts with named users and scoped access.

**Problem:** Shared admin access makes it hard to assign responsibility, restrict branch data, or safely delegate operational tasks.

**Solution:** Accounts supports user creation, role assignment, branch scope editing, permission overrides, password changes/resets, and delete controls based on permissions.

**Impact:** Each user can receive only the access they need, with branch-level visibility aligned to their operational responsibility.

| Metric | Value |
| --- | --- |
| Scope model | Branch-based |
| Override types | Allow/deny |
| Admin page size | 25 |

### Roles

**Route:** `/admin/roles`

**Tagline:** RBAC that is explicit enough for real operations.

**Problem:** A simple admin/viewer split cannot safely represent backup actions, EOD retries, service restarts, branch scopes, and account management.

**Solution:** Roles exposes system and custom roles with grouped permissions, edit controls, create/delete support for custom roles, and immutable protection for system roles.

**Impact:** Least-privilege access can be configured without changing code whenever responsibility changes.

| Metric | Value |
| --- | --- |
| System roles | 6 |
| Permissions | 30 |
| Override support | Per user |

**Technical note:** RBAC v2 resolves database-backed roles, user permission overrides, and branch scopes while retaining legacy role fallback compatibility.

### After Hours

**Route:** `/admin/afterhours`

**Tagline:** After-hours activity is only useful when it becomes an alert, report, and trend.

**Problem:** Store computers or uploads active outside operational windows can quietly affect next-day reporting and require branch-level follow-up.

**Solution:** After Hours combines daily violation checks, notification settings, staged warning schedules, branch targets, monthly rankings, report generation, and export.

**Impact:** Off-window activity becomes visible, repeat offenders can be ranked, and branch notifications can be managed in one place.

| Metric | Value |
| --- | --- |
| Warning stages | 4 |
| Report view | Monthly |
| Export | XLSX |

### Live Sync

**Route:** `/live` and `/live.html`

**Tagline:** A public wallboard for operational awareness.

**Problem:** Not every operational display should require a full authenticated admin session, especially when a team needs a read-only screen during monitoring windows.

**Solution:** Live Sync provides a public read-only view for store sync and EOD attention signals, with automatic polling and display-focused layout.

**Impact:** Teams can keep a shared operational screen open without exposing account-management or write-capable workflows.

| Metric | Value |
| --- | --- |
| Routes | /live + /live.html |
| Mode | Read-only |
| Banner | About only |

## Running Locally

All commands are run from the `enterprise-ops-monitor/` directory.

### Demo Mode

```bash
cd mock-api
npm install
npm start

cd ../apps/web
npm install
VITE_API_URL=http://localhost:4000 npm run dev
```

Open `http://localhost:5173`.

### Full Stack

```bash
cp .env.example .env
docker compose up -d --build
```

Open `http://localhost:5173`. The API is available at `http://localhost:3000`.

## Verification

The storytelling layer is frontend-only and should be verified with:

```bash
cd apps/web
npm test
npm run typecheck
npm run build
```
