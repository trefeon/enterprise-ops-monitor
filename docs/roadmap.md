# ROADMAP — Enterprise Ops Monitor

**Created:** 2026-08-11 · **Status:** Active · **Owner:** trefeon
**Audience:** an AI agent executing tasks **one by one**, top to bottom.
**Supersedes:** `docs/plan-showcase.md` (Phases A/B/C/E landed; Phase D carried forward here as R3).

---

## 0. How to use this file

This is an **execution roadmap**, not a discussion doc. Each task is a self-contained unit
with an ID, a precondition, exact steps, and a binary acceptance test.

**Rules for the executing agent:**

1. Work tasks in ID order (`R0.1`, `R0.2`, `R1.1`, …). Do not skip ahead.
2. Before starting a task, verify its **Precondition**. If it fails, stop and report.
3. A task is done only when its **Accept** check passes with real command output — never
   by assertion. Paste the command and its result.
4. Tick the checkbox in this file and commit the tick with the work.
5. Tasks marked **🔒 OWNER-GATED** require a human action (dashboard, DNS, GitHub settings).
   The agent prepares everything, then stops and reports exactly what the owner must do.
6. Respect `AGENTS.md` §6 Do/Don't at all times. The demo must stay zero-config: no `.env`,
   no database, no secrets.
7. One commit per task (or per release group), message style: `type: short description`
   matching existing history (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).

**Verification bar (from `AGENTS.md` §5):**

```bash
pnpm typecheck          # TS clean
pnpm build              # production build
pnpm check:all          # lint + typecheck + format:check + test
pnpm test:e2e:demo      # Playwright, boots mock-api :4000 + web :5182
```

**Environment gotchas (this machine):** no Docker daemon → compose changes are verified by
YAML parse + review, never `docker compose config`. Use the full pnpm path
(`C:\Program Files\nodejs\pnpm.CMD`) — the `rtk` wrapper no-ops installs. `mock-api` is
standalone: `pnpm --dir mock-api --ignore-workspace install`.

---

## 1. Where the project stands (verified 2026-08-11)

| Layer                                                                                      | State                          | Evidence                                                  |
| ------------------------------------------------------------------------------------------ | ------------------------------ | --------------------------------------------------------- |
| Demo runtime (web + mock-api, zero config)                                                 | ✅ done                        | `docker-compose.yml`, 99 mock endpoints                   |
| 25 page surfaces (24 routed + 1 unrouted remnant), all reading mock-api via `src/lib/api/` | ✅ done                        | `apps/web/src/pages/`                                     |
| Docs suite (README, AGENTS, architecture, portfolio, security, development, research, ADR) | ✅ done                        | `docs/`                                                   |
| Origin story (Phase A)                                                                     | ✅ done                        | commit `c95c016`, README §"Why this project exists"       |
| Deterministic demo data (Phase C)                                                          | ✅ done                        | commit `81d40dd`, `DEMO_SEED=20260808`                    |
| Screenshots + walkthrough GIF (Phase B)                                                    | ✅ done                        | 14 PNG + `walkthrough.gif` in `docs/screenshots/`         |
| CI + LICENSE + badges (Phase E)                                                            | ✅ done                        | `.github/workflows/ci.yml`, MIT `LICENSE`                 |
| e2e suite                                                                                  | ✅ 101 passing (last full run) | `pnpm test:e2e:demo`                                      |
| **Public live demo URL**                                                                   | ❌ **missing**                 | biggest remaining gap → **R3**                            |
| **UI audit report**                                                                        | ⚠️ **stale + partly wrong**    | archived → `docs/archive/ui-audit-2026-07-08.md` → **R2** |
| Uncommitted `.gitignore` (reference/ hygiene)                                              | ⚠️ dirty tree                  | `git status` → **R0.1**                                   |
| GitHub repo metadata (description, topics)                                                 | ❌ missing                     | → **R4.1**                                                |

### 1.1 Critical finding — the UI audit is stale

