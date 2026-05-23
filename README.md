# Enterprise Operations Monitor

> A production-style retail operations command center for monitoring EOD compliance, store sync health, backups, agents, office machines, and RBAC across distributed branches.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Portfolio Demo](https://img.shields.io/badge/portfolio-demo_data_only-f59e0b)

## Why this exists

Retail operations teams often need to know, every night, whether branch uploads finished, store data is fresh, backups exist, support agents are healthy, and the right people have the right access. Without a central system, that turns into manual branch checks, stale spreadsheets, late failure discovery, and shared admin accounts.

**Enterprise Operations Monitor** turns those scattered checks into one authenticated dashboard:

- Track End-of-Day upload compliance before the next business day starts.
- Isolate stale or failing store syncs by branch and store.
- Audit backups, service health, logs, and guarded operational actions.
- Manage named users with roles, permission overrides, and branch scopes.
- Demonstrate a safe portfolio version using simulated/anonymized data only.

## Demo disclosure

This repository is a portfolio-safe demo. All demo data is simulated or anonymized. No real store, employee, customer, credential, message-provider, or operational data is included.

## What makes it worth reviewing

- **Real operational domain** — designed around EOD deadlines, branch visibility, backup confidence, agent rollouts, and after-hours activity.
- **Production-shaped architecture** — React SPA, Express REST API, PostgreSQL, Sequelize migrations, Docker Compose, Nginx security headers, and scheduled jobs.
- **Resilient data flow** — DB-first reads with live fallback, TTL caching, request deduplication, retries, and sequential branch fetches for unstable upstream APIs.
- **Serious access control** — RBAC v2 with 7 system roles, 30 permissions, user-level allow/deny overrides, and branch scoping.
- **Portfolio storytelling built in** — every major page includes a Problem → Solution → Impact story so reviewers understand the intent without a walkthrough.

## Feature map

| Surface              | Route                 | What it demonstrates                                                                                 |
| -------------------- | --------------------- | ---------------------------------------------------------------------------------------------------- |
| Dashboard            | `/`                   | KPI control room for EOD, sync, backups, alerts, and operational shortcuts.                          |
| EOD Monitor          | `/eod`                | Deadline-aware store upload tracking, manual sync/retry actions, branch completion, and XLSX export. |
| Store Sync           | `/sync`               | Per-store freshness, stale/problem filters, history buckets, and 10-second refresh monitoring.       |
| Store Directory      | `/stores`             | Searchable, filterable source of truth for store metadata with Excel export.                         |
| Employee Directory   | `/identity`           | NIK/name lookup, branch/role filters, pagination, and Excel export.                                  |
| Backups              | `/backups`            | Backup health, manual backup runs, downloads, delete confirmation, and guarded restore controls.     |
| System Health        | `/system`             | API/database/scheduler/service status, healthcheck triggers, log filtering, copy, and export.        |
| Agent Updater        | `/agent-updater`      | Store agent rollout status, version drift, check-ins, error details, and artifact upload controls.   |
| Office Agent Monitor | `/office-agents`      | Office laptop inventory, CPU/RAM/disk thresholds, online/offline status, and heartbeat history.      |
| Accounts             | `/admin/users`        | User management, role assignment, branch scopes, password actions, and permission overrides.         |
| Roles                | `/admin/roles`        | DB-backed roles, grouped permissions, immutable system roles, and custom role editing.               |
| After Hours          | `/admin/afterhours`   | Off-window activity checks, staged warning schedules, notification settings, rankings, and reports.  |
| Live Wallboard       | `/live`, `/live.html` | Public read-only display for shared operational awareness.                                           |
| About                | `/about`              | In-app project narrative, demo disclosure, tech stack, and feature story catalog.                    |

## Architecture at a glance

```text
Browser / Wallboard
      │
      ▼
React 19 SPA + Vite + TailwindCSS
      │
      ▼
Nginx reverse proxy + security headers (production)
      │
      ▼
Express 5 REST API
      ├─ JWT auth → RBAC middleware → route controllers
      ├─ Sequelize ORM → PostgreSQL 15
      ├─ dataGateway TTL cache + in-flight request dedup
      ├─ dataClient retry/timeout layer → external APIs or mock API
      ├─ dataScheduler periodic WIB-aware sync jobs
      └─ backup, health, notification, and agent services
```

Key design choices:

- **DB-first with live fallback** — cached database reads keep the dashboard usable when upstream APIs are slow or unavailable.
- **Sequential branch fetches for sync** — protects against duplicate/missing upstream data observed during parallel branch queries.
- **Adaptive cache TTL** — EOD data refreshes faster during the evening operational window and slower outside peak hours.
- **WIB-first timestamps** — operational dates and EOD windows use Asia/Jakarta helpers instead of browser locale defaults.
- **Branch-scoped RBAC** — users can be restricted to only the branches they operate, while admins retain all-branch visibility.

## Tech stack

| Layer           | Stack                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| Frontend        | React 19, Vite 7, React Router 7, TailwindCSS 3, shadcn/ui-style primitives, lucide-react, Axios wrapper |
| Backend         | Node.js, Express 5, CommonJS modules, Sequelize 6, PostgreSQL 15                                         |
| Auth & Security | JWT, bcryptjs, Helmet, CORS, rate limiting, RBAC v2, branch scopes                                       |
| Data & Ops      | Scheduled sync jobs, TTL cache, Excel exports, backup tooling, health checks                             |
| Testing         | Node Test Runner, Supertest, Vitest, Testing Library, jsdom                                              |
| Infrastructure  | Docker Compose, Nginx, Autoheal, environment validation with Zod                                         |
| Demo            | Standalone mock API with generated sample records                                                        |

## Quick start

### Prerequisites

- Node.js `>=20`
- pnpm `>=9`
- Docker + Docker Compose for full-stack mode

### Option 1 — Fast portfolio demo, no database

Run the mock API and web app in two terminals.

```bash
# Install workspace dependencies
pnpm i

# Terminal 1: start the standalone mock API on port 4000
pnpm --dir mock-api install
pnpm --dir mock-api start

# Terminal 2: start the frontend on port 5173
VITE_API_URL=http://localhost:4000 pnpm dev
```

Open `http://localhost:5173`.

Mock accounts:

| Username     | Password              | Access                        |
| ------------ | --------------------- | ----------------------------- |
| `demo`       | `demo-password`       | Read-only demo user           |
| `superadmin` | `superadmin-password` | Full 30-permission admin demo |

### Option 2 — Docker demo

```bash
cp .env.example .env
docker compose -f docker-compose.demo.yml up -d --build
```

Open `http://localhost:5173`.

### Option 3 — Full stack with PostgreSQL

```bash
cp .env.example .env
# Edit .env: DB_PASS, JWT_SECRET, ADMIN_PASSWORD_HASH, CORS_ORIGINS, and default user passwords.
docker compose up -d --build
```

Services:

| Service    | Default URL / Port                                      |
| ---------- | ------------------------------------------------------- |
| Web        | `http://localhost:5173`                                 |
| API        | `http://localhost:3000`                                 |
| PostgreSQL | `localhost:5433` in Docker mode                         |
| Mock API   | `http://localhost:4000` when running demo mode manually |

## Useful commands

Run from the repository root unless noted otherwise.

| Command             | Purpose                                       |
| ------------------- | --------------------------------------------- |
| `pnpm i`            | Install workspace dependencies.               |
| `pnpm dev`          | Start the React/Vite web app.                 |
| `pnpm dev:api`      | Start the Express API with nodemon.           |
| `pnpm build`        | Build the web app for production.             |
| `pnpm lint`         | Run ESLint across workspaces.                 |
| `pnpm typecheck`    | Run TypeScript checks for the web app.        |
| `pnpm format:check` | Check formatting.                             |
| `pnpm format:write` | Auto-format supported files.                  |
| `pnpm test`         | Run all workspace tests.                      |
| `pnpm check:all`    | Run lint, typecheck, format check, and tests. |
| `pnpm up`           | Start the full Docker stack.                  |
| `pnpm down`         | Stop the Docker stack.                        |
| `pnpm logs`         | Follow Docker logs.                           |

## API overview

The REST API is mounted under `/api` and returns a consistent envelope:

```json
{
  "ok": true,
  "data": {},
  "meta": null,
  "error": null
}
```

Main modules:

| Module      | Example endpoints                                         |
| ----------- | --------------------------------------------------------- |
| Auth        | `POST /api/auth/login`, `GET /api/auth/me`                |
| Dashboard   | `GET /api/dashboard`                                      |
| EOD         | `GET /api/eod`, `GET /api/eod/live`, `POST /api/eod/sync` |
| Sync        | `GET /api/sync`, `GET /api/sync/history`                  |
| Stores      | `GET /api/stores`                                         |
| Employees   | `GET /api/employees`                                      |
| Backups     | `GET /api/backups`, `POST /api/backups/run`               |
| System      | `GET /api/system/health`                                  |
| Users/Roles | `GET /api/users`, `GET /api/roles`                        |
| After Hours | `GET /api/afterhours`, `GET /api/afterhours/report`       |
| Agent       | `GET /api/agent`                                          |

See [`docs/api_contracts.md`](docs/api_contracts.md) for the full route contract.

## Repository layout

```text
enterprise-ops-monitor/
├── apps/
│   ├── api/          Express 5 + Sequelize REST API
│   └── web/          React 19 + Vite SPA
├── mock-api/         Standalone fake-data API for portfolio demos
├── docs/             Architecture, database, API, RBAC, setup, and testing docs
├── nginx/            Reverse proxy and security header configuration
├── agent_updates/    Agent package/version tracking artifacts
├── backups/          Runtime backup output directory
├── docker-compose.yml
├── docker-compose.demo.yml
├── PORTFOLIO.md      Detailed Problem → Solution → Impact stories
└── README.md
```

## Documentation map

| Document                                             | Use it for                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------- |
| [`PORTFOLIO.md`](PORTFOLIO.md)                       | Full storytelling narrative and feature-by-feature impact.          |
| [`docs/architecture.md`](docs/architecture.md)       | System tiers, data flow, caching, scheduler, and design decisions.  |
| [`docs/database.md`](docs/database.md)               | Sequelize models, tables, relationships, and migration notes.       |
| [`docs/api_contracts.md`](docs/api_contracts.md)     | Complete REST API contract and response shapes.                     |
| [`docs/rbac.md`](docs/rbac.md)                       | Roles, permissions, branch scoping, and middleware behavior.        |
| [`docs/synchronization.md`](docs/synchronization.md) | External API sync, persistence, fallback, and scheduling flow.      |
| [`docs/setup.md`](docs/setup.md)                     | Environment variables, Docker modes, deployment notes, and scripts. |
| [`docs/testing.md`](docs/testing.md)                 | Test runners, test files, and verification patterns.                |
| [`apps/web/docs/design.md`](apps/web/docs/design.md) | Frontend layout, component conventions, and UI patterns.            |

## Security and permissions

- JWTs are sent with `Authorization: Bearer YOUR_JWT`.
- Passwords are hashed with bcrypt.
- Helmet, CORS, and global rate limiting are enabled on the API.
- Permission constants are mirrored between backend and frontend.
- System roles are protected from deletion/renaming.
- Demo users are guarded in the UI and blocked from write flows.
- Branch scope filtering is applied by middleware for scoped resources.

## Testing status

Backend coverage includes smoke and unit tests for auth, metadata, sync, time helpers, validators, after-hours logic, data-client retry behavior, dashboard aggregation, notifications, RBAC escalation prevention, export logic, and sync query optimization.

Frontend currently includes route-guard coverage and is structured for additional page/component tests.

```bash
pnpm check:all
```

## Portfolio review path

If you only have a few minutes:

1. Start the mock demo.
2. Login as `demo` to see the read-only experience.
3. Visit `/`, `/eod`, `/sync`, `/backups`, and `/admin/roles`.
4. Login as `superadmin` to inspect guarded actions, user management, branch scopes, and permission overrides.
5. Open `/about` to see the in-app feature story catalog.

## Roadmap ideas

- Add README screenshots or a short walkthrough GIF for the main dashboard, EOD monitor, and RBAC screens.
- Add more frontend smoke/render tests for the highest-value pages.
- Generate OpenAPI documentation from the route contracts.
- Add CI badges once a public GitHub Actions workflow is available.

## License

This portfolio repository is provided for review/demo purposes. Check the repository license before reuse.
