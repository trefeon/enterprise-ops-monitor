# PRD — Portfolio Demo-First Conversion

Status: **In progress** · Owner: trefeon · Date: 2026-08-07

## 1. Goal

Convert `enterprise-ops-monitor` from a full-stack application (web + API + PostgreSQL)
into a **portfolio demo** that:

- shows the existing, fully-built dashboards as the deliverable,
- runs on **dummy data only** (existing `mock-api` with faker-generated records),
- deploys **light**: a web container + one tiny mock API container, **no PostgreSQL,
  no Sequelize API, no autoheal, no secrets required**,
- keeps the **real full-stack code in the repo as clearly-marked reference only**
  (visible on GitHub for credibility, never built or deployed by the default path).

The repo documentation suite is rebuilt from scratch for **AI-agent-driven
development**: every doc an agent needs to understand, run, extend, and verify this
project without asking a human.

## 2. Context (current state)

| Layer                                     | Today                                                                                   | Target                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Default `docker compose up`               | `docker-compose.yml` = api + web + **Postgres** + autoheal                              | `docker-compose.yml` = **web + mock-api only**                                        |
| Heavy compose                             | —                                                                                       | moved to `docker-compose.full.yml`, banner: _reference only, not deployed_            |
| `docker-compose.demo.yml` / `demo-db.yml` | redundant / semi-heavy                                                                  | **deleted** (folded into the two files above)                                         |
| `scripts/deploy-ops.sh`                   | modes `demo-db` / `prod`, remote preflight **requires** `DB_PASS` + `JWT_SECRET`        | default mode `demo` (no secrets needed); full-stack modes kept but gated as reference |
| `scripts/deploy.js` / `deploy-check.js`   | reference `docker-compose.demo.yml` etc.                                                | point at the new light default; prod path points at `docker-compose.full.yml`         |
| `.env.example`                            | DB/JWT/seed-first                                                                       | demo-first; real-stack vars in a commented "reference" block                          |
| Root docs                                 | **all deleted** (PRD, ARCHITECTURE, PORTFOLIO, RESEARCH, SECURITY_AUDIT, TODO, docs/\*) | full suite recreated (see §5)                                                         |
| `README.md`                               | **missing** (bad for portfolio)                                                         | portfolio-first README with screenshot, demo creds, quickstart                        |

Already in place (do not rebuild): `mock-api/server.js` (99 endpoints, faker data,
single `demo` / `demo123` account), demo login quick-select, `/about` portfolio page,
`isDemoMode` flag (`apps/web/src/lib/appMode.ts`, `VITE_APP_MODE=demo`), nginx
`/api` → `api:3000` proxy (satisfied by the mock-api network alias `api`),
`apps/web/nginx.conf`, web Dockerfile, `apps/api/AGENTS.md`.

## 3. User stories

1. As a **recruiter**, I open the live demo URL and land on a polished ops dashboard
   with realistic dummy data; a demo banner/credentials are obvious; login is
   `demo` / `demo123`.
2. As a **developer cloning the repo**, `docker compose up -d --build` boots the
   whole demo (web + mock-api) with **no .env, no DB, no secrets**.
3. As an **AI agent**, I read `AGENTS.md` + `docs/` and know exactly: what this
   project is, what is demo vs real, every command, every convention, and how to
   verify a change — without asking the human.
4. As the **author**, my GitHub repo still shows the real full-stack code
   (`apps/api`, migrations, RBAC, security work) as reference, and the docs explain
   that the deployed demo intentionally runs light.

## 4. Non-goals (out of scope)

- No deploy this round (user deploys later; target stays acerblue).
- No rewrite of the mock-api or the frontend data layer.
- No deletion of `apps/api`, `packages/`, or real-stack history.
- No new features; no UI redesign; no dependency upgrades.
- `.gemini/settings.json` is tool config, not a doc — not recreated.

## 5. Deliverables

### 5.1 Code/config changes

- `docker-compose.yml` → **light demo** (web + mock-api), copy of current
  `docker-compose.demo.yml` content (keep mock-api network alias `api` so
  nginx.conf works unchanged). Healthchecks retained.
- `docker-compose.full.yml` → current `docker-compose.yml` (api + web + Postgres +
  autoheal) with a large banner comment: _REAL FULL STACK — REFERENCE ONLY, NOT
  DEPLOYED FOR THE PORTFOLIO DEMO_.
