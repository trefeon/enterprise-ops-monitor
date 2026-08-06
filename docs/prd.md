# PRD — Security & Multi-Tenant Isolation Remediation (Phase 2 Wave A follow-up)

**Date:** 2026-08-06
**Status:** Approved for implementation
**Base:** `master` @ `417e513` (working tree was clean)
**Owner:** Orchestrator (planning/acceptance), implementor (slices), verifier (gates)

---

## 1. Problem Statement

A full-project security review (verifier, 2026-08-06, forest findings at `docs/` baseline of
`SECURITY_AUDIT.md`) found the multi-tenant SaaS refactor of Phase 2 is **not actually
tenant-isolated and contains two critical remote-code-class vulnerabilities**:

1. **Critical — Unauthenticated arbitrary file read (path traversal).**
   `GET /api/media/:orgId/:filename` has no auth, and `mediaService.resolvePath` does a bare
   `path.join(MEDIA_ROOT, relativePath)` with no containment check. Express percent-decodes
   params, so `..%2F` sequences escape `MEDIA_ROOT` and can stream `.env` (JWT_SECRET, DB creds).
2. **Critical — SQL injection via `orgId`.**
   `tenantMiddleware.js:40` interpolates the unvalidated URL param into
   `SET LOCAL app.tenant_id = '${tenantId}'`. node-postgres simple-query protocol allows
   multi-statement execution when no bindings are used → arbitrary SQL.
3. **Critical — No working tenant isolation end-to-end.**
   - JWT never carries `orgId` for DB-user logins (`authController.login:77-81`) → the
     `TENANT_MISMATCH` guard in `tenantMiddleware` is dead code.
   - `SET LOCAL` outside a transaction is a Postgres **no-op** → RLS context never applies.
   - RLS policy `org_id IS NULL OR …` (`migrations/20260707_002_enable_rls.js:67-68`) exposes
     every NULL-org row to every tenant; no backfill migration exists
     (ARCHITECTURE.md §6 required 003/004), so Users/Stores/EODLogs/RBAC rows stay NULL → shared.
   - Legacy `/api/*` paths skip `tenantMiddleware` (`orgRouteMapper.js:24-45`).
4. **High-risk IDORs and fail-open paths** (users list/detail, media upload orgId derivation,
   public `/api/eod/live`, global branch state in `dataClient`, RBAC branch fail-open, broken
   invite flow).
5. **Medium hardening gaps** (`subscriptionGuard` unmounted, unthrottled `register`,
   super_admin fallback, Google auto-register, JWT in localStorage).
6. **Environment/baseline defects:** `passport*` required but missing from `apps/api/package.json`
   (2 failing test files), `DB_PORT` missing from `config/env.js` zod schema, `mime-types`
   missing from package.json, 22 files failing `format:check`.

**Also discovered during planning:** repo was relocated from `D:\enterprise-ops-monitor` →
`D:\github_repo\enterprise-ops-monitor` with 673 dead `node_modules` junctions. **Fixed**
(orchestrator): links removed + `pnpm install --force` re-created them from the intact store.
`typecheck` is green. API lint has 160 errors (153 auto-fixable prettier).

**Deferred by environment:** No local Postgres/Docker → migrations and DB-backed tests are
syntax/schema-reviewed and **must be executed on first deployment** (documented per migration).

---

## 2. Goals & Non-Goals

### Goals
- G1. Eliminate the two critical vulnerabilities (path traversal, SQL injection).
- G2. Make tenant isolation actually work: JWT orgId → middleware → RLS context → strict policies,
      with existing data backfilled to a default tenant.
