# Database Schema

## Overview

PostgreSQL 15 database managed via Sequelize 6 ORM. 16 Sequelize models + additional runtime tables created by `ensureDb.js`. Migrations tracked in `_migrations` table.

## Connection

Configurable via `DATABASE_URL` (full connection string) or individual `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` env vars.

## Sequelize Models

### Users & RBAC

#### `User` — `Users` table

| Column          | Type                        | Notes                              |
| --------------- | --------------------------- | ---------------------------------- |
| `id`            | INTEGER (PK, autoIncrement) |                                    |
| `username`      | STRING                      | Unique                             |
| `password_hash` | STRING                      | bcrypt or SHA256                   |
| `role`          | STRING                      | Legacy role string, default "user" |
| `createdAt`     | DATE                        |                                    |
| `updatedAt`     | DATE                        |                                    |

Password verification is handled inline in `authController.js` via `verifyPassword()` with auto-migration from SHA256 to bcrypt.

#### `Role` — `roles` table

| Column        | Type                        | Notes                                         |
| ------------- | --------------------------- | --------------------------------------------- |
| `id`          | INTEGER (PK, autoIncrement) |                                               |
| `name`        | STRING(50)                  | Unique, e.g. "viewer", "admin"                |
| `label`       | STRING(100)                 | Human-readable                                |
| `description` | TEXT                        |                                               |
| `is_system`   | BOOLEAN                     | Default false; system roles cannot be deleted |
| `createdAt`   | DATE                        |                                               |
| `updatedAt`   | DATE                        |                                               |

#### `RolePermission` — `role_permissions` table

| Column       | Type                    | Notes                 |
| ------------ | ----------------------- | --------------------- |
| `id`         | INTEGER (PK)            |                       |
| `role_id`    | INTEGER (FK → roles.id) | CASCADE on delete     |
| `permission` | STRING(50)              | e.g. "DASHBOARD_VIEW" |
| `createdAt`  | DATE                    |                       |

Unique index: `(role_id, permission)`

#### `UserRole` — `user_roles` table

| Column      | Type                    | Notes             |
| ----------- | ----------------------- | ----------------- |
| `id`        | INTEGER (PK)            |                   |
| `user_id`   | INTEGER (FK → Users.id) | CASCADE on delete |
| `role_id`   | INTEGER (FK → roles.id) | CASCADE on delete |
| `createdAt` | DATE                    |                   |

Unique index: `(user_id, role_id)`

#### `UserPermissionOverride` — `user_permission_overrides` table

| Column       | Type                    | Notes                                   |
| ------------ | ----------------------- | --------------------------------------- |
| `id`         | INTEGER (PK)            |                                         |
| `user_id`    | INTEGER (FK → Users.id) | CASCADE on delete                       |
| `permission` | STRING(50)              |                                         |
| `effect`     | ENUM("allow", "deny")   | Deny overrides role-granted permissions |
| `createdAt`  | DATE                    |                                         |

Unique index: `(user_id, permission)`

#### `UserBranchScope` — `user_branch_scopes` table

| Column      | Type                    | Notes                            |
| ----------- | ----------------------- | -------------------------------- |
| `id`        | INTEGER (PK)            |                                  |
| `user_id`   | INTEGER (FK → Users.id) | CASCADE on delete                |
| `branch_id` | INTEGER                 | References `data_branches` table |
| `createdAt` | DATE                    |                                  |

Unique index: `(user_id, branch_id)`

### Business Data

#### `Store` — `Stores` table

| Column       | Type         | Notes        |
| ------------ | ------------ | ------------ |
| `id`         | INTEGER (PK) |              |
| `store_code` | STRING       | Unique       |
| `store_name` | STRING       |              |
| `area`       | STRING       |              |
| `region`     | STRING       |              |
| `is_active`  | BOOLEAN      | Default true |
| `createdAt`  | DATE         |              |
| `updatedAt`  | DATE         |              |

#### `EODLog` — `EODLogs` table

| Column       | Type                              | Notes |
| ------------ | --------------------------------- | ----- |
| `id`         | INTEGER (PK)                      |       |
| `store_code` | STRING                            |       |
| `date`       | DATE                              |       |
| `status`     | ENUM("DONE", "FAILED", "PENDING") |       |
| `message`    | TEXT                              |       |
| `source`     | STRING                            |       |
| `createdAt`  | DATE                              |       |
| `updatedAt`  | DATE                              |       |

