# API Contracts

## Base URL

All endpoints are mounted under `/api`. When running locally: `http://localhost:3000/api`.

## Authentication

JWT token in `Authorization: Bearer <token>` header. Obtain via `POST /api/auth/login`.

## Response Envelope

Every endpoint returns this JSON structure:

```json
{
  "ok": true,
  "data": { ... },
  "meta": { "pagination": { "page": 1, "pageSize": 50, "total": 200 } },
  "error": null
}
```

On error:

```json
{
  "ok": false,
  "data": null,
  "meta": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "details": { ... }
  }
}
```

## Routes by Module

### Auth (`/api/auth`)

| Method | Path                        | Auth   | Rate Limit     | Description                        |
| ------ | --------------------------- | ------ | -------------- | ---------------------------------- |
| POST   | `/api/auth/login`           | Public | 5/15min per IP | Login, returns JWT + user info     |
| GET    | `/api/auth/me`              | JWT    | —              | Current user profile + permissions |
| POST   | `/api/auth/change-password` | JWT    | —              | Change own password                |

**POST `/api/auth/login`**

Request body:

```json
{ "username": "admin", "password": "..." }
```

Response `data`:

```json
{
  "token": "jwt-string",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "effectivePerms": ["DASHBOARD_VIEW", "EOD_VIEW", ...],
    "branchScope": { "type": "all", "branchIds": [] }
  }
}
```

### Dashboard (`/api/dashboard`)

| Method | Path             | Permission     | Description                                            |
| ------ | ---------------- | -------------- | ------------------------------------------------------ |
| GET    | `/api/dashboard` | DASHBOARD_VIEW | Aggregated KPIs (EOD, sync, backup, after-hours stats) |

### EOD (`/api/eod`)

| Method | Path                        | Permission | Description                                                    |
| ------ | --------------------------- | ---------- | -------------------------------------------------------------- |
| GET    | `/api/eod`                  | EOD_VIEW   | Paginated EOD logs (filters: date, branch, status, store_code) |
| GET    | `/api/eod/:storeCode`       | EOD_VIEW   | EOD for a specific store                                       |
| GET    | `/api/eod/live`             | Public     | Live EOD data from external API (cached)                       |
| GET    | `/api/eod/ranking`          | EOD_VIEW   | Branch EOD ranking (done/total/percentage)                     |
| POST   | `/api/eod/sync`             | EOD_SYNC   | Trigger EOD data fetch                                         |
| POST   | `/api/eod/:storeCode/retry` | EOD_RETRY  | Retry EOD for specific store                                   |

### Sync (`/api/sync`)

| Method | Path                | Permission | Description                               |
| ------ | ------------------- | ---------- | ----------------------------------------- |
| GET    | `/api/sync`         | SYNC_VIEW  | Sync status overview                      |
| GET    | `/api/sync/live`    | Public     | Live sync data from external API (cached) |
| GET    | `/api/sync/stale`   | SYNC_VIEW  | List of stale/problem stores              |
| GET    | `/api/sync/history` | SYNC_VIEW  | Historical sync logs (paginated)          |
| GET    | `/api/sync/stats`   | SYNC_VIEW  | Sync statistics                           |
| GET    | `/api/sync/summary` | SYNC_VIEW  | Sync summary by time bucket               |

### Stores (`/api/stores`)

| Method | Path                     | Permission  | Description                                            |
| ------ | ------------------------ | ----------- | ------------------------------------------------------ |
| GET    | `/api/stores`            | STORES_VIEW | Paginated store list (filters: branch, region, search) |
| GET    | `/api/stores/:storeCode` | STORES_VIEW | Single store details                                   |
| PUT    | `/api/stores/:storeCode` | STORES_EDIT | Update store fields                                    |

### Employees (`/api/employees`)

| Method | Path                  | Permission     | Description                                                 |
| ------ | --------------------- | -------------- | ----------------------------------------------------------- |
| GET    | `/api/employees`      | EMPLOYEES_VIEW | Paginated employee list (filters: branch, store_code, role) |
| GET    | `/api/employees/:nik` | EMPLOYEES_VIEW | Single employee by NIK                                      |

### Identity / NIK (`/api/identity`, `/api/nik`)

| Method | Path                    | Permission | Description                     |
| ------ | ----------------------- | ---------- | ------------------------------- |
| GET    | `/api/identity?nik=...` | NIK_LOOKUP | Enriched identity lookup by NIK |
| GET    | `/api/nik?nik=...`      | NIK_LOOKUP | NIK lookup                      |

### Backups (`/api/backups`)

| Method | Path                             | Permission      | Description                       |
| ------ | -------------------------------- | --------------- | --------------------------------- |
| GET    | `/api/backups`                   | BACKUPS_VIEW    | List backup files (paginated)     |
| GET    | `/api/backups/disk`              | BACKUPS_VIEW    | Backup disk stats                 |
| POST   | `/api/backups/run`               | BACKUPS_RUN     | Trigger manual backup (`pg_dump`) |
| DELETE | `/api/backups/:filename`         | BACKUPS_DELETE  | Delete backup file                |
| POST   | `/api/backups/:filename/restore` | BACKUPS_RESTORE | Restore from backup (`psql`)      |

### System (`/api/system`)

| Method | Path                  | Permission         | Description                                            |
| ------ | --------------------- | ------------------ | ------------------------------------------------------ |
| GET    | `/api/system/health`  | SYSTEM_HEALTHCHECK | DB, scheduler, service health                          |
| GET    | `/api/system/logs`    | SYSTEM_VIEW        | System logs (paginated, filterable by level/component) |
| POST   | `/api/system/restart` | SYSTEM_RESTART     | Trigger service restart                                |

### Sync Alerts (`/api/sync-alerts`)

