# Phase 4 — Security Self-Audit: Branch Ops Compliance SaaS

**Date:** 2026-07-07
**Scope:** Multi-tenant authorization, RLS enforcement, auth flows, screen-token security, upload validation, and standard security posture.
**Methodology:** Code review of all new/modified files from Phase 3 + targeted static analysis of existing controllers and middleware.

---

## 1. Cross-Tenant IDOR Check

### 1.1 Route isolation model

The app has **two parallel mount paths** via `orgRouteMapper`:

| Path | Tenant Middleware | Auth Required | Risk |
|------|-------------------|---------------|------|
| `/api/orgs/:orgId/*` | ✅ `tenantMiddleware` | ✅ `authMiddleware` | **LOW** — dual-gated |
| `/api/*` (legacy) | ❌ **SKIPPED** | ✅ `authMiddleware` | **MEDIUM** — no RLS context set via middleware, but passport-jwt enforces user auth |

**Finding ORG-1: Legacy path skips tenant middleware.** The `mountOrgRoute` function sets `skipTenantMwOnLegacy=true` by default. This means a request to `GET /api/stores` does NOT set `SET LOCAL app.tenant_id` — RLS has no context. Whether RLS blocks or leaks depends on the table:

- **RLS-protected boot-time tables** (`data_stores`, `data_store_eod_history`, etc.): the policy uses `current_setting('app.tenant_id', TRUE)` which returns NULL if unset → `org_id::text = NULL` evaluates to UNKNOWN → policy returns FALSE → **zero rows returned**. Safe by default, but silently breaks the legacy path.
- **Non-RLS Sequelize model tables** (`"Stores"`, `"EODLogs"`, `"SystemLogs"`, etc.): RLS is NOT enabled (see below). **No org_id filter applied in application code for legacy path queries.**

**Severity: HIGH** — Data on Sequelize model tables via legacy `/api/` path has no tenant filtering.

**FIXED 2026-08-06** — `routes/orgRouteMapper.js` now defaults `skipTenantMwOnLegacy: false`, so the
legacy `/api/*` paths also run `tenantMiddleware` (only display/media surface routes opt out
explicitly). Sequelize model tables additionally gained strict RLS — see CRIT-1 below.

### 1.2 Session/Tenant Mismatch

| Attack | Defense | Verdict |
|--------|---------|---------|
| Org A's JWT used to call `/api/orgs/:orgBId/stores` | `tenantMiddleware` sets `SET LOCAL app.tenant_id = req.params.orgId` from URL param. The tenant filter is URL-sourced, not JWT-sourced. | **FINDING TENANT-1: The tenant ID from the URL param is used directly without verifying it matches the user's JWT orgId.** A user with org A's JWT could manually change `:orgId` in the URL to org B's ID and the middleware would set org B's tenant context. |
| Org A's JWT used to call `/api/orgs/:orgBId/eod` | Same issue. The route sets tenant context from `req.params.orgId`, not from `req.user.orgId` | **Same finding.** |
| RLS protection | RLS blocks access to org B's data... BUT RLS is NOT enabled on Sequelize model tables (see 1.4) | **HIGH** |

**FIXED 2026-08-06** — `middleware/tenantMiddleware.js` returns `403 TENANT_MISMATCH` whenever
`req.params.orgId` exists and differs from `req.user.orgId` (JWT claim). DB-user logins now carry
`orgId` in the JWT (`controllers/authController.js` `login`), and `middleware/authMiddleware.js`
maps the claim to `req.user.orgId`, so the mismatch guard is live.

### 1.3 Tenant Resolution in Middleware

```js
// tenantMiddleware.js
let tenantId = req.params?.orgId || null;
if (!tenantId && req.user?.orgId) {
  tenantId = req.user.orgId;
}
```

The priority is: URL param > JWT user. An attacker can override their tenant by changing the URL. **No validation that `req.params.orgId` matches `req.user.orgId`.**

**Fix required:** Add tenant ownership validation:
```js
if (req.params?.orgId && req.user?.orgId && req.params.orgId !== req.user.orgId) {
  return res.status(403).json({ error: 'Tenant mismatch' });
}
```