Unique index: `(store_code, date)`

#### `Employee` — `Employees` table

| Column       | Type         | Notes              |
| ------------ | ------------ | ------------------ |
| `id`         | INTEGER (PK) |                    |
| `nik`        | STRING       | Unique             |
| `full_name`  | STRING       |                    |
| `role`       | STRING       | Job role, not RBAC |
| `store_code` | STRING       |                    |
| `status`     | STRING       | Default "ACTIVE"   |
| `createdAt`  | DATE         |                    |
| `updatedAt`  | DATE         |                    |

#### `BackupLog` — `BackupLogs` table

| Column       | Type                                 | Notes |
| ------------ | ------------------------------------ | ----- |
| `id`         | INTEGER (PK)                         |       |
| `filename`   | STRING                               |       |
| `type`       | ENUM("SCHEDULED", "MANUAL")          |       |
| `size_bytes` | BIGINT                               |       |
| `status`     | ENUM("SUCCESS", "FAILED", "RUNNING") |       |
| `createdAt`  | DATE                                 |       |
| `updatedAt`  | DATE                                 |       |

#### `SystemLog` — `SystemLogs` table

| Column      | Type                             | Notes |
| ----------- | -------------------------------- | ----- |
| `id`        | INTEGER (PK)                     |       |
| `level`     | ENUM("INFO", "WARNING", "ERROR") |       |
| `component` | STRING                           |       |
| `message`   | TEXT                             |       |
| `createdAt` | DATE                             |       |
| `updatedAt` | DATE                             |       |

#### `SyncLog` — `SyncLogs` table

| Column           | Type                               | Notes            |
| ---------------- | ---------------------------------- | ---------------- |
| `id`             | INTEGER (PK)                       |                  |
| `store_code`     | STRING                             |                  |
| `store_name`     | STRING                             | Nullable         |
| `branch_id`      | STRING                             |                  |
| `branch_name`    | STRING                             | Nullable         |
| `last_sync_at`   | DATE                               | Nullable         |
| `is_stale`       | BOOLEAN                            | Default false    |
| `is_problem`     | BOOLEAN                            | Default false    |
| `is_missing_today` | BOOLEAN                          | Default false    |
| `polled_at`      | DATE                               | Default NOW()    |
| `createdAt`      | DATE                               |                  |
| `updatedAt`      | DATE                               |                  |

Indexes on: `store_code`, `(store_code, polled_at)`, `branch_id`, `(branch_id, polled_at)`, `polled_at`, `is_stale`, `is_problem`, `is_missing_today`

#### `SyncSummary` — `SyncSummaries` table

| Column           | Type         | Notes                  |
| ---------------- | ------------ | ---------------------- |
| `id`             | INTEGER (PK) |                        |
| `store_code`     | STRING       |                        |
| `store_name`     | STRING       | Nullable               |
| `branch_id`      | STRING       | Nullable               |
| `branch_name`    | STRING       | Nullable               |
| `bucket_start`   | DATE         |                        |
| `bucket_minutes` | INTEGER      | Default 10             |
| `last_sync_at`   | DATE         | Nullable               |
| `is_stale`       | BOOLEAN      | Default false          |
| `is_problem`     | BOOLEAN      | Default false          |
| `is_missing_today` | BOOLEAN    | Default false          |
| `polled_at`      | DATE         |                        |
| `createdAt`      | DATE         |                        |
| `updatedAt`      | DATE         |                        |

Unique index: `(store_code, bucket_start, bucket_minutes)`

#### `SyncAlertState` — `SyncAlertStates` table

| Column           | Type         | Notes               |
| ---------------- | ------------ | ------------------- |
| `store_code`     | STRING (PK)  | Primary key         |
| `store_name`     | STRING       | Nullable            |
| `branch_id`      | STRING       | Nullable            |
| `branch_name`    | STRING       | Nullable            |
| `is_stale`       | BOOLEAN      | Default false       |
| `is_problem`     | BOOLEAN      | Default false       |
| `is_missing_today` | BOOLEAN    | Default false       |
| `stale_since`    | DATE         | Nullable            |
| `last_seen_at`   | DATE         | Default NOW()       |
| `last_alerted_at`| DATE         | Nullable            |
| `last_recovered_at` | DATE      | Nullable            |

