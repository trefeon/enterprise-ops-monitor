# Backend Architecture Report — Enterprise Ops Monitor

> Date: 2026-05-22  
> Scope: `apps/api/` + `mock-api/`

---

## 1. Backend Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js 20+ |
| **Framework** | Express 5 (`^5.2.1`) |
| **ORM** | Sequelize 6 (`^6.37.7`) |
| **Database** | PostgreSQL 15 Alpine (via `pg` `^8.17.2`) |
| **Auth** | JWT (`jsonwebtoken` `^9.0.3`) + `bcryptjs` |
| **Validation** | Zod 4 (`^4.3.6`) |
| **Security** | `helmet` + `cors` + `express-rate-limit` |
| **File Upload** | `multer` `^2.1.1` |
| **Excel Export** | `exceljs` `^4.4.0` |
| **Logging** | `morgan` |
| **Testing** | Node native test runner + `supertest` |
| **Module System** | CommonJS (`require`/`module.exports`) |

---

## 2. Project Structure

```
apps/api/
├── server.js              # Entry point: Express setup, middleware, routes, 404, error handler
├── config/
│   ├── env.js             # Zod schema for env validation (fail-fast on boot)
│   └── afterhoursDefaults.js
├── middleware/
│   ├── authMiddleware.js   # JWT verification
│   ├── rbac.js             # Role-based access control
│   ├── errorHandler.js     # Global error handler
│   ├── notFound.js         # 404 handler
│   ├── requestId.js        # Request ID generator
│   ├── validate.js         # Zod validation middleware
│   └── cacheHeaders.js     # Cache control headers
├── routes/                 # 15 route files
│   ├── authRoutes.js, dashboardRoutes.js, eodRoutes.js
│   ├── storeRoutes.js, syncRoutes.js, systemRoutes.js
│   ├── backupRoutes.js, employeeRoutes.js, identityRoutes.js
│   ├── usersRoutes.js, rolesRoutes.js
│   ├── afterhoursRoutes.js, agentRoutes.js, alertsRoutes.js
│   └── nikRoutes.js
├── controllers/            # 14 controllers
├── services/               # Business logic layer
│   ├── authzService.js     # Authorization + scope filtering
│   ├── backupService.js    # Backup operations
│   ├── dataSyncService.js  # External API sync
│   ├── dataGateway/        # Data source abstraction (branches, cache, meta, ttl)
│   └── ... (11 more)
├── models/                 # 16 Sequelize models
├── migrations/             # 10 migration files
├── utils/                  # Helpers
│   ├── response.js         # Standardized { ok, data, meta, error }
│   ├── pagination.js       # Pagination helper
│   ├── time.js             # WIB time helpers
│   ├── validators.js       # Validation utilities
│   └── ... (10 more)
├── seed.js                 # Database seeder
├── seedRbac.js             # RBAC roles/permissions seeder
└── tests/                  # Test files
```

---

## 3. API Routes — Complete Map

### Auth
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Login with username + password → JWT |
| POST | `/api/auth/logout` | Logout (invalidate token) |
| GET | `/api/auth/me` | Current user profile + permissions |
| PATCH | `/api/auth/me/password` | Change password |

### Dashboard
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/dashboard/summary` | Aggregated KPI data |
| GET | `/api/dashboard/alerts` | Active alerts list |
| POST | `/api/dashboard/sync` | Trigger data refresh |

### EOD
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/eod/stores` | EOD status per store (paginated, filterable) |
| GET | `/api/eod/areas` | EOD summary by area/branch |
| GET | `/api/eod/areas-summary` | Same as above (legacy) |
| GET | `/api/eod/summary-by-branch` | Branch-level EOD stats |
| GET | `/api/eod/trend` | EOD completion trend over time |
| GET | `/api/eod/ranking` | Store failure ranking |
| GET | `/api/eod/stores/:storeCode/history` | Single store's EOD history |
| POST | `/api/eod/sync` | Trigger EOD sync |

