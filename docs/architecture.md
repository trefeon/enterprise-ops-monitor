# Architecture

This repository contains **two architectures**:

- **(A) DEPLOYED DEMO** — the default, and only deployable, path: `apps/web` + `mock-api`, booted by `docker-compose.yml`. Runs entirely on simulated data with zero configuration.
- **(B) REFERENCE FULL STACK** — the original production stack (`apps/api` + PostgreSQL + autoheal), kept in `docker-compose.full.yml` **as reference only**. It is never built or deployed by the default path.

Both share the same frontend (`apps/web`). The difference is the backend: a tiny faker-driven mock API (demo) versus a real Express + Sequelize + PostgreSQL API (reference).

---

## (A) Deployed demo — the default path

```
                        ┌────────────────────────────────────────────────┐
   Browser              │                docker-compose.yml              │
   :5173 ──────────────►│  eom-web (nginx:1.27-alpine)                   │
                        │   · SPA static build (React 19 + Vite 7)       │
                        │   · listen :5173                               │
                        │   · try_files → /index.html (SPA routing)      │
                        │   · security headers + CSP                     │
                        │   · /api/*  ── proxy_pass ──► http://api:3000  │
                        └───────────────────────┬────────────────────────┘
                                                │  /api/*  (same-origin, in-network)
                        ┌───────────────────────▼────────────────────────┐
                        │  eom-mock-api  (node:22-alpine)                │
                        │   listen :3000  (published host :4000)         │
                        │   network alias: api  ← nginx proxy target     │
                        │   express + @faker-js/faker + exceljs          │
                        │   99 endpoints under /api/*                    │
                        │   in-memory sessions Map (demo/demo123)        │
                        │   WIB timezone (Asia/Jakarta)                  │
                        └────────────────────────────────────────────────┘

  Ports:  eom-web → 5173:5173   ·   eom-mock-api → 4000:3000
  Network: demo-network (bridge) — mock-api registered under alias "api"
  Health: GET /api/system/health (mock) · wget :5173/ (web)
```

### How the demo boots

`docker compose up -d --build` builds two images:

1. **`web`** (`apps/web/Dockerfile`): multi-stage — pnpm install with BuildKit cache mounts, `vite build` (build args `VITE_API_URL=/api`, `VITE_APP_MODE=demo`), then nginx serving the static `dist` plus `apps/web/nginx.conf`.
2. **`mock-api`** (`mock-api/Dockerfile`): `pnpm install --prod`, copies `server.js`, runs `node server.js`.

No `.env`, database, or secrets are involved. The environment block only sets `MOCK_API_PORT=3000` and `TZ=Asia/Jakarta`; optional web build args (`VITE_IT_SUPPORT_URL`, `VITE_IT_SUPPORT_EMAIL`) default to empty.

### Data flow notes (demo)

- **Auth** — `POST /api/auth/login` accepts `demo` / `demo123` (the only account; `MOCK_USERS` + `MOCK_ACCOUNTS`). It mints a `mock-jwt-token-<32 chars>` and stores it in the in-memory `sessions` `Map`. `GET /api/auth/me` validates the `Authorization: Bearer` header against that map. **Restarting the mock API logs everyone out and resets all data.**
- **Data** — faker generates stores, employees, EOD records, sync history, backup files, after-hours logs, system stats on demand. Mock state lives in module-level arrays (`STORES`, `MOCK_ACCOUNTS`, `MOCK_ROLES`, `MOCK_USERS`, `MOCK_AFTERHOURS_SETTINGS`, `backupFiles`, `eodState`).
- **Exports** — XLSX reports are built with `exceljs` and returned as `{ fileName, contentType, contentBase64 }` (see `buildWorkbookPayload` + `addWorkbookSheet` in `mock-api/server.js`).
- **API envelope** — every response is `{ ok, data, meta, error }` (helpers `ok()` / `fail()` / `paginate()`). `meta.pagination` carries `{ page, pageSize, total }`; `meta.timezone` is `Asia/Jakarta`.
- **CORS** — the mock API uses `cors({ origin: true, credentials: true })` so credentialed cross-origin calls work during local dev and e2e. In the Docker deploy, nginx proxies `/api` same-origin, so CORS is not exercised.

### Local development equivalent

