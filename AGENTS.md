# AGENTS.md — AI-Agent Contract

This file is the operating contract for any AI agent (or human) working in this repository. Read it before touching anything.

## 1. Project identity & demo-first stance

**Enterprise Ops Monitor** is a **portfolio demo**: a polished operations dashboard (EOD monitoring, store sync health, backups, agents, RBAC, after-hours) running on **simulated data** from a tiny mock API.

- The **default and only deployable path** is the light demo: `apps/web` (React + Vite + TypeScript + Tailwind + shadcn/ui) + `mock-api` (Express + faker). Boots with `docker compose up -d --build`, **zero configuration, no database, no `.env`, no secrets**.
- `apps/api` (Express + Sequelize + PostgreSQL full stack) is **reference material only**. It exists for portfolio credibility and study — it is never built, deployed, or required by the default path. Do **not** delete it and do **not** make the demo depend on it.
- All data is faker-generated or anonymized. There is exactly **one** account: `demo` / `demo123`. Mock sessions live in an in-memory `Map` — restarting the mock API resets everything.

## 2. Architecture map

```
DEMO PATH (default, deployed):
  browser ──► nginx (eom-web, :5173, SPA) ──/api──► mock-api (alias "api", :3000 in-network,
                                                      published :4000, faker data, in-memory sessions)

REAL STACK (reference only, docker-compose.full.yml — never deployed for the demo):
  browser ──► nginx (eom-web) ──/api──► apps/api (eom-api, Express+Sequelize) ──► eom-db (PostgreSQL 15)
                                        └── autoheal, schedulers, backups

PRIVATE REFERENCE (local only, gitignored — never commit):
  reference/DashITops — the original internal project (DashIT web+api, OfficeAgent/PBAgent,
  nginx, docs). Read-only feature/domain source of truth for the demo; contains certs,
  compiled binaries and its own .git. Do not commit, deploy, or reference it publicly.
```

- The mock-api joins the compose network under the **alias `api`** so `apps/web/nginx.conf` (`proxy_pass http://api:3000`) works unchanged.
- API responses use the envelope `{ ok: true, data, meta, error: null }`; failures are `{ ok: false, data: null, meta: null, error: { code, message } }`.
- Detailed diagrams: `docs/architecture.md`.

## 3. Commands

All commands run from the repo root. Scripts are defined verbatim in the root `package.json`.

| Command                               | What it does                                                                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                            | Vite dev server for the web app (alias: `pnpm --filter web dev`)                                                                        |
| `pnpm dev:mock`                       | Start the mock API standalone on `http://localhost:4000` (`node mock-api/server.js`)                                                    |
| `pnpm dev:api`                        | Start the real Express API (`pnpm --filter api dev`) — reference stack                                                                  |
| `pnpm build`                          | Build all workspace packages (`pnpm -r build`)                                                                                          |
| `pnpm lint`                           | ESLint across the workspace (`pnpm -r lint`)                                                                                            |
| `pnpm typecheck`                      | TypeScript check across the workspace (`pnpm -r typecheck`)                                                                             |
| `pnpm test`                           | Unit tests across the workspace (`pnpm -r test`)                                                                                        |
| `pnpm test:e2e:demo`                  | Playwright demo e2e suite (boots mock-api on 4000 + web on 5182)                                                                        |
| `pnpm test:e2e:demo:headed`           | Same e2e suite, headed browser                                                                                                          |
| `pnpm test:e2e:demo:ui`               | Same e2e suite, Playwright UI mode                                                                                                      |
| `pnpm format` / `pnpm format:check`   | Prettier write / check                                                                                                                  |
| `pnpm check:all`                      | `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test`                                                                         |
| `pnpm check:deploy`                   | `node scripts/deploy-check.js` — verify a deployed stack (auto-detects demo vs prod)                                                    |
| `pnpm demo:up`                        | `docker compose up -d --build` (the light demo)                                                                                         |
| `pnpm deploy`                         | `node scripts/deploy.js` (defaults to demo compose file)                                                                                |
| `pnpm deploy:demo`                    | `node scripts/deploy.js --demo`                                                                                                         |
| `pnpm deploy:prod`                    | `node scripts/deploy.js --prod` (reference full stack — `docker-compose.full.yml`)                                                      |
| `pnpm deploy:ops`                     | `bash scripts/deploy-ops.sh --host acerblue --dir /home/trefeon/dev-portfolio/enterprise-ops-monitor --mode demo --preserve-remote-env` |
| `pnpm deploy:ops:prod`                | Same, `--mode prod` (reference full stack; requires remote `.env` with `DB_PASS` + `JWT_SECRET`)                                        |
| `pnpm up` / `pnpm down` / `pnpm logs` | `docker compose up -d` / `down` / `logs -f`                                                                                             |
| `pnpm clean`                          | Remove `node_modules`, `dist`, `.turbo` across the workspace                                                                            |