`docs/archive/ui-audit-2026-07-08.md` (archived by R1.2 from `apps/web/src/docs/`) is dated
**2026-07-08**, which predates commit
`761357e` ("full Supabase design system migration"). Re-verified against the current tree:

| Audit claim                              | Reality today                                                                                | Verdict                                 |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------- |
| `rounded-xl` / `rounded-2xl` in 13 files | **0 occurrences in code** (only inside the audit file itself)                                | ✅ already fixed                        |
| Geist `--ds-*` token system              | **0 occurrences in code** — migrated to Supabase tokens (105 CSS vars in `index.css`)        | ❌ audit describes a dead design system |
| `text-3xs` "arbitrary value" in 26 files | **`text-3xs` is a defined token** — `tailwind.config.js:89` → `['10px', {lineHeight:'1.4'}]` | ❌ false positive                       |
| `shadow-[...]` in 5 files                | **1 file** remaining                                                                         | ⚠️ mostly fixed                         |
| `text-[9px]` / `[10px]` / `[11px]`       | **4 files** remaining                                                                        | ⚠️ partly fixed                         |

**Consequence:** do **not** execute the audit's "Priority Actions" as written — most are
already done or were never real. **R2** re-runs the audit against the real token system.

---

## 2. Release goals

| Goal                      | Definition of done                                                            |
| ------------------------- | ----------------------------------------------------------------------------- |
| **G1 — Clean tree**       | No uncommitted hygiene work; `reference/` never leaks into the public repo    |
| **G2 — Honest docs**      | Every doc claim is verifiable against code; no stale design-system references |
| **G3 — Live demo**        | A recruiter clicks one public URL and reaches the dashboard                   |
| **G4 — Repo credibility** | CI green, metadata set, license visible, one-glance pitch on the GitHub page  |
| **G5 — Proven**           | `pnpm check:all` + `pnpm test:e2e:demo` green on the final tree               |

---

## 3. Execution roadmap

### R0 — Housekeeping (blocking, do first)

- [x] **R0.1 — Commit the `.gitignore` hygiene change**
  - **Why:** the working tree carries an uncommitted `.gitignore` adding `reference/` and
    secret patterns (`*.pfx`, `*.p12`, `*.cer`, `*.pem`, `*.key`, `*.jks`). This repo is
    **public** and `reference/` holds the real internal project (nested `.git`, TLS certs,
    74 MB agent binaries). Until committed, a careless `git add -A` could expose it.
  - **Precondition:** `git status` shows ` M .gitignore`.
  - **Steps:**
    1. `git diff .gitignore` — confirm only the `reference/` + secret patterns are added.
    2. Confirm nothing from `reference/` is tracked: `git ls-files reference | Measure-Object`
       must return **0**.
    3. Commit: `chore: ignore reference/ and secret file patterns for public repo`.
  - **Accept:** `git status --porcelain` is empty; `git ls-files reference` returns nothing;
    `git check-ignore -v reference/DashITops` confirms the rule matches.
  - **Risk — pre-verified 2026-08-11 ✅:** if `reference/` had ever been committed,
    `.gitignore` alone would NOT remove it. Checked: `git log --all --oneline -- reference`
    returns **empty** and `git ls-files reference` returns **0** → the directory was never
    tracked, so no history rewrite is needed. Re-confirm both before committing; if either
    is non-empty, **stop and escalate** — history rewrite is an owner decision.

- [x] **R0.2 — Establish the green baseline**
  - **Baseline recorded 2026-08-11:** `pnpm check:all` green (lint 0 errors, typecheck clean,
    format clean, 185 tests: api 176 pass / web 9 pass); `pnpm test:e2e:demo` **101 passed**
    (56.8 s). Baseline is green — proceed to R1.
  - **Why:** every later task is measured against a known-good starting point.
  - **Steps:** run `pnpm check:all`, then `pnpm test:e2e:demo`.
  - **Accept:** both green. Record the e2e pass count in this file under R0.2 as the
    baseline (expected ~101). If anything fails, fix it **before** any R1+ work and log the
    fix as `R0.2-fix` — do not carry a red baseline forward.

---