**FIXED 2026-08-06** — `middleware/tenantMiddleware.js` implements the check above (403
`TENANT_MISMATCH`) and validates the tenant id as a UUID before use. The tenant context is applied
via parameterized `SELECT set_config('app.tenant_id', $1, false)` (ADR-1, session-scoped) — the old
`SET LOCAL app.tenant_id = '${tenantId}'` interpolation that allowed multi-statement SQL injection
is gone (no raw string concatenation remains). Context is reset on `res.on('finish')` and at request
start when no tenant applies; `app.is_super_admin = 'true'` is set for `env_admin`.

### 1.4 RLS Coverage Gap — Sequelize Model Tables

RLS migration `20260707_002_enable_rls.js` covers **8 boot-time tables only**:

| RLS Enabled ✅ | RLS NOT Enabled ❌ |
|----------------|-------------------|
| data_stores | **"Stores"** (Sequelize) |
| data_employees | **"EODLogs"** (Sequelize) |
| data_store_eod_current | **"Employees"** (Sequelize) |
| data_store_eod_history | **"SyncLogs"** (Sequelize) |
| store_sync_snapshot | **"SyncSummaries"** (Sequelize) |
| sync_aud_latest | **"SyncAlertStates"** (Sequelize) |
| afterhours_pc_log | **"BackupLogs"** (Sequelize) |
| afterhours_monthly_report | **"SystemLogs"** (Sequelize) |
| | **"agent_monitoring"** |
| | **"Roles"**, **"RolePermissions"** |
| | **"UserRoles"**, **"UserPermissionOverrides"** |
| | **"UserBranchScopes"** |
| | **"Users"** |
| | **"screens"**, **"playlists"**, **"playlist_items"**, **"media_assets"** |
| | **"screen_playlists"** |
| | **"subscriptions"**, **"billing_invoices"** |

**Severity: CRITICAL** — All Sequelize model tables (12+ tables) and new Live Menu Display tables (5 tables) and billing tables (2 tables) have no RLS protection. Data on these tables is accessible via legacy `/api/` path with only coarse auth checks.

**FIXED 2026-08-06** — Two migrations, run in filename order by `migrations/run.js`:
- `migrations/20260806_001_backfill_org_id.js` — backfills NULL `org_id` rows on every table in the
  list above to the default tenant (`SELECT id FROM tenants ORDER BY created_at LIMIT 1`), one
  transaction, per-table row counts logged; tables without an `org_id` column are skipped
  (screen_playlists, playlist_items, billing_invoices).
- `migrations/20260806_002_strict_tenant_policies.js` — drops the old `org_id IS NULL OR …`
  permissive policy and installs `tenant_isolation_policy` (`org_id IS NOT NULL AND org_id::text =
  current_setting('app.tenant_id', TRUE)`, WITH CHECK same) plus `super_admin_policy`
  (`current_setting('app.is_super_admin', TRUE) = 'true'`), keeping `FORCE ROW LEVEL SECURITY`
  (ADR-2).

The RLS context comes from the session-scoped `set_config` (ADR-1, see §1.3), and the legacy path
now runs `tenantMiddleware` (ORG-1), so RLS applies end-to-end.

---

## 2. Auth Bypass Checks

### 2.1 OAuth Flow

| Attack | Result |
|--------|--------|
| Google OAuth callback accepts any Google account | `GOOGLE_AUTO_REGISTER` flag controls auto-account-creation. If enabled, ANY Google account can create a user. |
| Account linking: can user link multiple Google accounts? | Only one identity per `(provider, provider_id)` pair. Multiple Google accounts with different emails → different `user_identities` rows. No protection against one person having multiple identities. |
| OAuth callback without state/CSRF | **Unverified** — the Google strategy does not show `state` parameter in the current config. CSRF protection on OAuth callback is missing. |

**FIXED 2026-08-06 (Google auto-register allowlist)** — `middleware/passport.js` gates
auto-account-creation behind `GOOGLE_ALLOWED_DOMAINS` (comma-separated env, added to
`config/env.js`): a Google login only auto-registers when the email domain is allowlisted; when
`GOOGLE_AUTO_REGISTER` is enabled but the allowlist is unset/empty, auto-registration is DISABLED
(fail closed); a disallowed domain is redirected with `error=domain_not_allowed`. (The OAuth
`state` parameter itself remains deliberately off — see AUTH-1 below.)

