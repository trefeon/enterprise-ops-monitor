> **COMPLETE — historical record.** This tracked the finished demo-first conversion. Active work lives in [docs/roadmap.md](docs/roadmap.md).

# TODO — Portfolio Demo-First Conversion

Checkable task list for the conversion. **Status: ALL COMPLETE (2026-08-07) — Slice A (deploy path), Slice B (docs suite), e2e gate, and final verifier pass are all done.**

## Phase 1 — Deploy path (code/config)

- [x] **C1. `docker-compose.yml` becomes the light demo** (web + mock-api + mock-api
      network alias `api`; healthchecks; no DB, no secrets)
      _Accept: YAML parses; file has only `web` + `mock-api` services._ — ✅ verified
- [x] **C2. Create `docker-compose.full.yml`** from the old `docker-compose.yml`
      (api + web + Postgres + autoheal) with a loud _REAL FULL STACK — REFERENCE
      ONLY, NOT DEPLOYED_ banner.
      _Accept: YAML parses; banner present at top._ — ✅ verified
- [x] **C3. Delete `docker-compose.demo.yml` and `docker-compose.demo-db.yml`**
      _Accept: files gone; grep for `docker-compose.demo` returns nothing except planning docs._ — ✅ verified
- [x] **C4. `scripts/deploy-ops.sh`**: `demo` mode is the default (skips
      DB*PASS/JWT_SECRET preflight, targets `docker-compose.yml`, waits on
      `eom-web` + `eom-mock-api`); `prod` kept as reference with loud warnings;
      the old `demo-db` mode was REMOVED (its compose file is gone).
      \_Accept: `--help` documents `demo|prod`; demo path has no secret checks.* — ✅ verified
- [x] **C5. `scripts/deploy.js`**: default demo → `docker-compose.yml`; `--prod` →
      `docker-compose.full.yml`; stale compose references removed.
      _Accept: no `docker-compose.demo` reference; `--prod` names full.yml._ — ✅ verified
- [x] **C6. `scripts/deploy-check.js`**: container detection + checks target the
      light stack (`eom-web`, `eom-mock-api`); prod branch → `full.yml`.
      _Accept: `--demo` path references only light services._ — ✅ verified
- [x] **C7. `.env.example`** demo-first; real-stack vars in a commented reference
      block; VITE*\* + support vars kept.
      \_Accept: demo quickstart needs zero edits.* — ✅ verified
- [x] **C8. `package.json`**: `deploy` → demo default, `deploy:prod` → full
      reference, `demo:up` added; `deploy:ops*` script modes fixed.
      _Accept: scripts reference existing files only._ — ✅ verified

## Phase 2 — Docs suite

- [x] **D1. `README.md`** (root, portfolio-first) — screenshot ok, `demo`/`demo123`, quickstart, docs links
- [x] **D2. `AGENTS.md`** (root, agent contract)
- [x] **D3. `docs/architecture.md`** (demo runtime + real stack reference + repo layout)
- [x] **D4. `docs/portfolio.md`** (18 feature surfaces, routes, metrics — restored)
- [x] **D5. `docs/security.md`** (demo boundaries + remediation summary)
- [x] **D6. `docs/development.md`** (run/add-page/add-mock-endpoint/test/deploy guide)
- [x] **D7. `docs/research.md`** (build-speed + security audit findings log)
- [x] **D8. `docs/adr/0001-portfolio-demo-first.md`** (decision record)
- [x] **D9. `TODO.md`** this file, marked complete

## Phase 3 — Verify (final verifier pass: PASSED with findings, findings fixed)

- [x] **V1. Compose YAML**: `node -e`/yaml parse of both compose files (docker not installed; YAML-level only)
- [x] **V2. Web checks**: `pnpm --filter web typecheck` + `build` green
- [x] **V3. Mock-api boots**: login demo/demo123 + dashboard summary respond ok
- [x] **V4. Web e2e demo**: `pnpm test:e2e:demo` — **101 passed**
- [x] **V5. Grep audit**: no stale `docker-compose.demo` refs outside planning docs (TODO.md, docs/prd.md)
- [x] **V6. Real stack untouched**: `apps/api`, `packages/` unmodified
- [x] **Bonus**: `pnpm check:all` green (lint warnings only — pre-existing `no-console`); verifier's 3 findings fixed (prd.md 16→18 surfaces, demo-db mode wording, AuthProvider comment)

## Out of scope

- Deploying anywhere (user deploys later to acerblue).
- Deleting real-stack code or git history.
- `.gemini/settings.json` recreation.