- G3. Close all High IDOR / fail-open findings.
- G4. Apply the Medium hardening items and package/config fixes.
- G5. Restore a green baseline: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm format:check`.
- G6. Update `SECURITY_AUDIT.md` / `ARCHITECTURE.md` to reflect verified fixes.

### Non-Goals
- N1. Schema-per-tenant or subdomain routing (documented Phase 2 decision, unchanged).
- N2. Full request-scoped refactor of `dataClient` global branch cache (see Slice D residual risk).
- N3. S3 media backend, payment gateway integration, production email sending.
- N4. Browser-side migration of all UI pages to org-scoped URLs (API contract preserved on legacy paths).

---

## 3. Architectural Decisions (ADRs)

### ADR-1: Tenant context via `set_config(..., false)` (session-scoped) with per-request cleanup
- **Decision:** Replace `SET LOCAL app.tenant_id = '…'` with parameterized
  `SELECT set_config('app.tenant_id', $1, false)`; reset to NULL on response finish
  (`res.on('finish')`), and ALWAYS reset at request start when no tenant applies.
- **Why:** `SET LOCAL` outside a transaction is a no-op; wrapping every request in a managed
  transaction (`models/index.js` sequelize.transaction) would require rewriting every controller
  to use `{ transaction }`. Session-scoped `set_config` is immediate, works for all existing
  queries, and is safe with pool reuse thanks to the reset-on-finish + reset-on-request discipline.
- **Risk:** pooled connection state — mitigated by unconditional reset at request start (NULL when
  no tenant, tenant value otherwise) and cleanup on finish.

### ADR-2: RLS strict policy + env_admin escape
- **Decision:** Replace the `org_id IS NULL OR …` escape with the documented strict policy:
  `USING (org_id::text = current_setting('app.tenant_id', TRUE))` **and** a second policy
  `USING (current_setting('app.is_super_admin', TRUE) = 'true')` for the `.env` admin.
  Backfill NULL `org_id` rows on tenant tables to the default tenant (migration 20260806_001).
- **Why:** "NULL-safe: if app.tenant_id is not set, return zero rows" per ARCHITECTURE.md §2.2.
  The super-admin policy preserves cross-tenant admin (env_admin) while removing the NULL leak.

### ADR-3: Org derived from auth, never from user input for write paths
- Upload/media endpoints resolve `orgId` exclusively from `req.user.orgId` (JWT) /
  `req.tenantId` (after tenant middleware). Client-supplied `orgId` in path/body is validated
  against JWT and rejected on mismatch.

### ADR-4: Public surface minimalism
- `GET /api/eod/live` becomes authenticated + permission-gated (`EOD_VIEW`).
- `GET /api/media/:orgId/:filename` remains public (documented SECURITY_AUDIT DISPLAY-2 design)
  but is hardened: UUID `orgId` validation, basename-only `filename` with allowlisted
  extensions, and a root-containment check in `resolvePath`.

### ADR-5: Cookie + token dual issuance (auth hardening)
- Login/register/refresh/google-callback set an `auth_token` **httpOnly, SameSite=Strict, secure**
  cookie in addition to returning the token in the body (backward-compatible clients).
- Frontend stops persisting the JWT in `localStorage`; keeps it in memory using the body token;
  all requests use `credentials: 'include'`. No CSRF token required for SameSite=Strict. (If a
  later requirement adds cross-site calls, re-introduce a CSRF token.)

---

## 4. User Journeys & Acceptance

### J1. Tenant user sees only their org's data
- Login as a DB user of tenant A → list users / stores / EOD → only tenant A rows appear.
- Requests with `:orgId` of tenant B → `403 TENANT_MISMATCH`.
- **AC:** verified via unit tests mocking `req.tenantId` and via RLS policy SQL assertions.

### J2. Attacker cannot escape media root
- `GET /api/media/<uuid>/..%2F..%2F.env` and variants → `400`/`404`, never a file stream.
- **AC:** automated tests assert non-UUID orgId and `..`-bearing filenames are rejected before
  any `fs` access, and `resolvePath` returns `null` for any resolved path outside `MEDIA_ROOT`.

### J3. Registered users can be invited (invite flow works)
- An org admin with an org (JWT orgId claim present) invites an email → user created under their
  org, invite link returned.
- **AC:** invitation no longer 400s; created user has correct `org_id`; NULL fallback removed.

### J4. Baseline is green
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm format:check` all pass.
- **AC:** `check:all` passes; the 2 passport-blocked test files run green (or skip cleanly).

