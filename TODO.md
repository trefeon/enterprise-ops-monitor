# TODO — Security & Multi-Tenant Isolation Remediation

> Companion to `docs/prd.md` (ADRs, journeys, schema). Each item: accept when the stated
> acceptance note is verified by the implementor's own run and the verifier gate.

## Baseline (orchestrator, DONE)
- [x] Repair 673 dead node_modules junctions (repo moved D:\enterprise-ops-monitor → D:\github_repo\enterprise-ops-monitor); `pnpm install --force` re-linked from intact store
- [x] Baseline: `pnpm typecheck` PASS · `pnpm --filter web lint` PASS · API lint 160 err (153 fixable) · API tests 56 pass / 2 fail (`Cannot find module 'passport'`) · 22 files fail format:check

## Slice 1 — Dependencies & env schema (implementor)
- [ ] Add to `apps/api/package.json` deps: `passport`, `passport-jwt`, `passport-local`, `passport-google-oauth20`, `mime-types` (verify against `middleware/passport.js` imports + `mediaRoutes.js`)
- [ ] Add `DB_PORT: z.coerce.number().int().positive().optional()` to `apps/api/config/env.js` (used by `models/index.js` and `migrations/run.js`)
- [ ] `pnpm install`; acceptance: `pnpm --filter api test` no longer fails with "Cannot find module 'passport'"; typecheck still green
- [ ] Check `passport.initialize()` is called where middleware/passport.js is used (authRoutes/google flow) and app boots without passport error