| Method | Path                   | Permission | Description            |
| ------ | ---------------------- | ---------- | ---------------------- |
| GET    | `/api/sync-alerts`     | SYNC_VIEW  | List sync alert states |
| GET    | `/api/sync-alerts/:id` | SYNC_VIEW  | Single alert           |
| POST   | `/api/sync-alerts`     | SYNC_VIEW  | Create alert           |
| PUT    | `/api/sync-alerts/:id` | SYNC_VIEW  | Update alert           |
| DELETE | `/api/sync-alerts/:id` | SYNC_VIEW  | Delete alert           |

### After Hours (`/api/afterhours`)

| Method | Path                              | Permission                         | Description                                            |
| ------ | --------------------------------- | ---------------------------------- | ------------------------------------------------------ |
| GET    | `/api/afterhours`                 | AFTERHOURS_VIEW                    | Paginated PC detections (filters: branch, store, date) |
| GET    | `/api/afterhours/summary`         | AFTERHOURS_VIEW                    | Branch-level daily violation summary                   |
| GET    | `/api/afterhours/dates`           | AFTERHOURS_VIEW                    | Available violation dates                              |
| GET    | `/api/afterhours/settings`        | AFTERHOURS_VIEW + all-branch scope | Get notification and warning schedule settings         |
| PUT    | `/api/afterhours/settings`        | AFTERHOURS_VIEW + all-branch scope | Update notification and warning schedule settings      |
| POST   | `/api/afterhours/check`           | AFTERHOURS_VIEW                    | Trigger on-demand PC check                             |
| GET    | `/api/afterhours/report`          | AFTERHOURS_VIEW                    | Monthly violation report                               |
| GET    | `/api/afterhours/report/export`   | AFTERHOURS_VIEW                    | Export report as XLSX                                  |
| GET    | `/api/afterhours/report/months`   | AFTERHOURS_VIEW                    | Available report months                                |
| POST   | `/api/afterhours/report/generate` | AFTERHOURS_VIEW + all-branch scope | Trigger report generation                              |

`warning_schedule_times` is stored in `afterhours_config` as a JSON array. Fresh and older databases are bootstrapped with the default WIB schedule `["23:15","23:30","23:45","00:00"]`; monthly report generation falls back to this schedule if the config is missing or malformed.

### Agent (`/api/agent`)

| Method | Path                   | Auth         | Description                                 |
| ------ | ---------------------- | ------------ | ------------------------------------------- |
| POST   | `/api/agent/heartbeat` | Public       | Agent heartbeat (upserts monitoring record) |
| GET    | `/api/agent/heartbeat` | Public       | Returns `{ status: "ok", version }`         |
| GET    | `/api/agent`           | JWT          | List agent monitoring records               |
| GET    | `/api/agent/version`   | Public       | Current agent version from config           |
| POST   | `/api/agent/update`    | AGENT_UPDATE | Request agent update for store_ids          |

### Users (`/api/users`)

| Method | Path                         | Permission            | Description                              |
| ------ | ---------------------------- | --------------------- | ---------------------------------------- |
| GET    | `/api/users`                 | USERS_VIEW            | List users with roles + permissions      |
| GET    | `/api/users/:id`             | USERS_VIEW            | Single user with associations            |
| POST   | `/api/users`                 | USERS_CREATE          | Create user (with default "viewer" role) |
| PUT    | `/api/users/:id`             | USERS_EDIT            | Update user fields                       |
| DELETE | `/api/users/:id`             | USERS_DELETE          | Delete user (cannot self-delete)         |
| PUT    | `/api/users/:id/password`    | USERS_RESET_PASSWORD  | Admin reset another user's password      |
| PUT    | `/api/users/:id/roles`       | USERS_ROLE_EDIT       | Replace role assignments                 |
| PUT    | `/api/users/:id/permissions` | USERS_PERMISSION_EDIT | Set permission overrides                 |
| PUT    | `/api/users/:id/scopes`      | USERS_SCOPE_EDIT      | Set branch scopes                        |

### Roles (`/api/roles`)

| Method | Path             | Permission | Description                               |
| ------ | ---------------- | ---------- | ----------------------------------------- |
| GET    | `/api/roles`     | ROLES_VIEW | List all roles with their permissions     |
| GET    | `/api/roles/:id` | ROLES_VIEW | Single role                               |
| POST   | `/api/roles`     | ROLES_EDIT | Create role                               |
| PUT    | `/api/roles/:id` | ROLES_EDIT | Update role (system role names protected) |
| DELETE | `/api/roles/:id` | ROLES_EDIT | Delete role (system roles protected)      |

## Error Codes

| Code               | HTTP Status | Description                 |
| ------------------ | ----------- | --------------------------- |
| `VALIDATION_ERROR` | 400         | Zod validation failed       |
| `UNAUTHORIZED`     | 401         | Missing/invalid JWT         |
| `FORBIDDEN`        | 403         | Insufficient permissions    |
| `NOT_FOUND`        | 404         | Route or resource not found |
| `CONFLICT`         | 409         | Unique constraint violation |
| `INTERNAL_ERROR`   | 500         | Unhandled server error      |

## Pagination

Query params: `page` (default 1), `pageSize` (default 50, max 200).

Response meta:

```json
{
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 200,
    "totalPages": 4
  }
}
```

## Live Data Endpoints

`/api/eod/live` and `/api/sync/live` return additional metadata:

```json
{
  "ok": true,
  "data": { ... },
  "meta": {
    "updatedAt": "2026-01-23T15:30:00+07:00",
    "source": "live",
    "sourceFetchedAt": "2026-01-23T15:30:00+07:00",
    "sourceLagSec": 12,
    "partial": false,
    "warnings": []
  },
  "error": null
}
```
