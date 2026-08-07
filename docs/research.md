# Research Log

Historical notes from the work behind this repository: the build-speed audit, the security audit, and the decision to make the demo the default path. These are **notes from completed work** — they document why the code is the way it is, not active tasks.

---

## (a) Build-speed audit — acerblue (slow hardware)

**Problem.** A full `docker compose up -d --build` of the original stack took **40+ minutes** on the deploy target (acerblue, 5400 rpm HDD). Repeat deploys were impractical for a portfolio demo.

**Root causes found (timed per layer):**

| Cause | Measured cost |
| --- | --- |
| Mock-api image layer export (gzip compression) | **771.7 s** |
| Web `vite build` stage | **416.3 s** |
| `COPY node_modules` after install | **115.9 s** |
| `chown -R /app` over the whole node_modules tree | multi-minute chown pass on HDD (also broke `/backups` ownership semantics) |
| Unpinned pnpm (re-downloading corepack pnpm each image) | 20 s+ per image |
| `DB_PORT` missing from Sequelize constructors | caused DB connectivity workarounds during prod-mode runs |

**Fixes applied (commit `1db054d` "perf: speed up docker deploys on slow hardware" + DB_PORT fix commits):**

- **BuildKit zstd compression + level 3** — `BUILDKIT_COMPRESSION=zstd`, `BUILDKIT_COMPRESSION_LEVEL=3`, `DOCKER_BUILDKIT=1` exported in `scripts/deploy-ops.sh` before every compose build. Zstd compresses and exports layers far faster than gzip on slow CPUs and writes fewer bytes to disk.
- **BuildKit cache mounts** in all three Dockerfiles (`apps/web/Dockerfile`, `apps/api/Dockerfile`, `mock-api/Dockerfile`): `--mount=type=cache,target=/root/.local/share/pnpm/store` and a corepack cache mount — repeat deploys become link-only installs.
- **`COPY --chown` instead of `chown -R` over node_modules** — eliminates the multi-minute chown pass and fixes `/backups` ownership.
- **Pin `pnpm@10.33.0` via `corepack prepare`** in each Dockerfile — no per-image re-download.
- **`--skip-checks` flag** on `deploy-ops.sh` for fast repeat deploys (CI should run checks; local repeat deploys can skip `pnpm check:all`).
- **`DB_PORT` added to Sequelize constructors** so the reference stack connects on the documented port.

**Result.** Repeat demo deploys went from 40+ minutes to a small fraction (link-only installs + zstd export + no chown). The environment-variable approach (`BUILDKIT_COMPRESSION=*`) means no compose file changes were needed for the speedup.

---

## (b) Security audit — outcomes

A security audit of the **real full stack** (`apps/api`) identified **3 critical and 6 high findings; all were remediated** in two remediation commits (`0174f42` / `14e1fbc` "security remediation — media traversal, SQLi, tenant isolation, auth hardening" and `d68bc50` "close security audit issues #5 #7 #11 #12 #14 #15").

| # | Severity | Finding | Remediation |
| --- | --- | --- | --- |
| 1 | Critical | Media upload/download path traversal | Paths resolved inside the media root, traversal rejected; magic-byte MIME sniffing rejects header spoofing |
| 2 | Critical | SQL injection in tenant middleware | Parameterized tenant queries; no raw interpolation of tenant ids |
| 3 | Critical | Cross-tenant data exposure | RLS enabled + strict tenant policies; `org_id` backfill migration; JWT `orgId` plumbed through auth middleware; tenant-scoped queries everywhere |
| 4 | High | Legacy SHA256 password path | Removed — bcrypt-only, fails closed |
| 5 | High | Login brute force | Rate limit tightened 100 → 10 attempts per 15 minutes (production) |
| 6 | High | Refresh token reuse | DB-backed rotation + revocation with strict RLS migration |
| 7 | High | OAuth callback CSRF | Stateless HMAC-signed `state` parameter verified pre-callback |
| 8 | High | Cross-tenant cache leak (EOD live ranking) | Tenant-keyed cache — no shared cache rows across orgs |
| 9 | High | RBAC soft-fail | Fail-closed RBAC: missing permission / unresolved role denies |

Each fix shipped with regression tests in `apps/api/tests/` (media traversal, tenant context/middleware, auth middleware `orgId`, login `orgId`, RBAC branch scope, refresh rotation, OAuth state, auth hardening, EOD live auth, billing guard).

**Note for reviewers:** this is reference-stack work — the deployed demo (mock-api) is intentionally minimal and contains no real data or secrets (see `docs/security.md`).

---

## (c) Why demo-first

Three factors drove the decision (full record: `docs/adr/0001-portfolio-demo-first.md`):

1. **Portfolio goal.** The deliverable a recruiter should see is the dashboard itself — working, live, and explorable. A heavy Postgres-backed stack adds operational noise (migrations, volumes, seeds, backups, env files) that gets in the way of "clone, up, explore".
2. **Heavy stack cost.** The real stack builds in 40+ minutes on slow hardware (section a), needs `DB_PASS` / `JWT_SECRET`, a database volume, and a running Postgres. That cost is justified for production, not for a demo.
3. **Deploy lightness.** The demo is two containers, zero config, zero secrets, and a deploy script whose only requirement is an SSH target. The real stack stays in the repo — visible on GitHub, documented as reference — without burdening the default path.