### R1 — Documentation truth pass

- [x] **R1.1 — Reconcile the feature-surface count**
  - **Why:** the count "18 feature surfaces" is **correct but unexplained** — it is the 17
    `featureStories` entries in `apps/web/src/data/stories.js` plus the Login screen, which is a
    showcased route with no story card. The gap to the **25 directories** in `apps/web/src/pages/`
    (26 before R1.5 deleted the dead About page) is what needs stating: 25 = 18 documented +
    6 routed-but-undocumented (Landing, Pricing, Signup, Starter, Live TV Display, Live Menu
    Dashboard) + 1 unrouted remnant (Billing, kept by decision).
    A recruiter who counts is a recruiter who stops trusting the doc.
  - **Steps:**
    1. Enumerate `apps/web/src/pages/` and classify each: _feature surface_ (an operational
       tool behind auth) vs _portfolio/marketing page_ (Landing, Pricing, CaseStudy, About,
       Login, Signup, Starter) vs _sub-route_.
    2. Pick the honest number and define it in one sentence.
    3. Propagate that single number + definition to: `README.md`, `docs/portfolio.md`,
       `docs/prd.md`, `apps/web/src/data/stories.js`.
  - **Accept:** `rg -n "18 feature|18 surfaces|26 feature" README.md docs/ apps/web/src` returns
    only the reconciled wording; the count matches an actual directory listing.
  - **Done 2026-08-11:** one reconciled sentence — "18 documented feature surfaces (17 story
    cards + the Login screen) across 24 routed page components of 25 in `apps/web/src/pages/`" —
    now in README §Feature highlights and `docs/portfolio.md` §Feature catalog; the definition
    (18 = 17 story cards + Login; 25 dirs = 18 + 6 routed-undocumented + 1 unrouted remnant
    `Billing/`) propagates to `docs/prd.md`; `stories.js` carries no count comment (unchanged);
    mock endpoint count 99 already stated in README §Skills demonstrated + §Tech stack.