## Slice 2 — CRITICAL: media path traversal + upload hardening (implementor)
- [ ] `apps/api/services/mediaService.js` `resolvePath`: resolve + verify containment under `MEDIA_ROOT` (normalize, prefix check, `..` rejection); return null otherwise
- [ ] `apps/api/routes/mediaRoutes.js` GET `/:orgId/:filename`: zod-validate `orgId` as UUID; `filename` as basename only (no `/`, `\`, `..`; allowlist `jpg|jpeg|png|webp|mp4|webm`); 400 on invalid — before any fs access
- [ ] Upload path: derive `orgId` from `req.tenantId`/`req.user.orgId` only (never `req.params.orgId || req.body.orgId || req.authz?.orgId` when it can be attacker-controlled); if `req.user.id === 'env_admin'` set `uploaded_by` NULL (FK UUID violation fix)
- [ ] Tests: traversal variants (encoded `..%2F`, backslashes, absolute paths, non-UUID orgId) → 400/404 with no stream; resolvePath containment unit tests
- [ ] Acceptance: `pnpm --filter api test` new tests pass; `node --check` clean

## Slice 3 — CRITICAL: SQL injection + JWT orgId plumbing + invite (implementor)
- [ ] `apps/api/middleware/tenantMiddleware.js`: parameterized `SELECT set_config('app.tenant_id', $1, false)`; validate tenantId as UUID before use; reset `app.tenant_id` to NULL at request start when no tenant + on `res.on('finish')`; set `app.is_super_admin = 'true'` for env_admin; keep `TENANT_MISMATCH` 403 (now effective once JWT carries orgId)
- [ ] `apps/api/middleware/authMiddleware.js`: set `req.user.orgId` from JWT claim
- [ ] `apps/api/controllers/authController.js` `login`: include `orgId: dbUser.org_id` in JWT sign payload (register/acceptInvite/refresh/googleCallback already do)
- [ ] `invite`: works for org users (`req.user.orgId` now populated); verify user_roles row carries org_id; keep response shape (inviteToken + inviteUrl) — document token-in-body as accepted trade-off
- [ ] Tests: login token contains orgId claim; tenantMiddleware sets/resets set_config (mock sequelize); mismatch → 403
- [ ] Acceptance: typecheck + `pnpm --filter api test` green

## Slice 4 — CRITICAL: RLS strict + backfill + isolation wiring (implementor, heaviest)
- [ ] Migration `apps/api/migrations/20260806_001_backfill_org_id.js`: backfill NULL `org_id` on tenant tables (Users, Stores/Employees/EODLogs/SyncLogs/afterhours/boot-time data_* tables, RBAC rows `UserRoles`/`UserBranchScopes`/`UserPermissionOverrides`, screens/playlists/media/subscriptions/billing_invoices) to default tenant (`SELECT id FROM tenants ORDER BY created_at LIMIT 1`); one transaction; log per-table rowCounts; forward-only
- [ ] Migration `apps/api/migrations/20260806_002_strict_tenant_policies.js`: for every table in 20260707_002 list — drop old policy; create `tenant_isolation_policy` strict (`org_id IS NOT NULL AND org_id::text = current_setting('app.tenant_id', TRUE)`) + `super_admin_policy` (`current_setting('app.is_super_admin', TRUE) = 'true'`); keep FORCE RLS
- [ ] `tenantMiddleware`: session-scoped set_config per ADR-1 (integrate with Slice 3 change); set is_super_admin for env_admin
- [ ] `apps/api/routes/orgRouteMapper.js`: change `skipTenantMwOnLegacy` default → `false` so legacy `/api/*` paths also get tenant isolation (keep option for auth/system routes if proven necessary)
- [ ] `apps/api/services/dataClient.js`: include orgId in all cache keys (`data:eod:all` → `data:{orgId}:eod:all` etc. per file inventory); call `setOrgId` from tenantMiddleware after tenant resolution
- [ ] Verify: migrations load (`node --check` + `node migrations/run.js --dry` if supported, else require-check); no SQLi strings remain (`grep set_config`/`SET LOCAL` clean); typecheck green
- [ ] **Deployment note:** run `node apps/api/migrations/run.js` on first deploy with real Postgres (documented in migration headers)

## Slice 5 — HIGH: IDOR + public endpoint + fail-open (implementor)
- [ ] `apps/api/controllers/usersController.js`: `listUsers` + `getUser` add `org_id` filter from `req.tenantId`/`req.user.orgId` unless env_admin (super admin) — check `authzService`/`rbacHelpers` for existing helpers to reuse
- [ ] `apps/api/routes/eodRoutes.js` `GET /live`: require `authMiddleware` + `requirePermission("EOD_VIEW")` (remove public); controller stays org-scoped via tenant middleware
- [ ] `apps/api/middleware/rbac.js` branch-scope: fail closed — when scope requires a branch and none resolves, return 403 (not `next()`); keep explicit `branch_id` checks
- [ ] Tests for each closure (IDOR returns only org rows; /live 401 without token; branch-scope 403 when unresolvable)
- [ ] Acceptance: `pnpm --filter api test` green

## Slice 6 — MEDIUM: auth & billing hardening (implementor)
- [ ] `apps/api/routes/authRoutes.js`: add register limiter (e.g. 10/15min per IP, mirroring loginLimiter style); mount on `/api/auth/register`
- [ ] `authController.register`: remove super_admin fallback — if `org_owner` role not seeded, return `503 ROLE_NOT_SEEDED` with actionable message (do not escalate)
- [ ] `subscriptionGuard`: read it; mount on org-scoped billing routes (app.js or billingRoutes) so billing gates are live
- [ ] Google auto-register (`middleware/passport.js` ~173-202): gate behind `GOOGLE_ALLOWED_DOMAINS` (comma-separated env, add to env.js schema); if auto-register enabled but email domain not allowed → redirect with `error=domain_not_allowed`; never auto-register when env unset
- [ ] Cookie issuance (ADR-5): on login/register/refresh/googleCallback set `auth_token` httpOnly SameSite=Strict (secure when NODE_ENV=production); keep body token for compat; frontend `apps/web/src/lib/api/client.ts` + `AuthProvider.jsx`: stop `localStorage` persistence (in-memory token), `credentials: 'include'`
- [ ] Acceptance: typecheck (web+api) green; tests green; grep confirms no `localStorage.setItem('token'` remains

## Slice 7 — Quality: format, cleanup, docs (implementor)
- [ ] `eslint --fix` + prettier the 22 formatting-failing files; `pnpm format:check` green
- [ ] Remove stray scripts `apps/api/test_parallel_sync.js` + `apps/api/tests/benchmark_sync_logic.js` only after grep confirms nothing references them; otherwise leave with TODO comment
- [ ] Update `SECURITY_AUDIT.md`: mark DISPLAY-2 fixed (traversal), SQLi fixed, RLS strict, register/invite fixed; update `ARCHITECTURE.md` §6 status (backfill/strict done) + ADR-1 note (set_config session-level)
- [ ] Acceptance: `pnpm check:all` green

## Final gate (verifier)
- [ ] Verifier: run full `check:all`; review diff vs TODO; confirm every finding from the original review is addressed or explicitly deferred (N2, token-in-body); report Worker Result with exact commands/results
- [ ] Orchestrator: accept, save memory summary