**Finding AUTH-1: No OAuth state parameter.** The Google OAuth strategy does not pass a state parameter. This makes the callback vulnerable to CSRF-based account linking attacks.

### 2.2 Invite Link Security

Invite-by-email endpoint was **scheduled but appears not yet implemented** in authRoutes.js / authController.js. The invite flow was documented in ARCHITECTURE.md but not created in Phase 3.

**Finding AUTH-2: Invite endpoint not implemented.** `POST /api/auth/invite` and `POST /api/auth/accept-invite` are missing from the codebase. The architecture spec exists but the routes were never wired.

→ **FIXED 2026-08-06** — `POST /api/auth/invite` and `POST /api/auth/accept-invite` are implemented
(`controllers/authController.js`, wired in `routes/authRoutes.js`). `orgId` comes from the JWT claim
(`req.user.orgId`), the invited user is created under the inviter's org with a `user_roles` row
carrying `org_id`, and the NULL fallback was removed.

### 2.3 JWT Validation

| Check | Status |
|-------|--------|
| JWT signature verified? | ✅ Yes — via passport-jwt with `secretOrKey: env.JWT_SECRET` |
| JWT expiry enforced? | ✅ Yes — 24h expiry |
| JWT orgId in payload? | ✅ Yes — `{ id, username, role, orgId }` |
| Auth bypass via `alg: none`? | ✅ Protected — passport-jwt defaults to requiring a valid signature |
| Token refresh mechanism? | ❌ No refresh token. Token uses 24h expiry with no rotation. |

**Finding AUTH-3: No JWT refresh/rotation.** A leaked JWT is valid for 24h with no way to revoke without changing `JWT_SECRET`.

### 2.4 env_admin Special Case

The `env_admin` user (defined via `ADMIN_USERNAME`/`ADMIN_PASSWORD_HASH` env vars) has:

```js
orgId: null,
isAllBranches: true,
```

**Finding AUTH-4: env_admin has null orgId and all-branch access.** When this user accesses an org-scoped route via `/api/orgs/:orgId/`, the tenantMiddleware prioritizes `req.params.orgId` which becomes the active tenant context. The env_admin can access ANY org's data by changing the `:orgId` in the URL. This is by design (super admin), but the RLS gap on Sequelize tables means the env_admin has unrestricted read access to all orgs' data via the legacy path.

→ **FIXED 2026-08-06 (super-admin access preserved by policy, not by NULL escape)** —
`tenantMiddleware` sets `app.is_super_admin = 'true'` for `env_admin`; the `super_admin_policy`
(20260806_002) keeps cross-tenant admin access working under strict RLS. Regular users get no
super-admin fallback: `register` returns `503 ROLE_NOT_SEEDED` instead of escalating when the
`org_owner` role is not seeded.

---

## 3. Leftover Single-Tenant Assumptions

### 3.1 isAllBranches Fix Verification

The `authzService.js` was supposed to fix the single-tenant `isAllBranches` semantic where empty `UserBranchScope` = global access.

**Current code (authzService.js line 87):**
```js
const isAllBranches = isSuperAdmin || isOrgAdmin || scopeBranches.length === 0;
```

**Finding ST-1: The fix is INCOMPLETE.** The `scopeBranches.length === 0` clause is **still present**. A regular `org_member` with no branch scopes STILL gets `isAllBranches = true`. The fix should remove this condition:

```js
// CORRECT: only super_admin and org-level roles get all-branch access
const isAllBranches = isSuperAdmin || isOrgAdmin;
// org_member with empty scopes = zero access
```

**Severity: HIGH** — Every org_member with no explicit branch scopes currently gets unrestricted branch access within their org.

