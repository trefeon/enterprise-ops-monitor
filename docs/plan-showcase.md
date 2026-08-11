> **Superseded by [docs/roadmap.md](roadmap.md)** (2026-08-11). Phases A/B/C/E landed; Phase D continues as roadmap task R3. Retained for the Cloudflare/deploy recon in §Phase D, which R3 depends on.

# PLAN — Portfolio Showcase Completion (Phase 4)

**Date:** 2026-08-08 · **Status:** Plan — awaiting decisions
**Prereq:** Phase 1–3 complete (demo-first deploy path ✅, docs suite ✅, e2e gate ✅ — see `TODO.md`)

## 1. Context & goal

This repo already works as a demo: `docker compose up -d --build` boots a zero-config
web + mock-api, all 18 feature surfaces read real mock endpoints, 101 e2e tests pass,
and a full docs suite exists. What is missing is the **portfolio layer** — the things a
recruiter or reviewer actually sees when they open the GitHub repo or click a live URL.

**Goal:** turn the working demo into a *job-getting* showcase, without a heavy build.
The demo deliberately uses a **different tech stack** than the original intern-era system
(React 19 + Vite + TypeScript + Tailwind + shadcn + Express mock — no reuse of the old
stack, no real data, no employer IP). Everything below is light-touch polish +
deployment; no new features, no database, no real-stack changes.

**Guiding constraints (from the owner):**
- Light build only — no heavy infra, no new subsystems.
- Never the real system's tech stack, code, or data.
- The app *represents* internship-era ops work but must stay 100% simulated.
- `apps/api` stays reference-only. Nothing here touches it.

## 2. What exists today (verified 2026-08-08)

| Item | State |
| --- | --- |
| Demo runtime (web + mock-api, docker compose, zero config) | ✅ done |
| 18 feature surfaces, all reading `mock-api` via `src/lib/api/` | ✅ done |
| e2e demo suite (Playwright, pre-authed via `playwright/.auth/demo-user.json`) | ✅ 101 passing |
| Docs suite (README, AGENTS.md, architecture, portfolio, security, development, research, ADR) | ✅ done |
| `pnpm check:all` | ✅ green |
| Screenshots | ⚠️ only 1 (login smoke) |
| CI (GitHub Actions) | ❌ none |
| Public live-demo URL | ❌ none (acerblue is internal) |
| "Intern origin story" in README/docs/app | ❌ missing |
| Deterministic demo data (seeded faker) | ❌ random each boot |
| Legal sweep (real brand/host/credential strings) | ⚠️ clean in code, no sweep recorded |

## 3. Work phases (each with acceptance criteria)

### Phase A — Portfolio story: "this represents my internship work"

The core narrative that answers the recruiter's first question: *why does this exist?*

1. **Write the origin story** — a short, honest block (≈80–120 words) to be embedded in
   README, `docs/portfolio.md`, and the in-app Case Study/About/Landing pages:
   - Worked in retail operations IT (internship-era), where nightly EOD uploads, store
     sync health, backups, and access control were daily realities.
   - That system is internal/confidential → cannot be shown → this app is a **from-scratch
     rebuild on a modern stack with fully simulated data**, modeling the same domain.
   - No employer name, no real data, no original code/tech reused.
2. **Apply it everywhere it counts** (single source in `apps/web/src/data/stories.js`
   `projectStory`, mirrored in README + `docs/portfolio.md`):
   - `README.md` — origin paragraph under the title, before Quickstart.
   - `docs/portfolio.md` — new "Project origin" section.
   - In-app: `Landing`, `CaseStudy`, `About` pages render the new fields.
3. **Wording guardrails** (legal): avoid "converted/ported the real app" (implies copying
   employer code); prefer "domain-inspired rebuild, original code, simulated data".

*Accept: origin story visible on landing + case study pages, README, portfolio.md; no
employer/brand/real-metric references anywhere.*

### Phase B — Visual proof (screenshots + optional GIF)

Recruiters decide in seconds from images; the README currently has one login screenshot.

1. **`scripts/capture-screenshots.mjs`** — Playwright script that reuses the existing e2e
   bootstrap (boot mock-api :4000 + web :5182, pre-auth from `playwright/.auth/demo-user.json`).
2. **Capture ≈10 surfaces** into `docs/screenshots/` (PNG, 1440px):
   login · dashboard · store sync · EOD monitor · store directory · employee directory ·
   backups · system health · accounts · roles · after-hours · agent updater · live wallboard.
3. **Wire into README**: hero image + a compact feature gallery (3–6 key shots with
   captions) + link to the full gallery in `docs/portfolio.md`.
4. **Optional (decide):** 20–30 s animated walkthrough (Playwright video → GIF/MP4) for
   the README hero. Adds wow factor; costs one script run.

*Accept: script committed, screenshots committed under `docs/screenshots/`, README shows
the gallery, script re-runnable with one command.*

### Phase C — Deterministic demo data

Today every boot randomizes all faker data, so a screenshot or a live demo never matches
the docs, and "which stores are late" changes every visit.

1. **Seed faker at mock-api boot** (`faker.seed(...)` + regenerate `MOCK_*` arrays from
   the seed; keep an optional `DEMO_SEED` env override).
