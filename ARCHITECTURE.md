# Phase 2 — Architecture Redesign: EOM → Branch Ops Compliance SaaS

**Status:** GATE 2 — Drafting (awaiting subagent inventory results for exact schemas)
**Based on:** PRD.md (Phase 1) + Kurnia's decisions 2026-07-07

---

## 1. Architecture Overview

### Target Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser / Display Client             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Dashboard UI  │  │ Display       │  │ Signup UI    │  │
│  │ (React + Vite)│  │ Client /display│  │ (React)      │  │
│  └──────┬───────┘  │ :token        │  └──────┬───────┘  │
│         │          └──────┬───────┘         │          │
└─────────┼─────────────────┼──────────────────┼──────────┘
          │                 │                  │
          ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                     Nginx Reverse Proxy                   │
│  Route: /api/* → backend, /display/* → backend (no auth) │
│  Route: /* → frontend                                     │
└─────────┬────────────────┬─────────────────┬──────────────┘
          │                │                 │
          ▼                ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                 Express 5 Backend (apps/api)              │
│                                                           │
│  ┌───────────────────────────────────────────────────┐   │
│  │              Middleware Stack                       │   │
│  │  Tenant Resolution → RLS Context → Auth (Passport)  │   │
│  │  → RBAC → Route → Controller → Sequelize → PG      │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  Routes: /api/auth (OAuth+Local)                         │
│          /api/orgs/:orgId/* (all scoped endpoints)        │
│          /api/billing (Midtrans scaffold)                 │
│          /display/:screenToken (public, no auth)          │
│          /api/media (upload endpoints)                    │
│                                                           │
│  Services: AuthService, AuthzService, BillingService,     │
│            MediaService, TenantService, MailService       │
│            (Resend)                                       │
└─────────┬─────────────────────────────────┬───────────────┘
          │                                 │
          ▼                                 ▼
┌────────────────────┐        ┌──────────────────────────┐
│  PostgreSQL 15      │        │  Local Disk / S3          │
│  (Shared schema +   │        │  (Media assets)           │
│   RLS + tenant_id)  │        │                           │
│                     │        │  /data/media/             │
│  Tables:            │        │  └── {orgId}/             │
│   tenants           │        │      └── screens/         │
│   users             │        │      └── assets/         │
│   user_identities   │        │                           │
│   stores            │        │  Abstracted behind        │
│   branches          │        │  MediaService interface   │
│   employees         │        │  (swap to S3 anytime)    │
│   eod_logs          │        └──────────────────────────┘
│   sync_logs         │
│   backup_logs       │
│   screens           │
│   playlists         │
│   playlist_items    │
│   media_assets      │
│   roles             │
│   user_branch_scope │
│   ...               │
└────────────────────┘
```

---

## 2. Tenant Model & Data Isolation

### 2.1 Core Principle

**Shared schema + `tenant_id` + RLS.** All tenant-scoped tables have a `tenant_id` column (UUID, NOT NULL). PostgreSQL Row-Level Security (RLS) enforces isolation at the database level — a missing `WHERE` clause cannot leak data.

### 2.2 RLS Implementation

```sql
-- On every tenant-scoped table
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores FORCE ROW LEVEL SECURITY;

-- Single policy for all operations
CREATE POLICY stores_tenant_isolation ON stores
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- NULL-safe: if app.tenant_id is not set, return zero rows
```

**Express middleware** sets the RLS context per request:
```js
// Tenant resolution middleware
app.use(async (req, res, next) => {
  const tenantId = resolveTenantId(req);  // from subdomain, JWT, or header
  if (tenantId) {
    req.tenantId = tenantId;
    await sequelize.query(`SET LOCAL app.tenant_id = '${tenantId}'`);
  }
  next();
});
```

**Key rules:**
- Use `SET LOCAL` (not `SET`) — scoped to the connection/transaction (superseded by ADR-1 below)
- Migrations run as a role with `BYPASSRLS`
- Composite indexes lead with `tenant_id` for RLS filter performance

> **ADR-1 (2026-08-06): session-scoped `set_config` instead of `SET LOCAL`.** `SET LOCAL` outside a
> transaction is a Postgres no-op, and interpolating the tenant id into SQL was an injection vector.
> Tenant context is now applied with parameterized `SELECT set_config('app.tenant_id', $1, false)`,
> reset at request start (NULL when no tenant applies) and on `res.on('finish')` so pooled
> connections never leak context (`middleware/tenantContext.js` + `middleware/tenantMiddleware.js`);
> `app.is_super_admin` is set for `env_admin`.
>
> **ADR-2 (2026-08-06): strict policy + `super_admin` policy.** The permissive
> `org_id IS NULL OR …` policy leaked every NULL-org row to every tenant; migration
> `20260806_002_strict_tenant_policies.js` replaces it with `tenant_isolation_policy`
> (`org_id IS NOT NULL AND org_id::text = current_setting('app.tenant_id', TRUE)`) plus
> `super_admin_policy` (`current_setting('app.is_super_admin', TRUE) = 'true'`), after
> `20260806_001_backfill_org_id.js` backfills legacy NULL rows to the default tenant (FORCE RLS kept).

### 2.3 Tenant Resolution Strategy

For v1, resolve tenant from **JWT payload** for authenticated users. No subdomain routing (simpler, self-hosting compatible — no wildcard DNS needed).

```js
function resolveTenantId(req) {
  // Authenticated users: from JWT
  if (req.user?.tenantId) return req.user.tenantId;

  // Display client: from screen token
  if (req.params?.screenToken) {
    // Validate token and return the screen's org tenantId
    // (used in /display/:screenToken route only)
  }

  // Signup/onboarding: no tenant (handled by routes that don't need it)
  return null;
}
```

### 2.4 Tables Requiring `tenant_id`

**Existing tables that need `tenant_id` added:**

| Table | Has tenant_id? | Notes |
|-------|---------------|-------|
| tenants | ✅ NEW | Tenant registry |
| stores | ❌ ADD | Rename from `data_stores` |
| employees | ❌ ADD | Rename from `data_employees` |
| eod_current | ❌ ADD | `data_store_eod_current` |
| eod_history | ❌ ADD | `data_store_eod_history` |
| sync_logs | ❌ ADD | Rename from `store_sync_snapshot` / `sync_aud_latest` |
| backup_logs | ❌ ADD | Rename from backup tables |
| system_logs | ❌ ADD | Already exists as `SystemLogs` |
| agent_monitoring | ❌ ADD | ALREADY exists |
| screens | ✅ NEW | Live Menu Display |
| playlists | ✅ NEW | Live Menu Display |
| playlist_items | ✅ NEW | Live Menu Display |
| media_assets | ✅ NEW | Live Menu Display |

**Existing tables NOT tenant-scoped** (system-level, no tenant context):

| Table | Rationale |
|-------|-----------|
| migrations (SequelizeMeta) | Infrastructure |
| SequelizeMeta | Infrastructure |

**RBAC tables — extended with org context:**

| Table | Current | After |
|-------|---------|-------|
| roles | Global | + `org_id`, `is_system` for built-in roles copied per org |
| role_permissions | Global | No change (referenced by role_id) |
| user_roles | Global | No change (referenced by user_id + role_id) |
| user_permission_overrides | Global | + `org_id` |
| user_branch_scopes | Global | + `org_id` |

### 2.5 Auth Tables (Passport + Local Strategy)

These live alongside Sequelize-managed app tables in the same PostgreSQL DB but are managed by Passport flows, not necessarily Sequelize models (can be raw SQL or lightweight Sequelize models):

| Table | Purpose |
|-------|---------|
| users | Username, password_hash, email, tenant_id, role (owner/admin/member), is_active |
| user_identities | OAuth accounts (provider, provider_id, user_id FK) — for Google OAuth linking |
| sessions | (Optional) If session-store needed beyond JWT |

---

## 3. Data Model — Before / After Schema Diagram

### 3.1 Before (Single-Tenant EOM)

```
data_branches (hardcoded 8 rows)
  ├── data_stores (branch_id FK)
  │     ├── data_store_eod_current (store_code FK)
  │     ├── data_store_eod_history (store_code FK)
  │     ├── afterhours_pc_log
  │     ├── afterhours_config
  │     └── afterhours_monthly_report
  └── data_employees (branch_id FK)

Stores / SyncLogs / SyncSummaries (Sequelize models)
Users / roles / user_branch_scopes (Sequelize models)

SystemLogs / BackupLogs (global, no org)
agent_monitoring (global, no org)
```

### 3.2 After (Multi-Tenant Branch Ops Compliance)

```
tenants (id, name, slug, settings_json, created_at)
  │
  ├── stores (tenant_id, store_code, store_name, branch_id, area, region, ...)
  │     ├── eod_current (tenant_id, store_code, date, status, ...)
  │     ├── eod_history (tenant_id, store_code, date, status, ...)
  │     ├── afterhours_logs (tenant_id, store_code, ...)
  │     ├── afterhours_config (tenant_id, ...)
  │     └── afterhours_monthly_report (tenant_id, ...)
  │
  ├── employees (tenant_id, nik, full_name, branch_id, ...)
  │
  ├── sync_logs (tenant_id, store_code, ...)
  │
  ├── backup_logs (tenant_id, filename, status, ...)
  │
  ├── system_logs (tenant_id, level, component, message, ...)
  │
  ├── agent_monitoring (tenant_id, store_id, hostname, version, ...)
  │
  ├── screens (tenant_id, branch_id, name, token, is_active, ...)
  │     └── playlists (tenant_id, branch_id, name, daypart_config, is_active)
  │           └── playlist_items (tenant_id, playlist_id, media_asset_id, sort_order, duration_sec)
  │
  ├── media_assets (tenant_id, uploaded_by, filename, mime_type, storage_path, ...)
  │
  ├── users (tenant_id, username, email, password_hash, role, ...)
  │     └── user_identities (user_id, provider, provider_id)
  │
  ├── roles (tenant_id, name, label, is_system, ...)
  │     └── role_permissions (role_id, permission)
  │
  ├── user_roles (user_id, role_id, tenant_id)
  ├── user_branch_scopes (user_id, branch_id, tenant_id)
  └── user_permission_overrides (user_id, permission, effect, tenant_id)
```

---

## 4. Auth Redesign (Passport.js + Sequelize)

### 4.1 Strategy

Use Passport.js modular strategies within Express 5. No heavy auth framework — keep control over the auth flow while using battle-tested strategy packages.

| Strategy | Package | Purpose |
|----------|---------|---------|
| Local | passport-local | Email/password login |
| JWT | passport-jwt | Bearer token validation |
| Google OAuth 2.0 | passport-google-oauth20 | Google sign-in/sign-up |

### 4.2 Auth Flow

```
1. USER VISITS /login
   ├── Email/password form
   └── "Sign in with Google" button

2. EMAIL/PASSWORD FLOW:
   POST /api/auth/login
   → passport.authenticate('local')
   → Validate credentials against users table
   → Generate JWT { userId, tenantId, role, ... }
   → Return { token, user }

3. GOOGLE OAUTH FLOW:
   GET /api/auth/google
   → passport.authenticate('google', { scope: ['profile', 'email'] })
   → Google redirect → callback
   → passport.authenticate('google')
   → Check user_identities table
     ├── Existing: link to existing user account
     └── New: create user + identity + auto-create org (first-time) or show org selection
   → Generate JWT + redirect to dashboard

4. JWT VALIDATION (every protected request):
   passport-jwt strategy extracts and validates token
   → req.user = { id, tenantId, username, role, ... }
   → Tenant middleware sets RLS context
```

### 4.3 Account Linking

Support linking multiple OAuth providers + email/password to the same user account:

```sql
-- user_identities table
CREATE TABLE user_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,    -- 'google', 'email'
  provider_id VARCHAR(255) NOT NULL, -- Google sub, or email hash
  UNIQUE(provider, provider_id)
);
```

**Login flow with linking:**
1. User logs in with email/password → gets JWT
2. User goes to Profile → "Link Google Account"
3. Google OAuth flow → callback checks `user_identities`
4. If identity exists for another user → error "already linked"
5. If identity is new → create with `user_id = currentUser.id`
6. Future Google login on same email → auto-link by email match (configurable)

### 4.4 Invite-by-Email Flow

1. Org admin creates user → `POST /api/orgs/:orgId/invites`
2. Backend creates user record with `status = 'invited'`, generates invite token
3. Sends email via **Resend** with link: `https://app.branchops.com/accept-invite?token=xxx`
4. User clicks link → sets password → activates account
5. Token expires after 7 days

---

## 5. RBAC v2 Extension

### 5.1 Org-Level Roles

Current RBAC (single-org, branch-scoped) extends cleanly:

```
Org-Level Roles:
  ┌─────────────┬─────────────────────────────────────────┐
  │ Role         │ Capabilities                            │
  ├─────────────┼─────────────────────────────────────────┤
  │ Owner        │ Full control: billing, delete org,     │
  │              │ manage admins, all branch access        │
  ├─────────────┼─────────────────────────────────────────┤
  │ Admin        │ Manage users, roles, branches, settings │
  │              │ Can't delete org or change billing       │
  ├─────────────┼─────────────────────────────────────────┤
  │ Member       │ Branch-scoped operational access only   │
  │              │ Cannot manage users or settings          │
  └─────────────┴─────────────────────────────────────────┘
```

### 5.2 Extension Strategy

Add `org_id` to existing RBAC tables. Copy system roles per org on creation:

```sql
-- On org creation, clone system roles into the org
INSERT INTO roles (org_id, name, label, description, is_system)
VALUES
  (newOrgId, 'org_owner', 'Org Owner', 'Full control', true),
  (newOrgId, 'org_admin', 'Org Admin', 'Manage org', true),
  (newOrgId, 'org_member', 'Org Member', 'Branch access only', true);

-- Then copy the standard permissions for each role
```

### 5.3 Branch Scoping (existing, unchanged)

The existing `UserBranchScope` model and `requirePermission({scope:"branch"})` middleware remains the same — just gains `org_id` context. A user with `org_member` role can only see branches they're explicitly scoped to.

### 5.4 The `isAllBranches` Fix

**Critical change from Phase 0 finding:** The current semantic where empty `UserBranchScope` = global access (`isAllBranches = true`) must be changed for multi-tenant.

**New semantic:**
- If `role = 'org_owner'` or `role = 'org_admin'` → implicit `isAllBranches` within their org
- If `role = 'org_member'` → MUST have explicit branch scopes
- Empty `UserBranchScope` for an `org_member` = **zero branch access**, not all branches
- `isAllBranches` is now `isAllBranchesInOrg` — scoped to tenant

---

## 6. Migration Strategy

### 6.1 Forward-Only Sequelize Migrations

No rollback support. Each migration is additive or data-only.

```
Phase 2a (Data Model):
  001-create-tenants-table.js
  002-add-tenant-id-to-domain-tables.js
  003-backfill-tenant-id-for-org-1.js
  004-set-tenant-id-not-null.js
  005-enable-rls-on-domain-tables.js
  006-create-rls-policies.js
  007-add-tenant-id-to-rbac-tables.js
  008-create-screens-playlists-tables.js
  009-create-media-assets-table.js
  010-create-user-identities-table.js

Phase 2b (Schema Cleanup):
  011-rename-data_stores-to-stores.js
  012-rename-data_employees-to-employees.js
  013-consolidate-sync-tables.js
  014-add-composite-indexes.js

Phase 3 (Seed):
  015-create-demo-orgs.js
  016-backfill-90d-demo-data.js
  017-seed-live-menu-display-data.js
```

**Status (2026-08-06):** the plan's backfill / strict-policy steps (003-backfill-tenant-id-for-org-1
and the strict policies intended for 005/006) are delivered as
`migrations/20260806_001_backfill_org_id.js` (backfill NULL `org_id` rows on all tenant tables to the
default tenant — one transaction, idempotent, per-table row counts) and
`migrations/20260806_002_strict_tenant_policies.js` (strict `tenant_isolation_policy` +
`super_admin_policy`, FORCE RLS — ADR-2). Filename order (001 < 002) guarantees backfill runs before
strict policies; execute `node apps/api/migrations/run.js` on first deploy.

### 6.2 Existing Data → Org 1

The `ensureDb.js` boot-time schema (data_branches, data_stores, etc.) created for the original single-tenant demo must be migrated:

1. Create `tenants` row for "Org 1" (the original demo tenant)
2. Add `tenant_id` columns to all tables (nullable)
3. UPDATE all existing rows: `SET tenant_id = (SELECT id FROM tenants LIMIT 1)`
4. SET `tenant_id NOT NULL`
5. The existing 8 hardcoded branches in `data_branches` become the branches for Org 1
6. Enable RLS on all tables

**Status (2026-08-06):** the backfill (step 3) and RLS enforcement (steps 5-6) are delivered by
`20260806_001_backfill_org_id.js` and `20260806_002_strict_tenant_policies.js` (see §6.1), with the
default-tenant rule matching `utils/ensureDefaultTenant.js` (oldest tenant by creation).

---

## 7. Live Menu Display Architecture

### 7.1 Data Model

```sql
-- tables prefixed by org-scoping via tenant_id everywhere

CREATE TABLE screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES tenants(id),
  branch_id INT NOT NULL,   -- REFERENCES stores somehow, or branch_id
  name VARCHAR(255) NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  is_active BOOLEAN DEFAULT true,
  pairing_qr_url TEXT,       -- /display/{token}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, token)
);

CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES tenants(id),
  branch_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  daypart_config JSONB DEFAULT '{}',  -- {enabled, windows: [{days, timeStart, timeEnd}]}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction: screen <-> playlist (M:N)
CREATE TABLE screen_playlists (
  screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  PRIMARY KEY (screen_id, playlist_id)
);

CREATE TABLE playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES media_assets(id),
  sort_order INT NOT NULL,
  duration_sec INT,  -- only meaningful for images; video uses asset's duration
  UNIQUE(playlist_id, sort_order)
);

CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES tenants(id),
  uploaded_by UUID NOT NULL REFERENCES users(id),
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL,       -- relative path under /data/media/{orgId}/assets/
  thumb_path TEXT,                   -- optional thumbnail for dashboard grid
  duration_sec INT,                 -- for video assets, NULL for images
  width INT, height INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.2 Media Storage Strategy

**v1:** Local disk volume. Docker volume mount at `/data/media/`.

```
/data/media/
  └── {orgId}/
      ├── screens/        (screen-level config assets, if any)
      └── assets/
          ├── {assetId}.{ext}     (original)
          └── thumbs/
              └── {assetId}_thumb.jpg
```

**Abstraction layer:** `MediaService` interface:

```typescript
interface MediaService {
  upload(orgId: string, asset: Buffer, mimeType: string, filename: string): Promise<string>;
  getUrl(relativePath: string): string;
  delete(relativePath: string): Promise<void>;
  getThumbnail(relativePath: string): Promise<Buffer | null>;
}
```

- v1: `LocalDiskMediaService` — reads from Docker volume
- v2/S3: `S3MediaService` — swaps implementation, same interface

### 7.3 Display Client Auth Model

This is the **one deliberately public surface** in the entire application.

**Design rules:**
1. `GET /display/:screenToken` — **no auth, no session, no cookies**
2. `:screenToken` is a **cryptographically random UUID** generated server-side
3. The endpoint returns ONLY the playlist for that specific screen:
   - No org name, no tenant metadata
   - No other branches, no employee/EOD data
   - No admin tokens, no session cookies
4. A leaked token exposes only that **one screen's playlist** — a restaurant TV showing menu slides
5. No enumeration possible: UUID v4 is 2^122 — brute force is infeasible

**API response** for `/display/:screenToken`:
```json
{
  "screen": { "name": "Dining Room TV" },
  "org": { "name": "Warung Kita", "branding": { "logo_url": "...", "primary_color": "#..." } },
  "playlist": {
    "items": [
      {
        "type": "image",
        "url": "/media/...",
        "duration_sec": 10,
        "width": 1920,
        "height": 1080
      },
      {
        "type": "video",
        "url": "/media/...",
        "duration_sec": 15
      }
    ]
  }
}
```

### 7.4 Display Client Technical Design

- **Zero framework** — single HTML page served by Express (or static build)
- **Polling interval:** 60s (v1). SSE/websocket for instant updates = v2
- **Day-parting:** Client-side evaluation. `playlist` response includes daypart_config. Client checks if current time falls in an active window → picks the right playlist.
- **Asset rendering:**
  - Images: `<img>` with `object-fit: contain`, fade transition CSS
  - Videos: `<video>` with `autoplay muted loop` + event listeners for `ended`
  - Failure: `onerror` handler → log to console, skip to next item, never crash
- **Memory management:** Cycle `<img>` and `<video>` elements rather than accumulating DOM. Remove old elements before adding new ones.
- **Kiosk readiness:** Fullscreen API (`document.documentElement.requestFullscreen()`), CSS `cursor: none` after 3s idle, periodic `keepAlive` ping to prevent browser sleep on Android TV

### 7.5 Upload Flow

1. Org admin navigates to Dashboard → Live TV → Assets tab
2. Uploads file via `<input type="file">` → `POST /api/media/upload`
3. Server validates: file type, file size, MIME type server-side (not just client-side)
4. Server generates `{assetId}.{ext}`, stores at `/data/media/{orgId}/assets/{assetId}.ext`
5. Server saves metadata to `media_assets` table
6. Admin can now add asset to a playlist via drag-and-drop
7. Admin assigns playlist to a screen
8. Display client picks up new playlist on next 60s poll (or sooner via forced refresh)

### 7.6 Upload Validation (Security)

Server-side validation is mandatory — Phase 4 will specifically test this:

```typescript
// Server-side validation
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;   // 10 MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;  // 200 MB

function validateUpload(file: Express.Multer.File): void {
  if (![...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].includes(file.mimetype)) {
    throw new Error('Invalid file type');
  }
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype);
  if (file.size > (isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE)) {
    throw new Error('File too large');
  }
}
```

---

## 8. Tenant Isolation Enforcement Point

### Decision: Express Middleware + RLS (Dual Enforcement)

**Not middleware OR RLS.** Both. Defense in depth.

| Layer | What it prevents | Weakness alone |
|-------|-----------------|----------------|
| **Express middleware** | Routes cannot be called without tenant context | Bugs in the middleware logic |
| **RLS (PostgreSQL)** | Database-level isolation even if middleware or query is wrong | Doesn't cover non-DB operations (rate limiting, logging) |
| **Passport JWT** | Token scoping at auth layer | Token could be stolen or misused |

### Implementation

```typescript
// 1. Auth middleware — extracts tenant from JWT
app.use('/api', authenticateJwt);

// 2. Tenant middleware — sets RLS context + req.tenantId
app.use('/api/orgs/:orgId', (req, res, next) => {
  // Verify the user's JWT tenant matches :orgId
  if (req.user.tenantId !== req.params.orgId) {
    return res.status(403).json({ error: 'Tenant mismatch' });
  }
  req.tenantId = req.params.orgId;
  await sequelize.query(`SET LOCAL app.tenant_id = '${req.params.orgId}'`);
  next();
});

// 3. RBAC middleware — checks branch-level permissions
app.use('/api/orgs/:orgId/stores', requirePermission({ scope: 'branch' }));

// 4. Controller — can optionally add org_id to queries
// (RLS handles the default case even if they forget)

// 5. RLS — catches any query without tenant_id filter
// FORCE ROW LEVEL SECURITY ensures RLS is always applied
```

### Route Structure

```
Public:
  POST /api/auth/login                    (no tenant)
  POST /api/auth/register                 (creates org)
  GET  /api/auth/google                   (OAuth start)
  GET  /api/auth/google/callback           (OAuth callback)
  POST /api/auth/accept-invite            (invite flow)
  GET  /display/:screenToken              (public, no auth)

Org-scoped (authenticated, tenant-locked):
  /api/orgs/:orgId/dashboard/*
  /api/orgs/:orgId/eod/*
  /api/orgs/:orgId/stores/*
  /api/orgs/:orgId/employees/*
  /api/orgs/:orgId/sync/*
  /api/orgs/:orgId/backups/*
  /api/orgs/:orgId/system/*
  /api/orgs/:orgId/agents/*
  /api/orgs/:orgId/afterhours/*
  /api/orgs/:orgId/users/*
  /api/orgs/:orgId/roles/*
  /api/orgs/:orgId/screens/*
  /api/orgs/:orgId/playlists/*
  /api/orgs/:orgId/media/*

Org admin (tenant-locked):
  GET    /api/orgs/:orgId/settings
  PUT    /api/orgs/:orgId/settings
  POST   /api/orgs/:orgId/invites

Billing (tenant-locked):
  GET    /api/orgs/:orgId/billing
  PUT    /api/orgs/:orgId/billing/subscription

Admin-only (cross-tenant, super admin):
  GET    /api/admin/tenants
  GET    /api/admin/tenants/:id
```

---

## 9. Billing Architecture (Pluggable Module)

### 9.1 v1: Manual Billing

No payment gateway integration in v1. Kurnia confirmed: manual billing via QRIS/invoice.

```typescript
// Subscription schema
interface Subscription {
  orgId: string;
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';
  plan: 'starter' | 'growth' | 'scale' | 'enterprise';
  branchCount: number;
  screenAddOns: number;      // screens beyond free tier
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  lastInvoiceUrl: string | null;  // manual QRIS/image link
  createdAt: Date;
}
```

### 9.2 Pluggable Module Pattern

```typescript
interface BillingProvider {
  // v1: manual (returns invoice link)
  // v2: Midtrans (creates subscription)
  // v3: Xendit (advanced recurring)
  
  createSubscription(orgId: string, plan: string): Promise<{ status: string; invoiceUrl?: string }>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  handleWebhook(req: Request): Promise<BillingEvent>;
  getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus>;
}
```

Billing domain logic sits behind this interface. v1 `ManualBillingProvider` creates QRIS links and tracks status. v2 swaps to `MidtransBillingProvider` without touching the rest of the code.

### 9.3 Billing Tables

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES tenants(id),
  status VARCHAR(20) NOT NULL DEFAULT 'trial',
  plan VARCHAR(20) NOT NULL,
  branch_count INT NOT NULL DEFAULT 0,
  screen_count INT NOT NULL DEFAULT 0,
  billing_period_start DATE,
  billing_period_end DATE,
  provider VARCHAR(20) DEFAULT 'manual',      -- 'manual', 'midtrans', 'xendit'
  provider_subscription_id VARCHAR(255),       -- external ID when gateway integrated
  last_invoice_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  amount INT NOT NULL,          -- in IDR (cents: 99000 = Rp 99.000)
  status VARCHAR(20) DEFAULT 'pending',  -- pending, paid, expired, failed
  payment_method VARCHAR(50),   -- 'qris', 'va', 'manual_transfer'
  paid_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  invoice_number VARCHAR(50) UNIQUE,
  provider_invoice_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 10. Email Service (Resend)

```typescript
// MailService abstraction — same pattern as Billing/Media
interface MailService {
  sendInvite(email: string, token: string, orgName: string): Promise<void>;
  sendPasswordReset(email: string, token: string): Promise<void>;
  sendWelcome(email: string, orgName: string): Promise<void>;
  sendInvoice(orgId: string, invoiceUrl: string): Promise<void>;
}

// v1: ResendMailService
// Uses Resend API (free tier: 100 emails/day)
```

---

## 11. Migration Plan (Data)

### Phase 2a — Backend Core Changes

1. Add `tenants` table + migration
2. Add `org_id`/`tenant_id` to all existing tables + migrations
3. Backfill existing data as Org 1
4. Enable RLS + create policies
5. Add composite indexes `(tenant_id, id)`, `(tenant_id, created_at)`, etc.
6. Add auth tables (users, user_identities) — replace current Users model if needed
7. Extend RBAC tables with org_id

### Phase 2b — Middleware & Routing

1. Create tenant resolution middleware
2. Create tenant-scoped route prefix `/api/orgs/:orgId`
3. Update all 15 existing route files to mount under `/api/orgs/:orgId`
4. Add RLS context-setting to middleware
5. Update all controllers to use `req.tenantId` where direct queries are made
6. Fix `isAllBranches` semantic in authzService.js
7. Replace hardcoded BRANCHES arrays with org-scoped dynamic resolution
8. Update frontend API calls to include `:orgId` in paths

### Phase 2c — Passport Auth

1. Install passport, passport-local, passport-jwt, passport-google-oauth20, jsonwebtoken, bcrypt
2. Create auth routes: local login, Google OAuth, register, invite, password reset
3. Create JWT strategy (extract from Authorization header)
4. Update auth middleware to use passport-jwt instead of ad-hoc JWT verification
5. Create user_identities table for OAuth linking
6. Create MailService with Resend provider
7. Update all existing route middleware references

### Phase 2d — Live Menu Display

1. Create screens, playlists, playlist_items, media_assets tables + migrations
2. Create MediaService (LocalDiskMediaService)
3. Create upload endpoint with validation
4. Create display client endpoint `/display/:screenToken`
5. Build display client frontend (standalone HTML/JS, no framework)
6. Build dashboard Live TV pages (assets, playlists, screens)

### Phase 2e — Billing Scaffold

1. Create subscriptions, billing_invoices tables + migration
2. Create ManualBillingProvider implementation
3. Create billing routes + pricing page
4. Create subscription-gated feature flags in middleware

---

## 12. Security Decisions

| Decision | Rationale |
|----------|-----------|
| **Passport JWT** over sessions | Stateless, mobile-friendly, simpler for display client |
| **JWT expiry: 24h** | Short enough to limit damage from leaks, long enough for daily ops |
| **RLS FORCE ROW LEVEL SECURITY** | Even superuser queries respect RLS |
| **Screen token: UUID v4** | 2^122 entropy — can't enumerate or brute-force |
| **Upload validation: server-side** | MIME type + file size checked on server, not just client |
| **No `user_branch_scopes` = zero access** for org_member | Fixes the single-tenant `isAllBranches` flaw |
| **Rate limiting: auth endpoints** | Prevent brute force on login/invite/register |

---

## 13. Key Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Passport `authenticate()` breaks on Express 5 | Auth blocked | Test immediately in Phase 2c. Have bare-metal fallback ready (google-auth-library + jsonwebtoken) |
| RLS performance at scale | Slow queries | Lead indexes with tenant_id. Monitor. Schema-per-tenant upgrade path available |
| Existing frontend pages use hardcoded branch counts | Broken UI after multi-tenant | Replace all static branch references with dynamic API-driven data |
| Media upload storage fills disk | Service disruption | Set max asset count per org in v1. Monitor disk. S3 migration path ready |
| Display client memory leak on long uptime | TV screen crashes after days | Explicit video element lifecycle management. Test for 7-day uptime before v1 release |
| Old `ensureDb.js` runs on fresh install | Creates schema without org context | Disable ensureDb.js for SaaS. Migrate to server-managed schema or controlled init |

---

## 14. Open Items (for Phase 3)

| # | Item | Status |
|---|------|--------|
| 1 | Google OAuth client ID/secret | Kurnia sets up before Phase 3 |
| 2 | Resend API key | Need to sign up (free tier) |
| 3 | Midtrans account | v1 = manual billing. Not needed yet |
| 4 | Domain name | Placeholder config (env vars) |
| 5 | Docker volume for media storage | Add to docker-compose.yml in Phase 3 |
| 6 | Demo media assets | Sourcing royalty-free Indonesian F&B images + video |

---

## GATE 2 — STOP

**ARCHITECTURE.md complete.** Awaiting explicit "go" before proceeding to Phase 3 (Implementation).

*All isolation decisions, auth design, data model changes, and route restructuring are documented above. Security-critical decisions are explicitly called out.*