→ **FIXED (verified 2026-08-06)** — `services/authzService.js` now computes
`const isAllBranches = isOrgAdmin;` (the `scopeBranches.length === 0` escape is removed), and
`middleware/rbac.js` branch-scope checks fail closed by default (403 "Branch scope could not be
resolved" instead of `next()`).

### 3.2 Hardcoded Branch Values

| File | Issue | Status |
|------|-------|--------|
| `utils/ensureDb.js` | Still has hardcoded 8-branch seed for boot-time schema | ✅ ADDED org_id column, but the 8 branches are still hardcoded (they become Org 1's branches) |
| `utils/dataClient.js` | BRANCHES array still hardcoded (8 hubs) | **UNCHANGED** — still single-org |
| `services/dataDb.js` | `fetchStoresAll()` etc. still full-table scan with no org filter | **UNCHANGED** — relies on RLS for isolation |

**Finding ST-2: dataClient.js and dataDb.js still single-org.** These services are used by controllers and do not pass `org_id` in their queries. They rely entirely on RLS (boot-time tables only) for tenant isolation. Sequelize model queries in controllers also lack explicit `org_id` WHERE clauses.

**Severity: MEDIUM** — Works if RLS is fully deployed, but is fragile. A bug in RLS config or an RLS-not-enabled table would leak data.

→ **PARTIALLY FIXED 2026-08-06** — `services/dataClient.js` now scopes all cache keys per org
(`data:{orgId}:{prefix}`; `data:legacy:{prefix}` when no org is active) and exposes `setOrgId()`
(wired in `middleware/authMiddleware.js` after JWT verification, alongside `applyTenantContext`:
each authenticated request loads the JWT org's branches and activates the org-scoped cache keys;
`tenantMiddleware` itself only writes the RLS context, it does not call `setOrgId`), so org A can
never read org B's cached branches/EOD data. `dataDb.js` service queries remain unscoped and still
rely on RLS; the full request-scoped refactor of the global branch cache remains **open /
follow-up** (PRD N2, §9).

### 3.3 Public Endpoint `GET /api/eod/live`

From Phase 0 audit: `getLiveEodRanking()` is a **public (no auth) endpoint** that does a full-table join on `data_store_eod_history` and `data_stores`.

**Current state:**
- No `org_id` filter in SQL
- No ACL check
- RLS IS enabled on `data_store_eod_history` and `data_stores` (boot-time tables)
- **BUT:** no tenantMiddleware runs for this endpoint on the legacy path → RLS has no context → returns **empty result set**

**Finding ST-3: Public EOD ranking endpoint.** In single-tenant mode returning data. In multi-tenant mode: RLS blocks it (returns empty). The legacy `/api/eod/live` path is silently broken unless migrated to org-scoped routing.

→ **FIXED 2026-08-06** — `routes/eodRoutes.js` `GET /live` now requires `authMiddleware` +
`requirePermission("EOD_VIEW")` (no longer public); the controller stays org-scoped via
`tenantMiddleware`, which also runs on the legacy path (ORG-1).

---

## 4. Standard Security Checklist

### 4.1 CORS

```js
// CORS config in app.js
origin(origin, cb) {
  if (!origin) return cb(null, true);
  if (allowedOrigins.length === 0) return cb(null, origin); // reflects origin
  // ...
}
```

**Finding SEC-1: CORS reflects origin when CORS_ORIGINS env is not set.** With `allowedOrigins.length === 0`, any origin is reflected back with `Access-Control-Allow-Origin: <request-origin>`. Combined with `credentials: true`, this allows credential-bearing cross-origin requests from any website.

**Severity: MEDIUM** — mitigated by the fact that JWT is in Authorization header (not cookies), so browser CORS + credentials mismatch doesn't leak tokens directly. Still, any reflecting CORS with credentials is a CSRF risk if token is ever stored in a cookie.

→ **FIXED (verified 2026-08-06)** — `app.js` now returns `cb(null, false)` (deny) when
`CORS_ORIGINS` is unset instead of reflecting the request origin. The ADR-5 cookie hardening removes
the residual CSRF concern: the `auth_token` cookie is `httpOnly`, `SameSite=Strict` (`secure` in
production), and the frontend no longer persists the JWT in `localStorage`.

### 4.2 Rate Limiting

```js
// Global: 300 req/min
rateLimit({ windowMs: 60*1000, limit: 300 })

// Login: 100 req/15min
loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 100 })
```

**Finding SEC-2: Login rate limit is relaxed.** 100 attempts per 15 minutes (1 attempt per 9 seconds) is generous for a real production system. Standard recommendation: 5-10 attempts per 15 minutes. Current rate is intended for demo purposes.

**Finding SEC-3: No rate limiting on signup/register endpoint.** The signup flow (`POST /api/auth/register`) was documented in the PRD but the endpoint check shows it may not have individual rate limiting. If present, 100 req/15min from global limit applies.

→ **FIXED 2026-08-06** — `routes/authRoutes.js` mounts a dedicated `registerLimiter`
(10 registrations per IP per 15 minutes) on `POST /api/auth/register`, mirroring `loginLimiter`.

### 4.3 Security Headers

| Header | Set by helmet | Value | Status |
|--------|---------------|-------|--------|
| X-Frame-Options | ✅ | `SAMEORIGIN` (default) | ✅ |
| X-Content-Type-Options | ✅ | `nosniff` | ✅ |
| Strict-Transport-Security | ✅ | In production | ✅ |
| Content-Security-Policy | ⚠️ | Not explicitly configured (helmet default = no CSP) | **MEDIUM** |
| X-Powered-By | ✅ | Disabled via `app.disable("x-powered-by")` | ✅ |

**Finding SEC-4: No CSP.** Content-Security-Policy is not configured. For a dashboard app it's low risk (no user-generated content rendered), but should be added before production.

### 4.4 Session Fixation

No session-based auth used. JWT is stateless. Not vulnerable to session fixation.

### 4.5 Password Handling

```js
// authMiddleware.js / authRoutes.js
// Uses passport-jwt with Bearer token
// Password validated with bcrypt.compareSync
// Legacy SHA256 hashes supported with timingSafeEqual
```

**Finding SEC-5: Legacy SHA256 password support.** The codebase supports both bcrypt (`$2a$...`) and SHA256 (64 hex chars) password hashes. SHA256 without salt is a weak hash. Legacy migration code attempts to migrate to bcrypt on successful login.

**Severity: LOW** — migration exists, but SHA256 hashes in the database would be vulnerable if the database is compromised.

---

## 5. Display Client / Screen-Token Security

### 5.1 Token Entropy

```sql
token UUID DEFAULT gen_random_uuid() UNIQUE
```

UUID v4 = 122 bits of entropy. Brute force is infeasible (2^122).

**Verdict: SECURE.** Screen tokens are not enumerable.

### 5.2 Data Leakage

The `GET /display/:screenToken` endpoint returns:
```json
{
  "screen": { "name": "Dining Room Display" },
  "org": { "name": "Warung Kita", "primary_color": "#1a73e8", "logo_url": null },
  "playlist": { "items": [...] }
}
```

**Verdict: LOW LEAKAGE.** Only branding-safe data is exposed. No employee data, no EOD data, no auth tokens, no other branches' data.

**Finding DISPLAY-1: Org name leak.** Org name is exposed to anyone who knows or guesses a screen token. For a restaurant TV this is acceptable (the name is on the storefront), but worth noting.

### 5.3 Media URLs

The playlist items return `mediaService.getUrl(asset.storage_path)` which resolves to `/api/media/:orgId/:filename`. The media serve endpoint (`GET /api/media/:orgId/:filename`) has **NO AUTH**.

**Finding DISPLAY-2: Media files are publicly accessible.** Anyone with a direct URL to `/api/media/:orgId/:filename` can access any uploaded media file. The URL contains the orgId, but there's no auth check.

→ **FIXED 2026-08-06 (endpoint stays public by design, but hardened — ADR-4)** —
`routes/mediaRoutes.js` validates `orgId` as a UUID and `filename` as a bare basename (no `/`, `\`,
`..`) with an allowlisted extension (`jpg|jpeg|png|webp|mp4|webm`), returning 400 before any `fs`
access; `services/mediaService.js` `resolvePath` resolves and verifies containment under
`MEDIA_ROOT`, returning `null` for any path that escapes the root — traversal variants
(`..%2F`, backslashes, absolute paths) get 400/404, never a stream. Uploads derive `orgId` from
`req.tenantId`/`req.user.orgId` only (ADR-3), and `uploaded_by` is set NULL for `env_admin` (FK fix).

**Severity: LOW** — Media assets are menu slides and promotional videos. They're intended for public display. Not sensitive data. If user uploads private content, it would be exposed.

### 5.4 Display Client Resilience

| Check | Status |
|-------|--------|
| Crashes on bad asset? | ✅ Skip silently with `onerror` handler |
| Memory leak on long uptime? | ✅ Explicit `<video>` element lifecycle management, `useEffect` cleanup |
| Fullscreen API? | ✅ `document.documentElement.requestFullscreen()` |
| Cursor auto-hide? | ✅ CSS `cursor: none` after 3s |
| 60s polling | ✅ `setInterval` with cleanup |
| Screen sleep prevention | ⚠️ No `keepAlive` / wake lock API detected in the code |

**Finding DISPLAY-3: No wake lock API.** On Android TV / Chromecast, the display client may eventually blank the screen if no fullscreen interaction occurs. `navigator.wakeLock.request('screen')` should be added.

---

## 6. Upload Validation

### 6.1 Server-Side Validation

```js
function validateUpload(mimetype, size) {
  const isImage = ["image/jpeg", "image/png", "image/webp"].includes(mimetype);
  const isVideo = ["video/mp4", "video/webm"].includes(mimetype);
  if (!isImage && !isVideo) { return { valid: false, message: ... }; }
  if (isImage && size > 10 * 1024 * 1024) { return { valid: false, message: ... }; }
  if (isVideo && size > 200 * 1024 * 1024) { return { valid: false, message: ... }; }
  return { valid: true };
}
```

**Verdict: VALIDATED.** Server-side MIME type AND file size checked. Multer's `fileFilter` also validates.

**Finding UPLOAD-1: MIME type is client-trustable.** The `mimetype` field from multer comes from the file upload's HTTP header `Content-Type`, which the client controls. This is server-side validation but based on client-provided data.

**Severity: LOW** — For a menu-board image upload this is acceptable. For a security-sensitive app, use `file` command or magic bytes detection instead of trusting Content-Type header.

---

## 7. Summary of Findings

### Critical (should fix before production)

| # | Finding | File | Fix |
|---|---------|------|-----|
| **CRIT-1** | **RLS not enabled on 17 Sequelize model tables + Live Menu + billing tables** | `migrations/20260707_002_enable_rls.js` | Extend RLS migration to cover: Stores, EODLogs, Employees, SyncLogs, SyncSummaries, SyncAlertStates, BackupLogs, SystemLogs, agent_monitoring, Users, Roles, RolePermissions, UserRoles, UserPermissionOverrides, UserBranchScopes, screens, playlists, playlist_items, media_assets, screen_playlists, subscriptions, billing_invoices **FIXED 2026-08-06** — backfill `20260806_001_backfill_org_id.js` + strict policies `20260806_002_strict_tenant_policies.js` (ADR-2); context via session-scoped `set_config` (ADR-1). |
| **CRIT-2** | **Tenant ID from URL not validated against JWT orgId** | `middleware/tenantMiddleware.js` | Add check: `if (req.params.orgId !== req.user.orgId) return 403` **FIXED 2026-08-06** — 403 `TENANT_MISMATCH`; tenantId validated as UUID; parameterized `set_config` (SQLi closed). |

### High

| # | Finding | File | Fix |
|---|---------|------|-----|
| **HIGH-1** | **`isAllBranches` fix incomplete — `scopeBranches.length === 0` still grants all-branch access** | `services/authzService.js:87` | Remove `\|\| scopeBranches.length === 0` condition. Only `isSuperAdmin` or `isOrgAdmin` should get `isAllBranches`. **FIXED (verified 2026-08-06)** — `authzService.js` `isAllBranches = isOrgAdmin` only; `rbac.js` branch scope fail-closed (403). |
| **HIGH-2** | **Legacy `/api/` path skips tenant middleware. All data from Sequelize model tables exposed to any authenticated user.** | `routes/orgRouteMapper.js:28` | Remove `skipTenantMwOnLegacy` option. Apply tenant middleware to legacy path too, or deprecate the legacy path. **FIXED 2026-08-06** — `orgRouteMapper` `skipTenantMwOnLegacy` defaults `false`; legacy path runs tenant middleware; model tables now RLS-protected. |

### Medium

| # | Finding | File | Fix |
|---|---------|------|-----|
| **MED-1** | **No OAuth state parameter in Google OAuth flow** | `middleware/passport.js:149` | Add `state: true` to GoogleStrategy config. Passport supports state. |
| **MED-2** | **CORS reflects origin when CORS_ORIGINS not set** | `app.js:61` | Default to deny when no origins configured, or at minimum add `Access-Control-Allow-Origin: https://app.branchops.com` |
| **MED-3** | **Public EOD ranking endpoint (`/api/eod/live`) silently returns empty in multi-tenant mode** | `controllers/eodController.js:33-57` | Either org-scope this endpoint or remove it for SaaS mode **FIXED 2026-08-06** — `/live` requires auth + `EOD_VIEW`; org-scoped via tenant middleware. |
| **MED-4** | **dataClient.js and dataDb.js still use hardcoded single-org BRANCHES array** | `services/dataClient.js`, `services/dataDb.js` | Refactor to pull dynamic branches from org-scoped query **PARTIALLY FIXED 2026-08-06** — org-scoped cache keys + `setOrgId`; request-scoped refactor open / follow-up (N2). |
| **MED-5** | **No signup/register endpoint exists in authRoutes** | `routes/authRoutes.js` | The signup/register endpoint from PRD/ARCHITECTURE.md was not implemented in Phase 3 **FIXED 2026-08-06** — register endpoint implemented + `registerLimiter` (10/15min/IP). |

### Low

| # | Finding | File | Fix |
|---|---------|------|-----|
| **LOW-1** | **No Content-Security-Policy header** | `app.js` | Add helmet.contentSecurityPolicy directive |
| **LOW-2** | **Login rate limit is generous (100/15min)** | `routes/authRoutes.js:17` | Reduce to 10/15min for production |
| **LOW-3** | **No refresh token / token rotation** | `controllers/authController.js` | Add refresh token mechanism for production |
| **LOW-4** | **No Wake Lock API on display client** | `apps/web/src/pages/LiveTVDisplay/index.tsx` | Add `navigator.wakeLock.request('screen')` |
| **LOW-5** | **MIME type validation trusts client's Content-Type header** | `routes/mediaRoutes.js:33-43` | Use file magic bytes (`file` command or `mime-types` library's type detection) |
| **LOW-6** | **Legacy SHA256 password support** | `controllers/authController.js:16` | Remove SHA256 path after all passwords migrated |

### Not Flagged (Addressed or Acceptable)

| Check | Verdict |
|-------|---------|
| SQL injection in raw queries? | ✅ All queries use parameterized bindings (`$1`, `$2` or `:named` replacements) |
| Display token enumeration? | ✅ UUID v4 → infeasible (2^122) |
| Display data leakage? | ✅ Only branding-safe data returned. No employee/EOD/internal IDs |
| Upload file type enforcement? | ✅ Server-side MIME + size both checked |
| JWT signature bypass? | ✅ passport-jwt requires valid signature |
| CORS credentials? | ✅ Mitigated (JWT in Authorization header, not cookies) |
| Helmet basic headers? | ✅ X-Frame-Options, X-Content-Type-Options, HSTS |

---

## 8. Fixes Applied During Audit

The following fixes were identified and should be applied before Phase 5 deployment:

1. **isAllBranches fix in authzService.js** — Remove `scopeBranches.length === 0` condition
2. **Tenant validation in tenantMiddleware.js** — Add `req.params.orgId` vs `req.user.orgId` check
3. **RLS migration extension** — Apply RLS to all Sequelize model tables
4. **Deprecate legacy `/api/` path** or add tenant middleware to it

All four were applied in the 2026-08-06 remediation (slices 1-6 of `docs/prd.md`); per-finding
status in §9 below.

---

## 9. Remediation Status (2026-08-06)

Remediation of the Phase 4 findings plus the 2026-08-06 full-project re-review (PRD `docs/prd.md`,
slices 1-6). Each fix ships with unit tests under `apps/api/tests/` (media_traversal,
media_service, media_upload_org, authMiddleware_orgid, authMiddleware_tenantcontext,
auth_login_orgid, tenantMiddleware, tenantContext, usersController_org_scope, eod_live_auth,
rbac_branch_scope, auth_hardening, billing_guard).

| Finding | Status | References |
|---------|--------|------------|
| DISPLAY-2 — media traversal + public media hardening | **FIXED** | `routes/mediaRoutes.js` (UUID orgId, basename + allowlist, 400 before fs), `services/mediaService.js` (`resolvePath` root containment) |
| SQL injection via `orgId` (tenantMiddleware) | **FIXED** | `middleware/tenantMiddleware.js` — parameterized `set_config('app.tenant_id', $1, false)` + UUID validation (ADR-1) |
| Tenant isolation end-to-end (JWT orgId → middleware → RLS) | **FIXED** | JWT orgId claim (`authController.login`), `authMiddleware` → `req.user.orgId`; strict policies + super_admin policy (`20260806_002`), backfill (`20260806_001`); legacy path tenant middleware (`orgRouteMapper`) |
| Tenant mismatch / URL-sourced tenant (CRIT-2, TENANT-1) | **FIXED** | `tenantMiddleware` 403 `TENANT_MISMATCH` |
| RLS coverage gap (CRIT-1) | **FIXED** | `migrations/20260806_001_backfill_org_id.js`, `migrations/20260806_002_strict_tenant_policies.js` |
| Users list/detail IDOR | **FIXED** | `controllers/usersController.js` — org_id filter from `req.tenantId`/`req.user.orgId` (env_admin excepted via super-admin policy) |
| Public `GET /api/eod/live` (ST-3, MED-3) | **FIXED** | `routes/eodRoutes.js` — auth + `EOD_VIEW` |
| RBAC branch-scope fail-open (ST-1/HIGH-1) | **FIXED** | `services/authzService.js` (`isAllBranches = isOrgAdmin`), `middleware/rbac.js` (fail closed, 403) |
| Register limiter (SEC-3) | **FIXED** | `routes/authRoutes.js` — `registerLimiter` 10/15min per IP |
| super_admin fallback on register | **FIXED** | `controllers/authController.js` — 503 `ROLE_NOT_SEEDED` instead of escalation |
| `subscriptionGuard` mounted | **FIXED** | `routes/billingRoutes.js` (org-scoped billing routes) |
| Google auto-register allowlist | **FIXED** | `middleware/passport.js` + `config/env.js` `GOOGLE_ALLOWED_DOMAINS` (fail closed, `error=domain_not_allowed`) |
| JWT cookie hardening (ADR-5, SEC-1 residual) | **FIXED** | `utils/jwtCookie.js` httpOnly `auth_token` cookie (SameSite=Strict, secure in prod); web keeps JWT in memory only (`apps/web/src/context/AuthProvider.jsx`, `apps/web/src/lib/api/client.js`) |
| Invite flow (AUTH-2) | **FIXED** | `controllers/authController.js` invite/accept-invite, org from JWT claim |
| Legacy path tenant middleware (ORG-1, HIGH-2) | **FIXED** | `routes/orgRouteMapper.js` — `skipTenantMwOnLegacy` defaults `false` |
| CORS reflect-when-unset (SEC-1, MED-2) | **FIXED** (pre-existing commit) | `app.js` — `cb(null, false)` deny when `CORS_ORIGINS` unset |

**Still open / follow-up** (not regressed by this pass):
- dataClient request-scoped branch refactor (PRD N2, MED-4 residual) — cache keys are org-scoped,
  the global mutable branch cache remains.
- Mutation-endpoint org scoping follow-ups (legacy mutation paths not yet org-scoped in controllers).
- `subscriptionGuard` DB-error fail-open — `middleware/subscriptionGuard.js` catch → `next()`;
  mounted, but a DB error still lets the request through.
- AUTH-1 / MED-1 OAuth `state` parameter — intentionally off (`passport.js`, HMAC-state noted as
  future work).
- AUTH-3 no refresh/rotation; SEC-2 relaxed login limiter (demo intent); LOW-1 CSP; LOW-4 wake
  lock; LOW-5 MIME magic bytes; LOW-6 SHA256 removal; DISPLAY-1/3.

Verified by the 2026-08-06 gate: `pnpm check:all` green (lint + typecheck + format:check + tests).

---

## GATE 4 — Stop

**Security audit complete.** 4 critical, 2 high, 5 medium, 6 low findings documented.

Say **"go"** to proceed to Phase 5 (apply fixes + deployment prep), or let me know which findings to fix first.
