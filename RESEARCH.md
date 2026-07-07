# Phase 0 — Research & Inventory: EOM → Multi-Tenant SaaS Pivot

**Generated:** 2026-07-07
**Scope:** All 5 parallel research tracks complete. No code changes yet.

---

## Table of Contents

1. [Repo Audit — Single-Tenant Assumptions](#1-repo-audit--single-tenant-assumptions)
2. [Auth Research — Express 5 + Sequelize](#2-auth-research--express-5--sequelize)
3. [Multi-Tenancy Pattern Research](#3-multi-tenancy-pattern-research)
4. [Competitor / Market Scan](#4-competitor--market-scan)
5. [Billing Provider Research](#5-billing-provider-research)
6. [Key Decisions for Phase 1](#6-key-decisions-for-phase-1)

---

## 1. Repo Audit — Single-Tenant Assumptions

**Source:** `/tmp/ph0_repo_audit.md` (323 lines, full code inspection of 15 route files, 15 Sequelize models, 4 middleware files, 14 controllers, 3 services, 16 frontend pages)

### Verdict: 15 confirmed findings, 3 unverified, zero org awareness anywhere

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| 1 | **No `org_id` column on any table** | Critical | All models + `ensureDb.js` schema |
| 2 | **No org in JWT payload or auth context** | Critical | `authMiddleware.js`, `authzService.js` |
| 3 | **`isAllBranches` grants global data access** | Critical | `authzService.js` — empty scope = all data |
| 4 | **All `dataDb.js` queries lack org WHERE clause** | Critical | All raw SQL queries |
| 5 | **`getLiveEodRanking()` is public (no auth) with no filter** | Critical | `eodController.js` — TV dashboard endpoint |
| 6 | **8 branches hardcoded in `dataClient.js`** | High | `services/dataClient.js` |
| 7 | **8 branches hardcoded in `ensureDb.js` seed** | High | `utils/ensureDb.js` |
| 8 | **8 branches hardcoded on frontend** | High | `StoreManagement/index.tsx` |
| 9 | **No org routing prefix on any route** | High | All 15 route files |
| 10 | **SystemLog, BackupLog, AgentMonitoring have no org scope** | High | All system-level models |
| 11 | **User management is global** | High | `usersController.js` |
| 12 | **Backend API URLs have no org path** | Medium | `dataClient.js` |
| 13 | **Dashboard hardcodes "Across 8 regions"** | Medium | `Dashboard/index.tsx` |
| 14 | **Seed scripts create data for one org** | Medium | `seed.js`, `seedRbac.js` |
| 15 | **BranchName aliases are fixed** | Low | `utils/branchNames.js` |

### What Already Helps Multi-Tenancy

- ✅ **UserBranchScope model** + `getAllowedBranches()` — branch-level RBAC works
- ✅ **`requirePermission({scope:"branch"})`** — middleware infrastructure for scoped access
- ✅ **Branch-filtering in controllers** — `applyScopeFilters()`, `filterEmployees()`
- ✅ **RBAC v2** — Roles, permission overrides, branch scopes all in place

### What Must Change

1. Add `org_id`/`tenant_id` to **every table and every SQL query**
2. Add `org_id` to **JWT payload and `req.authz`**
3. Add org routing to **all 15 route files**
4. Replace **hardcoded BRANCHES arrays** with org-scoped dynamic resolution
5. Fix **`isAllBranches` semantic** — empty scopes must NOT equal global access
6. **Public endpoints** (`/api/eod/live`, `/api/sync/live`) must be org-scoped or disabled
7. Add org-scoping to **`ensureDb.js`, seed scripts, frontend API calls**

---

## 2. Auth Research — Express 5 + Sequelize

**Source:** `/tmp/ph0_auth_research.md` (200 lines, fact-checked against current npm/GitHub/docs July 2026)

### Libraries Evaluated

| Library | Verdict for EOM |
|---------|----------------|
| **Passport.js** (v0.7.0) | 🟡 Works but maintenance mode. Express 5 compat **unverified** but plausible (Connect middleware pattern) |
| **Auth.js / NextAuth** (redirects to Better Auth) | 🔴 **Not compatible with Express** — Web API Request/Response only |
| **Lucia** (v3) | 🔴 **Deprecated** — pivoted to learning resource. No Sequelize adapter |
| **Better Auth** (v1.6.23) | ✅ **Recommended for greenfield** — explicit Express 5 support, built-in Google OAuth + email/password + account linking, 29k stars, actively maintained |
| **DIY Passport + Sequelize** | ✅ Safest for existing Sequelize codebase — proven patterns |
| **Bare-metal DIY** | ✅ Zero dependency risk — guaranteed Express 5 compat |

### Key Constraint

Better Auth has **no official Sequelize adapter** — auth tables would run alongside Sequelize via Kysely/pg. A community adapter exists but is too immature to trust (0 stars, not on npm).

### Recommendation

| Priority | Option | Why |
|----------|--------|-----|
| 🥇 | **Better Auth** + parallel Sequelize | Lowest total code, explicit Express 5 docs, built-in everything |
| 🥈 | **Passport.js + Sequelize** | Safest for existing codebase; validate Express 5 immediately |
| 🥉 | **Bare-metal DIY** | Fallback if Passport breaks on Express 5 |

**Immediate action needed:** Test `passport.authenticate()` on Express 5 before committing to Option B.

---

## 3. Multi-Tenancy Pattern Research

**Source:** `/tmp/ph0_multitenancy_research.md` (293 lines, 7 sources, PostgreSQL 15)

### Patterns Compared

| Dim | Shared Schema + `tenant_id` + RLS | Schema-Per-Tenant | DB-Per-Tenant |
|-----|------------------------------------|-------------------|---------------|
| **Isolation** | ★★★☆☆ (logical + RLS) | ★★★★☆ (schema) | ★★★★★ (physical) |
| **Ops complexity** | ★★★★★ (simple) | ★★☆☆☆ (complex) | ★☆☆☆☆ (very complex) |
| **Cost** | ★★★★★ (cheapest) | ★★★★☆ | ★★☆☆☆ |
| **Sequelize compat** | ★★★★★ (standard) | ★★☆☆☆ (per-schema loops) | ★★☆☆☆ (dynamic instances) |
| **Existing data → Org 1** | ★★★★★ (add column + backfill) | ★★☆☆☆ (schema extraction) | ★☆☆☆☆ (DB dump/restore) |
| **Time to ship** | **Days** | Weeks | Weeks+ |

### Recommendation: **Shared Schema + `tenant_id` with RLS**

**Binding constraint:** Sequelize compatibility. Schema-per-tenant requires looping migrations and raw SQL schema-switching. DB-per-tenant requires dynamic Sequelize instances and PgBouncer. Both add weeks of plumbing with no direct business value.

**RLS makes shared-schema safe** — PostgreSQL Row-Level Security provides database-enforced isolation. Even a missing `WHERE` clause can't leak data. This satisfies SMB compliance requirements.

**Future-proofing:** Tiered isolation pattern allows graduating specific tenants to dedicated schemas or databases later without rewiring the codebase.

**Migration path:**
1. Add `tenants` table (migration)
2. Add `tenant_id` to all domain tables + backfill
3. Set NOT NULL constraint after backfill
4. Enable RLS + create policies
5. Add composite indexes `(tenant_id, ...)`
6. Express middleware: resolves tenant → `SET LOCAL app.tenant_id`
7. Verify cross-tenant access returns empty

---

## 4. Competitor / Market Scan

**Source:** `/tmp/ph0_competitor_research.md` (509 lines, 17 products across 3 categories)

### Category A: Branch Ops & Compliance Platforms (direct competition)

| Product | Pricing | SEA Presence | Notes |
|---------|---------|-------------|-------|
| **Wooqer** | Custom (per location) | ✅ Singapore HQ | **Closest competitor** — AI compliance, checklists, audits, multi-location. No EOD sync/backup health |
| **Zenput** (Crunchtime) | $40/loc/mo | ❌ Global, no ID office | Food safety compliance, checklists, IoT temp monitoring |
| **Jolt** | $79-99/loc/mo | ❌ Global, no ID office | Checklists, temperature logging, employee accountability |
| **Xenia** | Custom per location | ❌ Limited SEA | AI-powered ops execution, maintenance tracking |
| **Operandio** | $7.91/user/mo | ❌ AU-based | Checklists, audits, franchise-specific features |

### Category B: POS-Adjacent Tools (overlap but not competition)

| Product | Pricing | Multi-Branch Features |
|---------|---------|----------------------|
| **Moka POS** | Rp299K-799K/outlet/mo | Multi-outlet dashboard, basic reporting |
| **Pawoon POS** | Rp149K-299K/outlet/mo | Franchise management module (most franchise-friendly ID POS) |
| **ESB** | ~Rp500K-1M+/outlet/mo | **Strongest ID ecosystem** — POS+ERP+AI, multi-branch, fraud prevention (Starbucks ID, Krispy Kreme, Subway ID) |
| **Olsera POS** | Rp107K-224K/outlet/mo | Franchise dashboard, affordable |

### Category C: Digital Signage / Menu Boards

| Product | Pricing | Notes |
|---------|---------|-------|
| **Yodeck** | $12/screen/mo | Dayparting, remote management |
| **Screenly** | $11/screen/mo | Restaurant-specific templates |
| **Samsung VXT** | $10/screen/mo | Requires Samsung displays |
| **Rise Vision** | ~$10/screen/mo | Free tier with branding |
| **AiScreen** | $9/screen/mo [unverified] | AI scheduling |

### Gaps & Opportunities (Product-Market Fit)

| Gap | Competitors | EOM Opportunity |
|-----|-------------|-----------------|
| **EOD Sync Health Monitoring** | None of 17 products do this | ✅ Clear moat — nobody actively monitors branch EOD sync status |
| **Backup Health Management** | None of 17 products do this | ✅ Second moat — branch backup completion tracking is absent market-wide |
| **Compliance + POS sync convergence** | Ops platforms don't integrate with SEA POS (Moka, Pawoon, ESB) | ✅ Bridge the gap |
| **Affordable compliance for SEA** | All ops platforms are USD-priced ($40-100/loc/mo) | ✅ IDR-priced (Rp49-99rb/branch/mo) undercuts by ~5-15× |
| **All-in-one: POS+Ops+Signage** | Nobody offers all three | ✅ EOM scope includes ops + Live Menu Display |
| **Live Menu Display as SaaS add-on** | $10-12/screen/mo globally, no IDR option | ✅ Could bundle or offer as paid add-on |

---

## 5. Billing Provider Research

**Source:** `/tmp/ph0_billing_research.md` (412 lines, verified against current docs July 2026)

### Provider Comparison

| Dim | Stripe | Xendit | Midtrans |
|-----|--------|--------|----------|
| **IDR for ID-registered business** | ❌ — US entity required | ✅ BI-licensed | ✅ BI-licensed |
| **Subscription engine** | ✅ Mature (Billing) | ✅ Built-in subscriptions | ⚠️ Basic, needs manual renewal |
| **Per-seat/metered billing** | ✅ Native (Meters API) | ⚠️ Manual via metadata | ❌ Not supported |
| **Webhook lifecycle** | ✅ 50+ events | ✅ Payment events | ✅ Payment only |
| **PPN 11% handling** | ✅ Stripe Tax (limited ID support) | ❌ Manual at app layer | ❌ Manual at app layer |
| **Monthly platform fee** | 0.7% of volume [unverified] | Rp 2.5K/plan/mo [unverified] | **None** |
| **10 branches × Rp99K: est. cost** | ~Rp350-530K + FX | Rp82-107K | **Rp36K** |
| **50 branches × Rp49K: est. cost** | ~Rp800K-1.2M + FX | Rp423-548K | **Rp186K** |

### Recommendation

| Priority | Provider | When |
|----------|----------|------|
| 🥇 **Midtrans** | Start here | Fastest onboarding, lowest cost (no monthly fee, Rp4K VA vs Xendit Rp13K), broadest ID payment methods |
| 🥈 **+ Xendit** | Scale (50+ branches) | Better recurring engine when subscription sophistication is needed |
| 🥉 **Stripe** | Only if US entity → international expansion |

**Dual-provider strategy recommended:** Build a billing abstraction layer. Route subscriptions through Midtrans initially; add Xendit for recurring sophistication at scale. Stripe only via Stripe Atlas for global customers.

**PPN 11%:** Must be calculated at application layer regardless of provider — none auto-calculate on merchant subscription charges.

---

## 6. Key Decisions for Phase 1

### Flagged Assumptions (need explicit confirmation before Phase 1)

| # | Decision | Research says | Open question to Kurnia |
|---|----------|---------------|------------------------|
| 1 | **Target positioning** | Branch Ops Compliance SaaS for franchise/retail — strong PMF gap, undercuts USD competitors by 5-15× with combined EOD+backup+signage | Confirm or pivot? Also consider: (a) pure EOD sync health monitoring tool, (b) franchise ops platform for Indonesian F&B |
| 2 | **Tenant model** | Organization owns Branches (1:N). Org has employees. Clear from existing domain. | Agreed? |
| 3 | **Feature cut for v1** | 9 existing features → generalize (Store Sync→Branch Sync Health, etc.). Live Menu Display = new v1 feature | Which features ship v1 vs v2? |
| 4 | **Pricing** | Rp49-99rb/branch/month viable — undercuts Zenput/Jolt by 5-15×. Live Menu Display: paid add-on or base tier? | Open decision |
| 5 | **Constraint re-evaluation** | Mock API: likely drop for real data pipeline. CommonJS: migrate to ESM? Forced dark mode: keep or make configurable? Package versions: some must bump for multi-tenant deps | Which constraints to relax |
| 6 | **Auth approach** | Better Auth (recommended) vs Passport + Sequelize vs bare-metal DIY | Preference? |
| 7 | **Multi-tenancy pattern** | Shared Schema + tenant_id + RLS (days to ship, RLS-safe) | Agreed? |
| 8 | **Billing path** | Start with Midtrans (fastest, cheapest), Xendit at scale | Agreed? |
| 9 | **Media storage** | Local disk for demo/early scale → S3-compatible when real video assets accumulate | Agreed for Phase 1? |
| 10 | **Demo data scope** | How many demo orgs (2-3?), branches per org (3-5?), EOD history days, Live Menu Display assets | Want concrete numbers? |

---

## GATE 0 — STOP

**All 5 research tracks complete. No code changed.**

Presenting to Kurnia for review and explicit "go" before proceeding to Phase 1 (Product Repositioning & Spec / PRD.md).

*Every claim in this document is tagged with source or marked unverified in the source research files at `/tmp/ph0_*.md`.*