- [x] **R1.2 — Retire or rewrite the stale UI audit**
  - **Why:** §1.1 — the report documents a design system (Geist `--ds-*`) that no longer
    exists, and flags a legitimate token (`text-3xs`) as a violation. Leaving it in the repo
    is worse than deleting it: a reviewer reads it as current.
  - **Decision (agent's call, then state it):** either
    **(a)** move it to `docs/archive/ui-audit-2026-07-08.md` with a header
    `> ARCHIVED — describes the pre-Supabase Geist token system, superseded by the migration
in 761357e`, or **(b)** delete it and let R2 produce the replacement.
    **Recommended: (a)** — it shows audit rigor as portfolio evidence.
  - **Steps:** move/annotate; remove any inbound links; note the change in `docs/research.md`.
  - **Accept:** no file in the repo presents `--ds-*` tokens or `rounded-xl` findings as
    current; `rg -l "\-\-ds-" apps/web/src` returns nothing outside the archived file.
  - **Done 2026-08-11 (option a):** audit moved to `docs/archive/ui-audit-2026-07-08.md` with an
    `ARCHIVED — DO NOT ACT` banner; the only inbound links are this roadmap's own R2 tracking
    lines; `rg -l -- "--ds-" apps/web/src` returns **nothing**; noted in `docs/research.md` §(d).

- [ ] **R1.3 — Mark `docs/plan-showcase.md` as superseded**
  - **Why:** two competing plan docs confuse the next agent.
  - **Steps:** add at the top: `> **Superseded by [docs/roadmap.md](roadmap.md)** (2026-08-11).
Phases A/B/C/E landed; Phase D continues as roadmap task R3.` Keep the file (it holds the
    Cloudflare recon that R3 depends on).
  - **Accept:** header present; `docs/roadmap.md` is the only doc describing _active_ work.

- [x] **R1.4 — Refresh `TODO.md` or fold it into this roadmap**
  - **Why:** `TODO.md` is 100% complete and scoped to a finished conversion; as the root-level
    task file it now misleads.
  - **Steps:** either add `> COMPLETE — historical record. Active work: docs/roadmap.md` or
    replace its contents with a pointer. Update the `README.md` repo-layout line that
    describes `TODO.md`.
  - **Accept:** root `TODO.md` cannot be mistaken for the active task list.
  - **Done 2026-08-11:** already satisfied in commit `52e59cf` — `TODO.md` carries the
    `> **COMPLETE — historical record** … Active work lives in docs/roadmap.md` header and the
    README §Repository layout line reads `# historical: the finished demo-first conversion
(active roadmap: docs/roadmap.md)`. Verified, no edit needed.

- [x] **R1.5 — Remove or route the two dead page components**
  - **Why:** `apps/web/src/pages/Billing/` and `apps/web/src/pages/About/` are never imported or
    routed (verified 2026-08-11 against `apps/web/src/router/index.tsx` + a repo-wide import scan).
    Dead code in a portfolio repo reads as abandoned work to a reviewer.
  - **Decision (2026-08-11, owner):** delete **About only** — it is genuinely superseded by
    `/case-study` (the legacy `/about` route already redirects there). **Billing stays** in the
    tree as a documented unrouted refactor remnant (multi-tenant SaaS direction, out of the demo
    scope) — this supersedes the "delete both" recommendation below.
  - **Steps:** confirm zero inbound imports, delete the directories, run `pnpm check:all` +
    `pnpm build`, then `pnpm test:e2e:demo`.
  - **Accept:** `rg -l "pages/(About|Billing)" apps/web/src` returns nothing; all checks green.
  - **As executed:** `rg -l "pages/About" apps/web/src` → nothing; `apps/web/src/pages/About/`
    deleted; Billing intentionally kept, so the combined `pages/(About|Billing)` pattern no
    longer applies; e2e "About legacy redirect resolves safely" still green (`/about` →
    `/case-study` is a router-only `<Navigate>`, no component import).
  - **Note:** this is a CODE change, not doc work — it is deliberately separated from R1's doc pass.

---

### R2 — UI/UX audit, redone against the real design system

> This replaces the stale audit. Scope is **audit + targeted fixes only** — no redesign,
> no new features, no dependency changes.

- [x] **R2.1 — Re-audit against the current Supabase token system**
  - **Done 2026-08-11:** `docs/ui-audit.md` written (118 CSS vars + tailwind extend as token
    source of truth; 11 findings: F6 combobox v4-syntax-on-v3 MEDIUM, F3 `min-w-[220px]` x3
    MEDIUM, F1/F2/F4/F5/F7–F11 LOW, zero HIGH; raw-hex scan clean; contrast spot-check passes
    AA). Supersedes the archived 2026-07-08 audit.
  - **Precondition:** R1.2 done (old report archived).
  - **Steps:**
    1. Extract the real token vocabulary: all custom properties in `apps/web/src/index.css`
       (~105) and the `theme.extend` entries in `apps/web/tailwind.config.js`
       (`fontSize.3xs`, `letterSpacing.widest-lg`, etc.). **These are the standard** — a
       utility backed by a config token is compliant, not a violation.
    2. Scan `apps/web/src` for genuine deviations only:
       - arbitrary values with **no** token equivalent: `text-[Npx]` (4 files),
         `shadow-[...]` (1 file), stray `min-w-[…]` / `max-w-[…]` / `h-[…]`,
       - raw hex colors outside SVG brand marks and chart config,
       - radii outside the configured scale,
       - contrast risks: `text-muted-foreground` on `bg-muted` / `bg-muted/50` in **body**
         text (decorative icons are out of scope).
    3. Write `docs/ui-audit.md` (repo-level, not buried in `src/docs/`) with: date, token
       vocabulary reference, findings table (file · line · issue · severity · fix), and an
       explicit "checked and clean" list so the absence of findings is evidence, not silence.
  - **Accept:** every finding cites a real file:line that `rg` reproduces; every "violation"
    is checked against `tailwind.config.js` first to rule out false positives; the report
    states the token source of truth.
  - **Delegation note:** dispatch as one `implementor` slice (audit is read + write-one-doc),
    or `designer` if judgment on the token system is needed. Do **not** fan out — findings
    must come from one consistent standard.

- [ ] **R2.2 — Fix the confirmed findings**
  - **Precondition:** R2.1 report exists and is reviewed.
  - **Steps:** fix only **HIGH** and **MEDIUM** findings from R2.1. Replace arbitrary values
    with tokens; if a value has no token and is used 3+ times, **add the token** to
    `tailwind.config.js` rather than scattering arbitrary values. Leave LOW items listed as
    known/accepted in the report.
  - **Accept:** `pnpm check:all` green; `pnpm test:e2e:demo` green; `pnpm screenshots`
    re-run shows no visual regression vs the committed PNGs (compare by eye, note diffs).
  - **Guard:** if a fix changes layout, re-capture screenshots (R2.3) — the README gallery
    must never show a UI that no longer exists.

- [ ] **R2.3 — Re-capture screenshots if the UI changed**
  - **Precondition:** R2.2 changed anything visible.
  - **Steps:** `pnpm screenshots` (boots mock-api :4000 + web :5182, 1440×900, 14 PNGs +
    walkthrough GIF into `docs/screenshots/`). Verify the `.gitignore` negation for
    `docs/screenshots` still lets PNGs through (root `*.png` rule is overridden there).
  - **Accept:** `git status` shows the updated images as tracked changes; README gallery
    images render; GIF plays.

- [ ] **R2.4 — Accessibility spot-check (bounded)**
  - **Why:** `web-design-guidelines` compliance is a credibility signal; a full WCAG program
    is out of scope for a desktop ops demo.
  - **Steps:** on **5 surfaces** (Login, Dashboard, EOD Monitor, Roles, After Hours) check:
    keyboard reachability of primary actions, visible focus ring, `aria-label` on icon-only
    buttons, table header semantics, and contrast of body text (not decorative icons).
  - **Accept:** findings appended to `docs/ui-audit.md`; anything broken **and cheap** is
    fixed; anything structural is logged as a known limitation with a one-line rationale.

---

### R3 — Public live demo 🔒 OWNER-GATED (the biggest remaining gap)

> Recon already done (see `docs/plan-showcase.md` §Phase D): acerblue is publicly reachable
> via a **remote-managed** Cloudflare tunnel (`acerblue.lmntea.fun`, zone `lmntea.fun`,
> runs with `--token`, no local config). Adding a hostname is a **dashboard action**, which
> is why this phase is owner-gated.

- [ ] **R3.1 — Pre-deploy gate**
  - **Precondition:** R0–R2 complete; owner has approved the UI (this was the explicit reason
    deployment was paused on 2026-08-08).
  - **Steps:** confirm clean worktree, everything pushed to `origin/master`, `pnpm check:all`
    and `pnpm test:e2e:demo` green, CI green on the pushed SHA.
  - **Accept:** `git status` clean, `git log origin/master..HEAD` empty, CI badge green.

- [ ] **R3.2 — Deploy the demo to acerblue**
  - **Command:**
    ```bash
    bash scripts/deploy-ops.sh --host acerblue \
      --dir /home/trefeon/dev-portfolio/enterprise-ops-monitor --mode demo
    ```
    (run from Git Bash / WSL — this script is bash-based; see `AGENTS.md` §7).
  - **Notes:** git-based deploy (clean worktree + pushed SHA), remote preflight, then
    `deploy-check.js --demo` smoke. Build speed relies on BuildKit zstd + cache mounts
    (`docs/research.md` §a) — first build on the HDD is still slow; do not interrupt it.
  - **Accept:** `pnpm check:deploy` passes against the host; `eom-web` + `eom-mock-api`
    containers healthy; local-to-host `curl /api/system/health` returns `ok: true`.

- [ ] **R3.3 — 🔒 OWNER: publish the hostname**
  - **Agent action:** stop and hand the owner this exact instruction —
    > Cloudflare dashboard → Zero Trust → Networks → Tunnels → _(the acerblue tunnel)_ →
    > **Public Hostnames** → **Add a public hostname** →
    > subdomain: `<chosen>` · domain: `lmntea.fun` · service: `HTTP` → `localhost:5173`.
  - **Owner decision needed:** the subdomain name (suggestions: `ops-demo`, `eom`, `monitor`).
  - **Accept:** owner confirms the hostname resolves.

- [ ] **R3.4 — External smoke test**
  - **Precondition:** R3.3 confirmed.
  - **Steps:** from outside the network: load the URL → login `demo`/`demo123` → visit
    5 surfaces (Dashboard, Store Sync, EOD Monitor, Backups, Roles) → trigger one XLSX
    export → confirm `/api/system/health`.
  - **Accept:** all pass; capture one screenshot of the live URL as proof.
  - **Watch for:** the SPA is served by nginx with `/api` → `api:3000`; a 404 on refresh of a
    deep route means the SPA fallback broke — check `apps/web/nginx.conf`.

- [ ] **R3.5 — Publish the link**
  - **Steps:** add the live URL to `README.md` (badge + hero link, above Quickstart),
    `docs/portfolio.md`, and the GitHub repo "Website" field. Write
    `docs/adr/0002-public-demo-hosting.md` (context: recruiter access; decision: self-hosted
    on acerblue via Cloudflare tunnel; alternatives: Vercel static export, Fly.io, Render;
    consequences: owner-operated uptime, single point of failure, zero hosting cost).
  - **Accept:** README link resolves from an external network; ADR committed.
  - **Honesty guard:** if uptime cannot be guaranteed, say so in one line next to the link
    ("self-hosted demo — if it's down, `docker compose up -d --build` runs it locally in
    two minutes"). A dead link with no fallback is worse than no link.

---

### R4 — Repo presentation & final polish

- [ ] **R4.1 — 🔒 OWNER-ASSISTED: GitHub repo metadata**
  - **Steps:** set the repo **description** (one line, recruiter-facing), **topics**
    (`react`, `typescript`, `vite`, `tailwindcss`, `shadcn-ui`, `express`, `docker`,
    `playwright`, `portfolio`, `dashboard`, `rbac`), and the **Website** field (R3.5 URL).
  - **Agent action:** if `gh` is authenticated, do it directly:
    `gh repo edit --description "…" --homepage "…" --add-topic …`. Otherwise produce the
    exact command for the owner.
  - **Accept:** `gh repo view --json description,homepageUrl,repositoryTopics` shows all three.

- [ ] **R4.2 — `SECURITY.md`**
  - **Steps:** short root `SECURITY.md`: this is a demo with simulated data and one public
    demo credential by design; no real secrets; point to `docs/security.md` for the
    reference-stack remediation record; give a contact path for reports.
  - **Accept:** file exists; GitHub shows the Security policy badge; no contradiction with
    `docs/security.md`.

- [ ] **R4.3 — CI hardening review**
  - **Steps:** review `.github/workflows/ci.yml`: pinned action SHAs or major tags, pnpm
    cache, Playwright browser cache, sensible timeouts, and whether e2e runs on PRs or only
    on push. Confirm it still passes with **no database** (verified previously: `apps/api`
    is CI-safe without Postgres).
  - **Accept:** CI green on a real push; workflow has no unpinned `@master` actions.

- [ ] **R4.4 — README final pass**
  - **Steps:** verify every claim end-to-end: endpoint count (**99** mock routes — already
    reconciled in R1.1; README says 99), feature-surface count (R1.1), screenshot links, demo
    creds, every command in the Quickstart actually runs, all doc links resolve.
  - **Accept:** a link checker or manual pass shows zero broken links; every number in the
    README is reproducible by a command stated in this roadmap.

---

### R5 — Close-out

- [ ] **R5.1 — Full verification on the final tree**
  - **Steps:** `pnpm check:all`, `pnpm test:e2e:demo`, `pnpm build`, boot mock-api and hit
    `/api/system/health` + `POST /api/auth/login`, and (if R3 shipped) re-smoke the live URL.
  - **Accept:** all green; paste the outputs into the final report.

- [ ] **R5.2 — Documentation sync**
  - **Steps:** update `docs/development.md` (screenshot/CI/deploy sections), `docs/research.md`
    (add: stale-audit discovery, deploy outcome), and tick every box in this roadmap.
  - **Accept:** no doc contradicts the code; this file has no unticked box without a stated
    reason.

- [ ] **R5.3 — Memory + handoff**
  - **Steps:** save an engram observation per meaningful decision, then `mem_session_summary`
    with Goal / Discoveries / Accomplished / Next Steps / Relevant Files.
  - **Accept:** summary saved; the next agent can resume from memory + this file alone.

---

## 4. Task dependency graph

```
R0.1 ──► R0.2 ──┬──► R1.1 ──► R1.2 ──► R1.3 ──► R1.4 ──┐
                │                                       │
                └──────────────────────────────────────►├──► R2.1 ──► R2.2 ──► R2.3 ──► R2.4
                                                        │                                │
                                                        │        (owner UI approval) ◄───┘
                                                        │                                │
                                                        └──────────────────────► R3.1 ──► R3.2 ──► R3.3🔒 ──► R3.4 ──► R3.5
                                                                                                                        │
                                                                              R4.1🔒 ─ R4.2 ─ R4.3 ─ R4.4 ◄────────────┘
                                                                                        │
                                                                                        ▼
                                                                              R5.1 ─► R5.2 ─► R5.3
```

**Parallel-safe pairs** (disjoint files, no shared state): `R4.2` + `R4.3`; `R1.3` + `R1.4`.
Everything else is sequential — R2 rewrites what R1 archives, and R3 depends on a UI the
owner has approved.

---

## 5. Effort & routing

| Task group | Size | Route to                             | Notes                                             |
| ---------- | ---- | ------------------------------------ | ------------------------------------------------- |
| R0         | XS   | orchestrator directly                | 2 commands + a commit                             |
| R1         | S    | 1 `implementor` slice                | doc-only, no code                                 |
| R2.1       | M    | 1 `implementor` (or `designer`)      | audit + one report; single standard, no fan-out   |
| R2.2–R2.4  | M    | 1 `implementor` + 1 `verifier`       | code changes → needs executable proof             |
| R3         | M    | orchestrator + owner                 | 🔒 gated; deploy is bash/WSL, dashboard is manual |
| R4         | S    | 1 `implementor`; R4.1 owner-assisted |                                                   |
| R5         | S    | 1 `verifier` + orchestrator          | final proof + close-out                           |

---

## 6. Out of scope (protect the light build)

- No new feature surfaces, no new pages, no new mock endpoints beyond audit fixes.
- No changes to `apps/api`, `packages/`, or the real-stack reference (`AGENTS.md` §6).
- No database, no auth provider, no `.env`, no secrets in the demo path.
- No dependency upgrades or framework migrations.
- No UI redesign — R2 is compliance-to-existing-tokens only.
- No history rewrite without explicit owner approval (see R0.1 risk note).
- No reuse of the original internal system's stack, code, or data — by design.

---

## 7. Known risks

| Risk                                      | Impact                                                             | Mitigation                                                   |
| ----------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| `reference/` leaking into the public repo | **Severe** — real employer IP, TLS certs, binaries                 | R0.1 first; verify `git log --all -- reference` is empty     |
| Acting on the stale UI audit              | Wasted work reverting already-fixed code, or breaking valid tokens | §1.1 + R1.2 archive before R2.1                              |
| Screenshots drifting from the UI          | README shows a product that doesn't exist                          | R2.3 mandatory whenever R2.2 changes visuals                 |
| Live demo goes down                       | Broken recruiter link = worse than no link                         | R3.5 honesty guard + local fallback instructions             |
| No local Docker                           | Compose changes unverifiable here                                  | YAML parse + review; container proof only on acerblue        |
| Deploy on slow HDD                        | 40+ min first build, tempting to interrupt                         | BuildKit zstd + cache mounts already in place; let it finish |