### Stores
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/stores` | List stores (paginated, filterable) |
| GET | `/api/stores/regions` | Region groupings |
| GET | `/api/stores/export` | Export stores as XLSX |
| GET | `/api/stores/:storeCode` | Single store details |

### Sync
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/sync/summary` | Sync health summary |
| GET | `/api/sync/logs` | Sync activity logs (paginated) |

### Backups
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/backups/summary` | Backup storage + schedule status |
| GET | `/api/backups/files` | List backup files (paginated) |
| POST | `/api/backups/run` | Trigger manual backup |
| DELETE | `/api/backups/files/:fileName` | Delete a backup file |
| POST | `/api/backups/restore` | Restore from backup |
| GET | `/api/backups/files/:fileName/download` | Download backup file |

### Employees / Identity
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/employees` | Employee list |
| GET | `/api/identity` | Identity check data |
| GET | `/api/nik/roles` | NIK role list |
| GET | `/api/nik/list` | NIK search (paginated) |

### Users / Roles
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/users` | User list |
| GET | `/api/users/:id` | Single user details |
| PATCH | `/api/users/:id/roles` | Update user roles |
| PATCH | `/api/users/:id/branch-scope` | Update branch scope |
| PATCH | `/api/users/:id/permissions` | Update permission overrides |
| GET | `/api/roles` | Role list |
| POST | `/api/roles` | Create role |
| PATCH | `/api/roles/:id` | Update role |
| DELETE | `/api/roles/:id` | Delete role |

### System
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/system/branches` | Branch list |
| GET | `/api/system/services` | Service status |
| POST | `/api/system/services/:name/restart` | Restart service |
| GET | `/api/system/health` | System health check |
| GET | `/api/system/logs` | System logs |
| GET | `/api/system/metrics` | System metrics |

### After Hours
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/afterhours/settings` | After hours settings |
| PATCH | `/api/afterhours/settings` | Update settings |
| GET | `/api/afterhours/activity` | After hours activity |
| GET | `/api/afterhours/report` | Report endpoint |

### Agents
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/agents` | Office agents list |
| GET | `/api/agents/:id` | Single agent details |
| GET | `/api/agent/setup-script` | Download agent setup script |
| POST | `/api/agents/:id/update` | Trigger agent update |

---

## 4. Database Schema (16 Models)

| Model | Key Fields | Relationships |
|---|---|---|
| **User** | `id`, `username`, `passwordHash`, `email`, `isActive` | ↔ UserRole, UserBranchScope, UserPermissionOverride |
| **Role** | `id`, `name`, `label`, `priority` | ↔ RolePermission, UserRole |
| **RolePermission** | `id`, `roleId`, `permission` | → Role |
| **UserRole** | `id`, `userId`, `roleId` | → User, Role |
| **UserPermissionOverride** | `id`, `userId`, `permission`, `effect` (allow/deny) | → User |
| **UserBranchScope** | `id`, `userId`, `branchId` | → User |
| **Store** | `storeCode`, `storeName`, `branchId`, `region`, `city`, `status` | Independent |
| **EODLog** | `id`, `storeCode`, `date`, `status`, `syncAt` | → Store |
| **BackupLog** | `id`, `fileName`, `type`, `sizeBytes`, `status` | Independent |
| **Employee** | `id`, `nik`, `name`, `storeCode`, `position` | → Store |
| **SyncLog** | `id`, `type`, `status`, `startedAt`, `completedAt` | Independent |
| **SyncSummary** | `id`, `date`, `healthyPercentage`, `staleCount` | Independent |
| **SyncAlertState** | `id`, `alertType`, `severity`, `resolved` | Independent |
| **AgentMonitoring** | `id`, `hostname`, `status`, `cpu`, `ram`, `disk`, `lastHeartbeat` | Independent |
| **SystemLog** | `id`, `service`, `level`, `message`, `timestamp` | Independent |

---

## 5. API Response Envelope

All endpoints return:
```json
{
  "ok": true,
  "data": { ... },
  "meta": {
    "pagination": { "page": 1, "pageSize": 25, "total": 100 },
    "timezone": "Asia/Jakarta"
  },
  "error": null
}
```