Two terminals: `pnpm dev:mock` (mock API on :4000) and `VITE_API_URL=http://localhost:4000 pnpm dev` (Vite on :5173). The Vite dev server also proxies `/api` → `http://localhost:3000` by default (see `apps/web/vite.config.js`), but the documented flow points the client directly at :4000 so the mock API serves the app.

---

## (B) Reference full stack — never deployed for the demo

```
                        ┌───────────────────────────────────────────────────────┐
   Browser ────────────►│  eom-web (nginx, :5173)                               │
                        │   /api/* → http://api:3000                          │
                        │   /agent_updates/ → http://api:3000                 │
                        └───────────────────────┬─────────────────────────────┘
                                                │ /api/*
                        ┌───────────────────────▼─────────────────────────────┐
                        │  eom-api (Express 5 + Sequelize 6, :3000)           │
                        │   JWT auth (httpOnly cookie) · passport local/Google │
                        │   RBAC v2: roles, permissions, overrides, branch     │
                        │   scopes · Zod validation · rate limiting · helmet   │
                        │   schedulers (EOD/sync polling) · backups (:00:05)   │
                        └───────────────────────┬─────────────────────────────┘
                                                │ postgresql://eom_user:***@eom-db:5432/eom_db
                        ┌───────────────────────▼─────────────────────────────┐
                        │  eom-db (PostgreSQL 15-alpine)                      │
                        │  Row-Level Security · forward-only migrations       │
                        │  external volume eom_postgres_data (host :5433)     │
                        └─────────────────────────────────────────────────────┘

  eom-autoheal (willfarrell/autoheal) — watches containers labeled autoheal=true
```

- Compose file: `docker-compose.full.yml`, header comment: **REAL FULL STACK — REFERENCE ONLY, NOT DEPLOYED FOR THE PORTFOLIO DEMO**.
- Requires `DB_PASS` and `JWT_SECRET` (both are `${VAR:?}` required in the file) and the pre-created external volume: `docker volume create eom_postgres_data`.
- Services: `api` (eom-api), `web` (eom-web), `eom-db` (PostgreSQL 15), `autoheal`. The DB is only reachable on `127.0.0.1:5433` (not exposed publicly).
- Features that exist only in the real stack: JWT secret signing, bcrypt password hashing, Google OAuth, tenant/org isolation with RLS, schedulers (`DATA_SCHEDULER_ENABLED`), automated backups with retention, `agent_updates` static mounts.
- `apps/api/AGENTS.md` contains the reference-stack agent contract (keep when touching `apps/api`).

---

## Repository layout

```
enterprise-ops-monitor/
├── apps/
│   ├── web/                       # React 19 + Vite 7 + TS + Tailwind + shadcn/ui
│   │   ├── src/
│   │   │   ├── pages/             # one folder per feature surface (Dashboard, EOD, ...)
│   │   │   ├── components/        # ui/ primitives, base/, shared/
│   │   │   ├── router/            # route table + permission-gated routes
│   │   │   ├── lib/               # api/ clients, auth/, appMode.ts (isDemoMode)
│   │   │   └── data/stories.js    # portfolio feature stories (source of truth)
│   │   ├── e2e/                   # Playwright demo suite
│   │   ├── nginx.conf             # SPA + /api proxy
│   │   └── Dockerfile             # node:22 build → nginx:1.27-alpine
│   └── api/                       # REFERENCE ONLY — Express + Sequelize + Postgres
├── mock-api/                      # Express 5 + faker demo server (standalone lockfile)
├── reference/                      # gitignored local copy of the original internal project (private)
├── packages/shared/               # @eom/shared TypeScript package
├── scripts/                       # deploy.js, deploy-ops.sh, deploy-check.js, start-web-e2e.mjs
├── docs/                          # prd, architecture, portfolio, security, development, research, adr
├── docker-compose.yml            # DEFAULT light demo (web + mock-api)
├── docker-compose.full.yml       # real full stack — reference only
├── nginx/security-headers.conf   # shared CSP/headers reference
└── tsconfig.base.json
```

## Deployment decision

The repo defaults to the demo because the **portfolio goal** is to show the dashboard, not to operate a database: two containers, no `.env`, no secrets, a sub-minute compose boot on any machine, and a deploy script that needs nothing but an SSH target. The real stack stays in the repo for credibility and study (routing, RBAC, migrations, security work) but is never the default.

See `docs/adr/0001-portfolio-demo-first.md` for the full decision record, and `docs/research.md` for the build-speed data behind it.