- Delete `docker-compose.demo.yml` and `docker-compose.demo-db.yml`.
- `scripts/deploy-ops.sh`:
  - add `demo` mode (default): compose file `docker-compose.yml`, **skip**
    `DB_PASS`/`JWT_SECRET` preflight requirements (mock-api needs no secrets),
    wait for `eom-web` + `eom-mock-api` containers, run `deploy-check.js --demo`.
  - remove the old `demo-db` mode (its compose file is deleted); keep `prod`
    (reference full stack) with a loud warning that it deploys the reference
    stack; update mode validation + usage text.
- `scripts/deploy.js`: default + `--demo` → `docker-compose.yml`; `--prod` →
  `docker-compose.full.yml`; fix any stale compose file references.
- `scripts/deploy-check.js`: update container detection/checks to the light stack
  names (`eom-web`, `eom-mock-api`); prod branch → `docker-compose.full.yml`.
- `.env.example`: demo-first; DB/JWT/scheduler sections moved under a commented
  `# ─── REAL STACK (reference only) ───` block. Keep `VITE_API_URL`, support vars.
- `package.json`: `deploy` defaults to demo; `deploy:prod` explicitly names the
  reference full stack; add `demo:up` convenience; update `deploy:ops`/`deploy:ops:prod`
  script values to the new modes.
- Verify: `node -e` YAML parse of both compose files; `pnpm --filter web build`
  green; `pnpm --filter web typecheck` green; mock-api boots and serves
  `/api/auth/login` + a data endpoint locally; web e2e demo suite green.

### 5.2 Documentation suite (recreated)

| File                                    | Purpose                                                                                                                                                                                |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md` (root)                      | Portfolio-first entry: screenshot, one-liner, demo disclosure, demo creds, 2-command quickstart, tech stack (demo runtime + real stack reference), links to `docs/`                    |
| `AGENTS.md` (root)                      | The agent contract: project identity, demo-first stance, commands, architecture map (demo vs real), conventions, verification workflow, do/don't rules                                 |
| `docs/prd.md`                           | This file — product brief, stories, acceptance criteria                                                                                                                                |
| `docs/architecture.md`                  | Both architectures: deployed demo runtime (web → mock-api, nginx proxy) and real full stack (reference), repo layout, data flow, decision notes                                        |
| `docs/portfolio.md`                     | The portfolio story (recreate from the deleted `PORTFOLIO.md` content — all 18 documented feature surfaces — 17 story cards plus the Login screen — routes, metrics, technical notes)  |
| `docs/security.md`                      | Demo boundaries (no real data, no secrets, single demo account) + summary of the completed security remediation (media traversal, SQLi, tenant isolation, auth hardening) as reference |
| `docs/development.md`                   | Human + agent dev guide: run demo locally (dev server + mock-api), add a page, add a mock endpoint (faker patterns), run tests/e2e, build, deploy light, debug                         |
| `docs/research.md`                      | Concise research log: build-speed audit findings (zstd/BuildKit, slow layer export on acerblue), security audit outcomes, why demo-first                                               |
| `docs/adr/0001-portfolio-demo-first.md` | ADR: context, decision (demo default, real stack reference), alternatives (static Vercel export, full deletion), consequences                                                          |
| `TODO.md` (root)                        | This conversion's checkable task list (agent-driven development artifact)                                                                                                              |

All docs must be **accurate against the final code state** (scripts, commands,
container names, creds) — docs are written _after_ the code slice lands.

## 6. Acceptance criteria

1. `docker compose -f docker-compose.yml config -q` passes and shows only
   `web` + `mock-api` services; no Postgres, no api container, no env secrets.
2. `docker-compose.full.yml` exists, parses, and carries the "reference only" banner.
3. `deploy-ops.sh --mode demo` is the default; its remote preflight does not
   require `DB_PASS`/`JWT_SECRET`; `--help` documents all modes.
4. `pnpm --filter web typecheck` and `pnpm --filter web build` are green.
5. Mock-api boots standalone (`node mock-api/server.js`) and serves
   `POST /api/auth/login` (demo/demo123) + `GET /api/dashboard/summary`.
6. Web demo e2e suite (`pnpm test:e2e:demo`) is green against mock-api.
7. `README.md`, `AGENTS.md`, and all `docs/*` exist, are internally consistent,
   and every command/path/cred they mention works as documented.
8. No reference to deleted compose files remains anywhere in scripts or docs
   (grep for `docker-compose.demo` returns nothing).
9. Real stack untouched: `apps/api`, `packages/`, git history intact.

## 7. Risks / notes

- No local Docker on the dev machine → compose verified via YAML parse + config
  review; full container-level proof happens when the user deploys to acerblue.
- The old docs were deleted in the working tree (unstaged); recreating them will
  show as modifications in git — expected.
- `apps/api/AGENTS.md` already exists and stays (real-stack agent doc).