---

## 5. Implied schemas (migrations)

### 20260806_001_backfill_org_id.js (data-only)
- For each org-scoped table with NULL `org_id` rows (Users, Stores/EODLvs/data_* stores,
  EODLogs, SyncLogs, SyncSummaries/SystemLogs?, employees, RBAC rows, screens/playlists/media/
  subscriptions/billing): `UPDATE … SET org_id = (SELECT id FROM tenants ORDER BY created_at
  LIMIT 1) WHERE org_id IS NULL`.
- Use raw SQL, single transaction; log row counts per table (same shape as
  `utils/ensureDefaultTenant.js`). Skip tables without meaningful legacy data if unavoidable,
  but business tables MUST be backfilled.
- `BYPASSRLS` note: with policies not yet strict, migration runs before 002 in the same run —
  order matters (001 before 002) — the runner sorts by filename so `001_…_backfill` < `002_…_strict`.

### 20260806_002_strict_tenant_policies.js (DDL)
- Iterate the same table list as 20260707_002; drop `tenant_isolation_policy`; create:
  - policy `tenant_isolation_policy`: `USING (org_id IS NOT NULL AND org_id::text =
    current_setting('app.tenant_id', TRUE))` (WITH CHECK same).
  - policy `super_admin_policy`: `USING (current_setting('app.is_super_admin', TRUE) = 'true')`.
- Keep `FORCE ROW LEVEL SECURITY`.

---

## 6. Full task list (see TODO.md for checkable items and acceptance notes)

| # | Slice | Worker | Verify gate |
|---|-------|--------|-------------|
| 1 | Dependencies & env schema (passport*, mime-types, DB_PORT) | implementor | tests green |
| 2 | Media traversal + upload null fix | implementor | unit tests |
| 3 | SQLi fix + JWT orgId plumbing + invite | implementor | typecheck + tests |
| 4 | **RLS isolation wiring (backfill migration, strict policies, tenantMiddleware cleanup, legacy tenant middleware, dataClient org keys) | implementor | check:all |
| 5 | IDOR closures (users list/get, eod /live, rbac fail-closed) | implementor | unit tests |
| 6 | Auth hardening (register limiter, no super_admin fallback, cookie, Google domains) | implementor | typecheck + tests |
| 7 | Format + cleanup + docs refresh | implementor | check:all green |
| — | Final verification gate | verifier | full check:all + spec review |

Dependencies: 1 → 2/3 → 4 → 5 → 6 → 7. 2/3 are independent of each other after 1.

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| RLS strict policy breaks admin reads (system logs, backups) | High | super_admin policy; verify SystemLogs/BackupLogs are org-scoped in line with ARCHITECTURE §3.2 (they are tenant-scoped) |
| `set_config` cleanup race under concurrent requests | Med | sequential test in slice 3; always reset at start of request and on finish |
| Migration order/data issues on real DB | Med | verification step on deploy; migrations run forward-only; keep 001 backfill before 002 |
| dataClient global branch list race (org A leaks branches list to org B) | Low-Med | org-scoped cache keys; residual risk N2 documented to README/ARCHITECTURE |
| Cookie change breaks legacy display/agent clients | Med | dual delivery (cookie + body token) keeps all existing clients working |

---

## 8. Definition of Done
- All TODO items checkable & done; `check:all` green; migrations syntax- and schema-checked;
  verifier gate passed with exact commands/results; `SECURITY_AUDIT.md`/`ARCHITECTURE.md` updated.

## 9. Out of scope → next phase
- dataClient request-scoped branch refactor (N2)
- production email/payments