Error format:
```json
{
  "ok": false,
  "data": null,
  "meta": null,
  "error": { "code": "VALIDATION_ERROR", "message": "Invalid input" }
}
```

---

## 6. Auth Flow

1. **Login**: POST `/api/auth/login` → Validate credentials (bcryptjs) → Return JWT
2. **Store**: Token stored in localStorage/sessionStorage
3. **Request**: `Authorization: Bearer <token>` header via Axios interceptor
4. **Middleware**: `authMiddleware.js` verifies JWT → `req.user = decoded`
5. **RBAC**: `rbac.js` checks `user.effectivePerms` against required permission
6. **Scope**: `authzService.js` filters results based on user's branch scope

---

## 7. Mock API (mock-api/)

### Stack
- Express 5 + @faker-js/faker
- Port 4000 (standalone, no DB needed)
- Same response envelope as real API

### Existing Endpoints
- `/api/dashboard/summary`, `/api/dashboard/alerts`, `/api/dashboard/sync`
- `/api/eod/*` (stores, areas, areas-summary, summary-by-branch, trend, ranking, history, sync)
- `/api/stores`, `/api/stores/:storeCode`, `/api/stores/regions`, `/api/stores/export`
- `/api/sync/summary`, `/api/sync/logs`
- `/api/backups/summary`, `/api/backups/files`, `/api/backups/run`, `/api/backups/files/:filename`, `/api/backups/restore`, `/api/backups/files/:filename/download`
- `/api/users`, `/api/users/:id`, `/api/users/:id/roles`, `/api/users/:id/branch-scope`, `/api/users/:id/permissions`
- `/api/roles`, `/api/roles/:id`
- `/api/system/branches`, `/api/system/services`, `/api/system/services/:name/restart`, `/api/system/health`, `/api/system/logs`, `/api/system/metrics`
- `/api/employees`, `/api/identity`
- `/api/afterhours/*`
- `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, `/api/auth/me/password`
- `/api/agents`, `/api/agents/:id`, `/api/agents/:id/update`, `/api/agent/setup-script`
- `/api/nik/roles`, `/api/nik/list`
- `/api/eod/stores/:storeCode/history`

### Features
- Time-aware EOD simulation (changes status based on WIB hour)
- Faker-generated realistic data
- Pagination on list endpoints
- Filtering (by status, area, search query)
- Same `{ ok, data, meta, error }` response format

---

## 8. Gap Analysis: Mock vs Real API

### Covered ✅ (most endpoints present)
- Dashboard, EOD, Stores, Sync, Backups
- Users, Roles, System, AfterHours, Agents
- Auth, Employees, Identity, NIK
- All with faker data and proper response format

### Limitations ⚠️
- **No auth enforcement**: Mock API accepts all requests without JWT
- **No RBAC**: All users get full access
- **No real persistence**: Data regenerates on each request (or by server.js restart)
- **No file operations**: Backup download/restore are simulated
- **No real webhook/sync**: Dashboard sync is a mock setTimeout

---

## 9. Running for Testing

```bash
# Terminal 1: Start mock API
cd /path/to/project
node mock-api/server.js

# Terminal 2: Start frontend with mock proxy
cd apps/web
VITE_API_PROXY_TARGET=http://localhost:4000 pnpm dev

# Or use .env.local:
# VITE_API_PROXY_TARGET=http://localhost:4000
```

---

## 10. Architecture Observations

### Strengths
- Clean MVC-like separation (routes → controllers → services → models)
- Standardized response envelope across all endpoints
- Zod env validation prevents misconfiguration
- Comprehensive RBAC with permission overrides
- WIB timezone handling throughout
- Good test coverage (~15 test files)

### Opportunities
- CommonJS modules (could migrate to ESM for consistency with frontend)
- Some controllers are large (e.g., `syncController.js`, `eodController.js`) — could benefit from service decomposition
- No TypeScript (could bring type safety like the frontend)
- `mock-api/server.js` is a single 1861-line file — could be split into modules
- No OpenAPI/Swagger docs for the API