Indexes on: `is_stale`, `is_problem`, `last_alerted_at`, `last_seen_at`

#### `AgentMonitoring` — `agent_monitoring` table

| Column                    | Type         | Notes                         |
| ------------------------- | ------------ | ----------------------------- |
| `id`                      | INTEGER (PK) |                               |
| `store_id`                | STRING       | Unique FK → Stores.store_code |
| `hostname`                | STRING       | Nullable                      |
| `version`                 | STRING       |                               |
| `last_check_at`           | DATE         |                               |
| `created_at`              | DATE         |                               |
| `updated_at`              | DATE         |                               |
| `status_message`          | STRING       | Nullable                      |
| `last_error`              | TEXT         | Nullable                      |
| `update_requested`        | BOOLEAN      | Default false                 |
| `script_update_requested` | BOOLEAN      | Default false                 |
| `worker_version`          | STRING       | Nullable                      |
| `agent_status`            | STRING       | Default "unknown"             |

Belongs to: Store (`store_id` → `store_code`)

## Runtime Tables (created by `ensureDb.js`)

These are managed via raw SQL (not Sequelize models):

| Table                       | Purpose                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `data_branches`             | 8 branch hub definitions                                                                                                       |
| `data_stores`               | Store list from external API                                                                                                   |
| `data_store_eod_current`    | Current EOD state per store                                                                                                    |
| `data_store_eod_history`    | Historical EOD records                                                                                                         |
| `data_employees`            | Employee data from external API                                                                                                |
| `store_sync_snapshot`       | Point-in-time sync snapshot                                                                                                    |
| `sync_aud_latest`           | Latest sync audit per store                                                                                                    |
| `stores_master`             | Master store reference                                                                                                         |
| `afterhours_pc_log`         | After-hours PC detection log                                                                                                   |
| `afterhours_config`         | Key-value config table; bootstraps default `warning_schedule_times`, `first_warning_time`, and `final_warning_time` if missing |
| `afterhours_monthly_report` | Generated monthly violation reports                                                                                            |
| `service_heartbeats`        | Scheduler heartbeat tracking                                                                                                   |

`afterhours_config` is a generic KV table. `ensureDb.js` creates missing defaults for the warning schedule so older databases can generate monthly reports without manual setup: `warning_schedule_times=["23:15","23:30","23:45","00:00"]`, `first_warning_time=23:15`, and `final_warning_time=00:00`.

## Associations

```
User ──hasMany──> UserRole ──belongsTo──> Role ──hasMany──> RolePermission
User ──hasMany──> UserPermissionOverride
User ──hasMany──> UserBranchScope
User ──belongsToMany──> Role (through UserRole)

Store ──hasOne──> AgentMonitoring (store_code → store_id)
```

## Migrations

Located in `apps/api/migrations/`. Run via `node migrations/run.js`.

| Migration      | Table(s)                    | Description                                              |
| -------------- | --------------------------- | -------------------------------------------------------- |
| `20260123_000` | `Users`                     | Initial users table                                      |
| `20260123_001` | `roles`                     | RBAC roles                                               |
| `20260123_002` | `role_permissions`          | Role-to-permission mapping                               |
| `20260123_003` | `user_roles`                | User-to-role mapping                                     |
| `20260123_004` | `user_permission_overrides` | Per-user allow/deny overrides                            |
| `20260123_005` | `user_branch_scopes`        | Per-user branch restrictions                             |
| `20260420_001` | `agent_monitoring`          | Initial agent monitoring                                 |
| `20260420_002` | `agent_monitoring`          | Adds status/last_error/update_requested                  |
| `20260421_001` | `agent_monitoring`          | Adds script_update_requested/worker_version/agent_status |

Migration runner: Creates/applies unapplied `.js` files, tracked in `_migrations` table.

## Raw SQL Utility Tables

Created at boot time by `apps/api/utils/ensureDb.js`. Creates indexes and backfills RBAC data as needed. Not managed by migration system — repairs schema on every startup.