2. **Anchor the demo day** so EOD/after-hours data is believable on any real date
   (relative-day generation instead of fixed dates — no hardcoded dates).
3. Re-run e2e — assertions are structural (existing suite passes with random data, so
   seeding is expected safe; fix any test that depended on randomness).

*Accept: two consecutive boots show identical data; e2e suite still green; `DEMO_SEED`
documented in `.env.example`.*

### Phase D — Public live demo (the biggest gap) — DEFERRED by owner (2026-08-08)

A recruiter should click one link, not run Docker.

**Status:** Owner paused deployment until the UI is audited/approved ("check and audit UI
things first later"). The tunnel hostname will be set up manually by the owner afterwards.
Recon findings (ready to resume):

- acerblue is publicly reachable via Cloudflare tunnel (`acerblue.lmntea.fun`, zone
  `lmntea.fun`), tunnel is **remote-managed** (runs with `--token`, no local config) →
  adding the public hostname is a Cloudflare dashboard step: tunnel → Public Hostnames →
  add `<subdomain>.lmntea.fun` → `http://localhost:5173`.
- `scripts/deploy-ops.sh --host acerblue --mode demo` is the deploy path (git-based:
  clean worktree + pushed SHA; remote preflight; `deploy-check.js --demo` smoke).
- No single-service Dockerfile needed — the existing compose demo (web :5173 + mock-api)
  is the deployment unit.

**Resume checklist (when owner approves):**
1. `bash scripts/deploy-ops.sh --host acerblue --dir /home/trefeon/dev-portfolio/enterprise-ops-monitor --mode demo`
2. Owner adds public hostname in Cloudflare dashboard → `http://localhost:5173`
3. Smoke from outside: `/api/system/health`, login, 5 surfaces, exports.
4. Add live-demo link + badge to README.

### Phase E — CI + repo polish (credibility layer)

1. **GitHub Actions** `.github/workflows/ci.yml`: pnpm setup → `lint` + `typecheck` +
   `build` + unit tests, then Playwright e2e demo (install browsers, boot mock+web).
   Green badge in README.
2. **README refresh**: badges (CI, license), live-demo link, screenshot gallery (Phase B),
   origin story (Phase A), "Skills demonstrated" section (React/TS/Tailwind/shadcn, API
   design, RBAC modeling, testing, Docker/CI), "What I built vs. what's reference" note.
3. **Repo hygiene**: add `playwright-report/`, `test-results/` to `.gitignore`;
   set GitHub repo description + topics; decide license (recommend MIT); optional
   `SECURITY.md` one-liner pointing at `docs/security.md`.

*Accept: CI green on push; README is a complete self-serve pitch; repo page shows
description/topics; no build/test artifacts tracked.*

### Phase F — Final verification & close-out

1. `pnpm check:all` + `pnpm test:e2e:demo` green on the finished tree.
2. Screenshot script re-run → images match docs claims.
3. Deployed URL smoke-checked (login → 5 surfaces → exports).
4. Docs updated: `docs/development.md` (screenshot/CI/deploy-to-host sections),
   `docs/research.md` entry, ADR for the public-deploy decision.
5. Memory/close-out notes saved to engram.

## 4. Decisions — RESOLVED (2026-08-08)

| # | Decision | Owner's pick |
| --- | --- | --- |
| D1 | Public demo host | **acerblue (own server)** — deploy the demo to acerblue and expose it publicly. ⚠️ Precondition: acerblue must be publicly reachable (public IP/domain, port 80/443 forwarding, or Cloudflare Tunnel). Verify reachability first; if not publicly reachable, expose via Cloudflare Tunnel (free) as fallback. |
| D2 | Origin-story wording | **(a) Explicit + safe** — "built during retail-ops internship-era IT work; the real system is internal so it can't be shown; this is a from-scratch rebuild on a modern stack with 100% simulated data." No employer name, no original code/stack reused. |
| D3 | Walkthrough media | **Screenshots + GIF** — ~10 PNG surfaces + one ~20–30 s animated walkthrough GIF for the README hero. |
| D4 | License | **MIT** — add LICENSE file; reference in README + repo metadata. |

## 5. Out of scope (keep the build light)

- No new features or feature surfaces.
- No changes to `apps/api`, `packages/`, or the real-stack reference.
- No database, no auth providers, no secrets, no `.env` requirements.
- No mobile/accessibility overhaul (desktop ops tool; only if a surface is visibly broken).
- No reuse of the original system's stack, code, or data — by design.

## 6. Effort estimate (implementor slices)

| Phase | Size | Slices |
| --- | --- | --- |
| A — Story | S | 1 (docs + stories.js + pages) |
| B — Screenshots | S | 1 (script + capture + README) |
| C — Deterministic data | M | 1 (mock-api seeding + e2e re-run) |
| D — Public demo | M | 1–2 (Dockerfile + deploy + smoke) |
| E — CI + polish | S | 1 (workflow + README + hygiene) |
| F — Verify | — | 1 verifier pass + close-out |

Order: **A → B → C → D → E → F** (A unlocks the pitch, D is the long pole, E can
overlap with D's smoke wait).
