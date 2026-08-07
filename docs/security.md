# Security

Two clearly separated surfaces exist in this repo:

1. **The deployed demo (mock-api + web)** — intentionally minimal, safe because it contains **no real data and no secrets**.
2. **The reference full stack (`apps/api`)** — the production-grade codebase where a completed security remediation program lives. It is **reference material only** and never deployed by the default path.

Everything in this document that describes `apps/api` remediation is **historical/reference content**: it documents work that exists in git history and in the real-stack codebase to show security competence on the portfolio, not active demo behavior.

---

## 1. Demo boundaries (the deployed path)

The demo is safe to run and share by construction:

- **No real data, ever.** Every metric, store, employee, user, log line, and system reading is faker-generated or anonymized at runtime. Restarting the mock API regenerates/resets everything.
- **Exactly one account.** `demo` / `demo123`, defined once in `MOCK_USERS` / `MOCK_ACCOUNTS` in `mock-api/server.js`. The login endpoint refuses every other credential with `INVALID_CREDENTIALS` ("Demo mode only allows the demo account"). There are no default admin/viewer/superadmin accounts in the demo — those exist only in the reference stack's `.env.example` defaults (which are never applied by the demo).
- **In-memory sessions.** `POST /api/auth/login` mints a mock token (`mock-jwt-token-<random>`) stored in a module-level `sessions` `Map`. `GET /api/auth/me` is the only endpoint that validates it. A mock-api restart clears every session — nothing persists.
- **No secrets required.** `docker compose up -d --build` needs no `.env`, no `DB_PASS`, no `JWT_SECRET`. The compose file contains no credentials. The web container is built with `VITE_APP_MODE=demo`, and optional `VITE_IT_SUPPORT_URL` / `VITE_IT_SUPPORT_EMAIL` args default to empty.
- **CORS is origin-reflecting, for local dev/e2e only.** The mock API uses `cors({ origin: true, credentials: true })`, which reflects whatever origin the browser sent. This is deliberate: the web client sends cookies with `withCredentials: true` and calls the mock API cross-origin during local development and the Playwright e2e run (web on :5182, mock-api on :4000). In the Docker deploy, nginx proxies `/api` **same-origin**, so CORS is never exercised in production-like conditions.
- **No secrets are ever uploaded.** `deploy-ops.sh` (rsync strategy) explicitly excludes `.env*` files; remote deploys use git checkout and `--preserve-remote-env`.
- **Read-only demo enforcement.** The web client renders read-only affordances in demo mode (the e2e suite asserts `DEMO_READ_ONLY` 403-style behavior on write paths), so a reviewer cannot confuse simulated writes with real operations.

### What the demo intentionally does NOT have (and why that is fine)

The mock API is minimal on purpose: no rate limiting, no Helmet headers on its own responses, no real JWT signing, no per-endpoint auth for data routes (only `/api/auth/*` validate tokens), no CSP beyond what nginx adds. Every one of those omissions is acceptable because the demo serves **fake data in memory** — there is nothing sensitive to protect, and the login guard exists solely to emulate the product flow. These controls DO exist in the reference stack and are described below.

---

## 2. Reference full stack — historical remediation summary

> **Historical / reference only.** This section describes security work that exists in `apps/api` and in git history (commits `0174f42`, `14e1fbc`, and `d68bc50`). It is **not active demo code** — the demo never loads `apps/api`. It is documented here so reviewers can see the security engineering behind the repo.

**Audit outcome:** a security audit of the real stack identified **3 critical and 6 high findings; all were remediated**. The remediation program is summarized below; each fix shipped with regression tests in `apps/api/tests/`.

### The issues that were fixed

| Severity | Area | Fix |
| --- | --- | --- |
| Critical | Media upload path traversal | Downloads/uploads now resolve paths inside the media root and reject `..` traversal (`mediaService`, `mediaRoutes`); uploads are validated by **magic-byte MIME sniffing** (`utils/magicMime.js`), rejecting header spoofing. |
| Critical | SQL injection in tenant middleware | Tenant middleware parameterization hardened (`middleware/tenantMiddleware.js`); tenant id is no longer interpolated into raw SQL. |
| Critical | Cross-tenant data exposure | **Tenant isolation / Row-Level Security**: `enable_rls` migration, strict tenant policies, `org_id` backfill migration (`20260806_001_backfill_org_id`) and strict RLS policies (`20260806_002_strict_tenant_policies`); JWT `orgId` is plumbed through `jwtCookie.js` and `authMiddleware.js`; every guarded query is tenant-scoped. |
| High | Legacy password hashing | Auth hardening: legacy SHA256 password path removed — **bcrypt-only, fails closed** (`authController`). |
| High | Login brute force | Login rate limit tightened from 100 to **10 attempts per 15 minutes** in production (`authRoutes`). |
| High | Refresh token handling | **DB-backed refresh-token rotation with revocation** and strict RLS (`RefreshToken` model, `20260806_003_create_refresh_tokens` migration); replayed/rotated tokens are rejected. |
| High | Google OAuth CSRF | Stateless HMAC-signed OAuth `state` parameter, verified before the callback (`utils/oauthState.js`); tightens the callback flow. |
| High | EOD live cache cross-tenant leak | EOD live ranking now uses a **tenant-keyed cache** so one org can never read another org's cached rows (`eodController`). |
| High | RBAC soft-fail | RBAC middleware hardened to **fail closed**: missing permission or unresolved role denies access instead of defaulting open (`middleware/rbac.js`, `authzService`, branch-scope resolution). |

**Verification:** the audit-era work added or updated suites for every area — media upload/traversal, tenant context/middleware, `orgId` plumbing in auth middleware and login, RBAC branch scope, EOD live auth, refresh rotation, OAuth state, billing guard, and auth hardening — and the frontend `client.ts` was aligned to the cookie+token contract.

### Reference stack conventions relevant to anyone touching `apps/api`

- Keep the `{ ok, data, meta, error }` envelope and CommonJS modules (see `apps/api/AGENTS.md`).
- Route input validation lives in `routes/*.js` with `middleware/validate.js` + Zod schemas, before controllers.
- Persistent schema changes go through `migrations/` — do not expand boot-time compatibility SQL.
- Seed users in the reference stack use bcrypt hashes or `DEMO_*_PASSWORD_*` (`.env.example` shows the full non-demo credential surface with strong-password placeholders — none of which the demo reads).

---

## 3. Operating rules for contributors

- Never add real credentials, customer data, or production endpoints to the demo path.
- Never point `docker-compose.yml` at a database or require `.env` for `docker compose up`.
- Never relax the demo disclosure (README, AGENTS.md, About page, login page all carry it).
- When touching the reference stack, follow `apps/api/AGENTS.md` and keep the remediation tests green.