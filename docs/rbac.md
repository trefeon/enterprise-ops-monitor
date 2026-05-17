# RBAC v2 — Role-Based Access Control

## Overview

RBAC v2 uses database-backed roles with user-level permission overrides (allow/deny), branch scoping, and legacy role fallback. System roles are immutable (cannot be deleted or renamed).

## 30 Permissions

Defined in `apps/api/lib/permissions.js` and mirrored in `apps/web/src/lib/auth/permissions.js`.

### Section/Menu (8)

| Permission | Description |
|------------|-------------|
| `DASHBOARD_VIEW` | View main dashboard |
| `SYNC_VIEW` | View sync status |
| `EOD_VIEW` | View EOD logs |
| `STORES_VIEW` | View store directory |
| `EMPLOYEES_VIEW` | View employee directory |
| `BACKUPS_VIEW` | View backup list |
| `SYSTEM_VIEW` | View system logs |
| `ACCOUNTS_VIEW` | View accounts/management pages |

### EOD (2)

| Permission | Description |
|------------|-------------|
| `EOD_SYNC` | Trigger EOD sync |
| `EOD_RETRY` | Retry EOD for a store |

### Stores (1)

| Permission | Description |
|------------|-------------|
| `STORES_EDIT` | Edit store details |

### Identity (1)

| Permission | Description |
|------------|-------------|
| `NIK_LOOKUP` | Lookup employee by NIK |

### Backups (3)

| Permission | Description |
|------------|-------------|
| `BACKUPS_RUN` | Run manual backup |
| `BACKUPS_DELETE` | Delete backup files |
| `BACKUPS_RESTORE` | Restore from backup |

### System (2)

| Permission | Description |
|------------|-------------|
| `SYSTEM_HEALTHCHECK` | Run health checks |
| `SYSTEM_RESTART` | Restart services |

### Users (9)

| Permission | Description |
|------------|-------------|
| `USERS_VIEW` | List users |
| `USERS_CREATE` | Create users |
| `USERS_EDIT` | Edit users |
| `USERS_DELETE` | Delete users |
| `USERS_RESET_PASSWORD` | Reset another user's password |
| `USERS_CHANGE_PASSWORD` | Change own password |
| `USERS_ROLE_EDIT` | Assign roles to users |
| `USERS_PERMISSION_EDIT` | Set permission overrides |
| `USERS_SCOPE_EDIT` | Set branch scopes |

### Roles (2)

| Permission | Description |
|------------|-------------|
| `ROLES_VIEW` | View roles |
| `ROLES_EDIT` | Create/edit/delete roles |

### Other (2)

| Permission | Description |
|------------|-------------|
| `AFTERHOURS_VIEW` | View after-hours page |
| `AGENT_UPDATE` | Request agent updates |

## 7 System Roles

Defined in `apps/api/services/authzService.js` (seedRbacInDb).

| Role | Permissions | Access Level |
|------|-------------|--------------|
| `viewer` | 8 — DASHBOARD_VIEW, SYNC_VIEW, EOD_VIEW, STORES_VIEW, EMPLOYEES_VIEW, NIK_LOOKUP, BACKUPS_VIEW, SYSTEM_VIEW | Read-only monitoring |
| `ops` | 12 — viewer + EOD_SYNC, EOD_RETRY, BACKUPS_RUN | Operations with limited actions |
| `admin` | 26 — ops + STORES_EDIT, BACKUPS_DELETE, SYSTEM_HEALTHCHECK, AGENT_UPDATE, AFTERHOURS_VIEW, full user management, full roles view | Full access minus system-level destructive actions |
| `super_admin` | 30 (all) | Everything |
| `demo` | 14 — all view perms + SYSTEM_HEALTHCHECK | Read-only for demonstrations |
| `it` | 13 — viewer + EOD_SYNC, EOD_RETRY, BACKUPS_RUN, SYSTEM_HEALTHCHECK, AGENT_UPDATE | IT support focus |
| `hc` | 2 — EMPLOYEES_VIEW, NIK_LOOKUP | HR/employee directory only |

## Permission Computation

`authzService.computeUserPermissions(userId)`:

1. Get user's roles → union of all role permissions
2. Get user's permission overrides — apply `allow`/`deny` on top
3. Priority: **deny > allow > role-default**. A single `deny` override revokes that permission entirely.

## Branch Scoping

`authzService.getUserBranchScope(userId)` returns `{ type: "all" | "scoped", branchIds: number[] }`.

- Users with `admin`, `super_admin` role or `ACCOUNTS_VIEW` permission get `type: "all"`
- All others are restricted to their `user_branch_scopes` entries

Branch scope filtering is applied at the middleware level via `requirePermission(permission, { branchFrom: "query" | "params" | "body" })`.

## Middleware

Defined in `apps/api/middleware/rbac.js`:

| Function | Description |
|----------|-------------|
| `requirePermission(perm, opts?)` | Require specific permission; optionally validate branch scope from request |
| `requireAnyPermission(perms)` | Require at least one of listed permissions |
| `requireAllPermissions(perms)` | Require all listed permissions |

## Adding New Permissions

1. Add to `apps/api/lib/permissions.js` (API permission constant + role assignments in seed)
2. Add to `apps/web/src/lib/auth/permissions.js` (frontend constant + optional group + legacy role assignment)
3. Apply at route level: `requirePermission("NEW_PERM")` in routes, `<PrivateRoute requiredPerm={Permissions.NEW_PERM}>` in frontend

## Legacy Fallback

For backward compatibility during RBAC v1→v2 transition:
- `User.role` column stores legacy role string
- `UserRole` table stores v2 role assignments
- `normalizeRole()` maps legacy aliases: "superadmin" → "super_admin", "operator" → "ops", "support" → "it", "human capital" → "hc"
- `hasPermission()` in frontend first checks `user.effectivePerms` (v2), falls back to `RolePermissions[role]` (v1)