## 4. Conventions

- **Frontend (`apps/web`)** — TypeScript, React 19, Vite 7, Tailwind CSS, shadcn/ui primitives (`apps/web/src/components/ui/`), React Router 7. Import via the `@/` alias (`@/components/...`, `@/lib/...`).
- **Mock API (`mock-api/server.js`)** — CommonJS, Express 5, `@faker-js/faker`, `exceljs` for XLSX exports. Uses `MOCK_*` module-level arrays (e.g. `MOCK_ACCOUNTS`, `MOCK_ROLES`, `MOCK_USERS`, `MOCK_AFTERHOURS_SETTINGS`) and the `ok(res, data, meta)` / `fail(res, status, code, message)` / `paginate(items, query)` helpers.
- **Scripts (`scripts/`)** — CommonJS / Node ESM as-is, no TypeScript build step.
- **API envelope** — always `{ ok, data, meta, error }` (web client: `apps/web/src/lib/api/client.ts` unwraps it).
- **API clients** — keep them in `apps/web/src/lib/api/` (one module per domain: `auth.ts`, `eod.ts`, `stores.ts`, `downloadExport.ts`). Do not scatter axios calls across pages.
- **Formatting** — ESLint + Prettier (root `lint-staged` hooks). Run `pnpm check:all` before finishing.
- **pnpm workspace** — `pnpm-workspace.yaml` covers `apps/*` and `packages/*`; `mock-api` is intentionally standalone (own lockfile).

## 5. Verification workflow

Every change must be proven, not asserted. Minimum bar for any change touching web code or mock-api:

1. `pnpm typecheck` — TypeScript clean across the workspace.
2. `pnpm build` — production build succeeds (`pnpm --filter web build` for web-only changes).
3. Boot the mock API and hit it: `pnpm dev:mock`, then `curl http://localhost:4000/api/system/health` (or check `POST /api/auth/login` with `demo`/`demo123`).
4. If the change touches routing, data, or UI behavior: `pnpm test:e2e:demo` green (boots web on 5182 + mock-api on 4000, pre-authenticates via `playwright/.auth/demo-user.json`).
5. For pure logic changes: `pnpm test` (vitest unit tests) and add/update a focused test.

## 6. Do / Don't

**Do:**

- Keep the demo **self-contained and zero-config**: `docker compose up -d --build` must always boot web + mock-api with no `.env`, no database, no secrets.
- Keep `mock-api` endpoints **in sync with the UI**: every screen reads from a real mock endpoint via `src/lib/api/`; no hardcoded page data.
- Preserve the `{ ok, data, meta, error }` envelope everywhere.
- Keep `MOCK_*` arrays and the `ok`/`fail`/`paginate` helpers as the mock-api pattern for new endpoints.
- Respect `apps/api/AGENTS.md` if you must touch the reference stack (its own contract lives there).

**Don't:**

- Do **not** make the demo require a database, a `.env` file, or real credentials.
- Do **not** deploy or reference `docker-compose.full.yml` as part of the demo flow.
- Do **not** commit or publicize `reference/` — gitignored private material (real-project source, certs, binaries, nested `.git`).
- Do **not** delete `apps/api`, `packages/`, or real-stack git history — it is portfolio reference material.
- Do **not** recreate `.gemini/settings.json` (tool config, deliberately deleted, out of scope).
- Do **not** invent metrics, routes, or credentials in docs or code — the app's feature stories (`apps/web/src/data/stories.js`) and the router (`apps/web/src/router/index.tsx`) are the source of truth.

## 7. Environment gotchas (this machine)

- **pnpm**: run it as `C:\Program Files\nodejs\pnpm.CMD` (or the full path) — the `rtk` shell wrapper no-ops installs, so plain `pnpm install` through `rtk` silently does nothing.
- **Standalone dirs**: `mock-api` is not a workspace package. Installing its deps requires `pnpm --dir mock-api --ignore-workspace install` (it has its own `pnpm-lock.yaml`).
- **No local Docker**: this dev machine has no Docker daemon. Compose changes are verified by YAML parse (e.g. `node -e` with `yaml`) and careful review — not by `docker compose config`. Full container-level proof happens on the deploy target (acerblue).
- **Windows shell**: root scripts assume a POSIX-ish environment for `bash`-based scripts (`deploy:ops`); run those in Git Bash / WSL. `start-web-e2e.mjs` handles Windows (`pnpm.cmd`) automatically.
