# ADR 0001 — Portfolio Demo-First

- **Status:** Accepted
- **Date:** 2026-08-07
- **Deciders:** trefeon (project owner)
- **Related docs:** [docs/prd.md](../prd.md), [docs/architecture.md](../architecture.md), [docs/research.md](../research.md)

## Context

`enterprise-ops-monitor` started as a full-stack operations application: a React dashboard backed by an Express + Sequelize API and PostgreSQL, with schedulers, backups, autoheal, JWT auth, and RBAC. It is now a **portfolio demo**: the deliverable is the dashboard itself, shown to recruiters as a live, explorable product.

The original deploy path was heavy:

- A full `docker compose up -d --build` took **40+ minutes** on the deploy target (acerblue, slow HDD) — see `docs/research.md` for the timed breakdown.
- It required a running PostgreSQL, an external data volume, `DB_PASS` and `JWT_SECRET`, seeds, migrations, and backups — meaningful operational burden for something whose purpose is to be looked at.
- Anyone cloning the repo had to perform multi-step setup before seeing a single screen.

At the same time, the repo already contained a complete, working demo backend: `mock-api` (Express + faker, ~95 endpoints, single `demo` / `demo123` account, in-memory sessions) plus an in-app portfolio layer (About page, feature stories, demo disclosure, `isDemoMode` flag, nginx `/api` proxy satisfied by the mock-api network alias `api`). The full-stack code was valuable for credibility, but it was not needed to show the product.

## Decision

**The default — and only deployable — path is the light portfolio demo:**

- `docker-compose.yml` = **web (nginx SPA) + mock-api only**. `docker compose up -d --build` boots the whole demo with **zero configuration: no `.env`, no database, no secrets**.
- All data is **simulated or anonymized** (faker-generated, in-memory sessions; restart = reset). The single account is `demo` / `demo123`.
- The real full stack (`apps/api`, Express + Sequelize + PostgreSQL + autoheal) stays in the repository — visibly, in `docker-compose.full.yml`, with a loud **"REAL FULL STACK — REFERENCE ONLY, NOT DEPLOYED FOR THE PORTFOLIO DEMO"** banner — but it is **never built or deployed by the default path**.
- Deploy tooling defaults to the demo: `scripts/deploy-ops.sh --mode demo` (no `DB_PASS`/`JWT_SECRET` preflight), `scripts/deploy.js` defaults to `docker-compose.yml`, `deploy-check.js` verifies the light stack (`eom-web` + `eom-mock-api`).
- The documentation suite (README, AGENTS.md, docs/) is rebuilt around this stance so humans and AI agents share one consistent model of the project.

## Alternatives considered

1. **Static Vercel export with in-app mocks (rejected).** Host the SPA on a static platform with frontend-only mock data. Rejected because it is a larger rewrite (data layer, auth flow, exports), loses the same-origin `/api` reverse-proxy story (a meaningful piece of the architecture being shown), and abandons the existing, working mock API and Docker Compose narrative.
2. **Delete the real stack (rejected).** Removing `apps/api`, `packages/`, migrations, and git history would kill the portfolio's credibility — the RBAC, security remediation, migrations, and multi-tenant work is exactly what demonstrates production-level engineering. The cost of keeping it is near zero because the demo never builds it.
3. **Keep the full stack as the default (rejected).** 40+ minute builds, Postgres operational burden, and secret requirements on every clone and deploy — the opposite of the "clone, up, explore" experience the demo must provide.
4. **Hybrid: keep both defaults (rejected).** Two default paths create ambiguity in tooling, docs, and agent behavior; the demo is now unambiguously the default, with prod clearly gated as reference.

## Consequences

**Positive:**

- Recruiters and reviewers go from clone to a polished, populated dashboard in two commands, with visible demo credentials and an in-app disclosure.
- AI agents and humans share a single mental model: demo-first, reference stack clearly labeled.
- The full-stack code remains in the repo, intact and documented, as portfolio evidence.
- Deploys are light: two containers, no secrets, an SSH target is the only requirement; repeat builds are fast (BuildKit zstd + cache mounts).

**Negative / trade-offs:**

- The demo does not exercise the real API, database, or auth code at runtime — those are visible only in source. The demo's auth flow (mock token, in-memory session) is a simulation.
- Anyone wanting the real stack must opt into `docker-compose.full.yml` and provide `DB_PASS` + `JWT_SECRET`; that path is gated and warning-laden by design.
- The mock API and the reference API can drift from each other; `mock-api` is the contract the demo UI actually consumes, so feature work on the demo happens there (AGENTS.md conventions keep this explicit).

## Follow-ups

- Deploy the demo to acerblue (`bash scripts/deploy-ops.sh --host acerblue --mode demo`) once the user initiates it.
- Keep `docs/` consistent with code as it evolves; TODO.md tracks the remaining conversion verification items.
