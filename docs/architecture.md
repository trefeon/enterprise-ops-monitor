# System Architecture

## Overview

Enterprise Operations Monitor is a 3-tier web application with a React SPA frontend, Express REST API backend, and PostgreSQL database. It integrates with external data APIs for live store sync, EOD, and employee information.

## High-Level Data Flow

```
Browser (React SPA)
    │
    ▼
Nginx (reverse proxy, security headers)   [production only]
    │
    ▼
Express API (port 3000)
    ├── JWT Auth Middleware → RBAC Middleware → Controller
    ├── Sequelize ORM → PostgreSQL 15
    ├── dataGateway (cache layer) → dataClient → External APIs
    └── dataScheduler (periodic sync jobs)
```

## Tiers

### Frontend (`apps/web/`)

React 19 SPA built with Vite 7. Uses React Router 7 for client-side routing, TailwindCSS 3 + shadcn/ui for styling, and Axios for API communication.

Key patterns:

- `React.lazy` + `Suspense` for code splitting — each page is a separate chunk
- `AuthContext` wraps the entire app — provides user, permissions, and branch scopes
- `PrivateRoute` component gates routes by required permissions
- `<Guard>` component and `hasPermission()` function for UI-level RBAC
- Dark mode enforced via `dark` CSS class

### API (`apps/api/`)

Express 5 REST API with Sequelize 6 ORM against PostgreSQL 15. CommonJS modules.

Middleware stack (in order):

1. `requestId` — UUID per request (`X-Request-Id` header)
2. `helmet` — security headers
3. `cors` — configured from env
4. `express.json({ limit: "10mb" })` — body parsing
5. `morgan` — HTTP logging
6. `express-rate-limit` — 100 req/15min global
7. 15 route files mounted under `/api/...`
8. `notFound` — 404 handler
9. `errorHandler` — global error handler

### Database

PostgreSQL 15 managed via Sequelize 6 ORM. 16 models defined in `apps/api/models/`. Migrations in `apps/api/migrations/`.

## Data Sources

Two data source modes, controlled by `DATA_USE_DB` env var:

1. **DB-first** (default): Queries normalized tables (`data_stores`, `data_store_eod_current`, etc.) populated by the scheduler
2. **Live-fallback**: Fetches directly from external APIs via `dataClient.js` with retry+timeout logic

### External API Integration

```
External APIs (EOD, Employee, Sync Audit)
    │
    ▼
dataClient.js (fetch with retry, sequential per branch)
    │
    ▼
dataGateway/ (TTL cache layer)
    ├── cache.js (in-memory Map with dedup)
    ├── ttl.js (adaptive TTL: 90s–20min based on time of day)
    └── meta.js (standardized WIB metadata)
    │
    ├── dataPersist.js (orchestrator) → dataDb.js (raw SQL upserts)
    └── Controller routes (via dataSource.js or direct gateway call)
```

### Scheduler

`dataScheduler.js` runs `setInterval` at 30s polling cadence in WIB timezone. Triggers:

- EOD sync at configurable intervals (`DATA_EOD_POLL_MS`)
- EOD final sync at configurable WIB times (`DATA_EOD_FINAL_SYNC_TIMES`)
- Employee daily sync at configurable HHMM (`DATA_EMPLOYEE_DAILY_SYNC_HHMM`)
- After-hours PC check from `afterhours_config.warning_schedule_times`
- Monthly after-hours report on configurable day

Fresh and upgraded databases receive default after-hours warning schedule rows during `ensureDb.js` startup seeding, so report generation works even before an admin opens the settings screen.

### Caching

The dataGateway layer uses:

- **In-memory TTL cache** with request dedup (concurrent requests to the same key share one in-flight request)
- **Adaptive EOD TTL**: 20 min before 16:00 WIB, 5 min 16:00–20:00, 90 sec after 20:00
- **Sync cache TTL**: 30s (static)
- **Employee cache TTL**: 12h (static)

## Directory Reference

```
enterprise-ops-monitor/
├── AGENTS.md                 Agent instruction file
├── apps/
│   ├── api/
│   │   ├── config/           Zod env validation
│   │   ├── controllers/      14 route handlers
│   │   ├── lib/              Permission constants
│   │   ├── middleware/       Auth, RBAC, error handling
│   │   ├── migrations/      10 database migrations
│   │   ├── models/          16 Sequelize models
│   │   ├── routes/          15 Express routers
│   │   ├── services/        Business logic (14 services)
│   │   ├── utils/           Helpers (12 files)
│   │   ├── tests/           Smoke + unit tests
│   │   └── scripts/         Demo & debug scripts
│   └── web/
│       └── src/
│           ├── components/  Reusable UI (sidebar, layout, guards)
│           ├── pages/       18 routeable page components
│           ├── context/     AuthContext, AuthProvider
│           ├── lib/         API client, auth, permissions
│           └── types/       TypeScript type definitions
├── mock-api/                Standalone demo mock server
├── docs/                    All documentation
├── nginx/                   security-headers.conf
└── docker-compose*.yml      Dev, demo, and prod compose files
```

## Key Architectural Decisions

| Decision                       | Rationale                                                                  |
| ------------------------------ | -------------------------------------------------------------------------- |
| DB-first with live fallback    | External APIs may be slow or unavailable; cached DB provides resilience    |
| Sequential branch fetch (sync) | Upstream endpoint duplicates/misses data when branches queried in parallel |
| RBAC v2 (DB-backed)            | Enables runtime role editing without code changes                          |
| Code splitting per page        | Optimizes initial bundle size for SPA                                      |
| CommonJS for API, ESM for web  | API runs on older Node patterns; web uses modern bundler                   |
