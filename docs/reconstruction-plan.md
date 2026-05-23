# Reconstruction Plan — Enterprise Ops Monitor

> Historical note: this plan predates later cleanup. Current agent-facing repo
> truth lives in `docs/agent-code-map.md`.

> Phase 1 output
> Based on reconstruction-audit.md + docs/fe-research.md + docs/fe-backend-audit.md

---

## 1. Convention Decisions (Locked)

### File & Folder Naming

| Category         | Convention               | Example                           |
| ---------------- | ------------------------ | --------------------------------- |
| React components | PascalCase               | `DataTable.tsx`, `StatCard.tsx`   |
| Pages/routes     | PascalCase folder        | `Dashboard/`, `SystemHealth/`     |
| API routes       | kebab-case               | `authRoutes.js`, `storeRoutes.js` |
| Utils/helpers    | camelCase                | `formatDate.ts`, `pagination.js`  |
| Types/interfaces | PascalCase               | `BackupFile`, `StoreModel`        |
| Hooks            | camelCase, `use*` prefix | `useDashboard.ts`                 |
| CSS files        | camelCase                | `index.css` (root only)           |
| Config files     | kebab-case               | `vite.config.js`                  |

### Import Aliases

| Alias                | Path            | Scope                             |
| -------------------- | --------------- | --------------------------------- |
| `@/`                 | `apps/web/src/` | Frontend only                     |
| No alias for backend | —               | Backend uses relative `require()` |

### API Response Envelope

**Decision: Keep current shape** — `{ ok, data, meta, error }`

Rationale: Changing to `{ success, ... }` would break ALL frontend API calls (`if (!res.ok)` pattern used everywhere). The research says "preserve existing logic." The `ok` field name works fine — consistency matters more than naming preference.

### Error Handling Strategy

- **Backend:** Global error handler (last middleware) catches all thrown errors. Controllers use `asyncHandler` wrapper (catches async rejects). Zod validation errors get special handling.
- **Frontend:** Root-level `<ErrorBoundary>` catches render errors. API errors handled per-page via try/catch. Route-level `errorElement` not implemented (stretch goal).

### Auth Token Storage

**Decision: Keep localStorage** (not httpOnly cookie)

Rationale: This is an internal ops dashboard, not a consumer app. No refresh token mechanism exists. Adding httpOnly cookies + refresh tokens would require backend changes beyond "preserve existing logic" scope. Keep as-is, document as future improvement.

### TypeScript Migration Strategy

- **New files**: Write in TSX/TS only
- **Existing JSX files**: Migrate to TSX during refactor (Phase 4)
- **Backend**: Keep CommonJS (require/module.exports) — per constraints, no ESM migration

---

## 2. Target Monorepo Structure

```
enterprise-ops-monitor/
├── .env.example                    # NEW: consolidate all required vars
├── .gitignore                      # UPDATE: monorepo-aware
├── .npmrc                          # NEW: pnpm settings
├── package.json                    # UPDATE: add root scripts
├── pnpm-workspace.yaml             # KEEP: apps/* + packages/* (NEW)
├── prettier.config.js              # NEW: shared Prettier config
├── eslint.config.js                # NEW: shared ESLint 9 flat config
├── tsconfig.base.json              # NEW: shared TS config
├── packages/
│   └── shared/                     # NEW: shared types & utils
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── types/
│           │   ├── api.ts          # ApiResponse<T>, PaginationMeta
│           │   ├── models.ts       # User, Store, EODLog, etc.
│           │   └── index.ts
│           └── utils/
│               └── index.ts        # Pure helpers (no deps)
├── apps/
│   ├── web/                        # React 19 frontend (target structure below)
│   ├── api/                        # Express 5 backend (target structure below)
│   └── mock-api/                   # KEEP: standalone mock
├── docs/                           # Documentation
├── nginx/
│   └── security-headers.conf       # KEEP
├── scripts/                        # Utility scripts
└── agent_updates/                  # Runtime (gitignored)
```

### Target: apps/web/src/

```
apps/web/src/
├── assets/                         # Static files (empty for now)
├── components/
│   ├── ui/                         # shadcn primitives (DO NOT EDIT - shadcn CLI managed)
│   ├── common/                     # Reusable non-shadcn components
│   │   ├── DataTable.tsx           # MOVE from shared/ (already TanStack-based)
│   │   ├── DataTableToolbar.tsx
│   │   ├── DataTablePagination.tsx
│   │   ├── DataTableColumnHeader.tsx
│   │   ├── StatCard.tsx            # MOVE from shared/
│   │   ├── EmptyState.tsx          # MOVE from shared/
│   │   ├── ConfirmDialog.tsx       # MOVE from shared/
│   │   ├── StatusBadge.tsx         # MOVE from shared/
│   │   ├── SearchBar.tsx           # MOVE from shared/
│   │   ├── PageHeader.tsx          # MOVE from shared/
│   │   ├── PageShell.tsx           # MOVE from shared/
│   │   ├── PageLoader.tsx          # MOVE from components/
│   │   ├── PageTransition.tsx      # MOVE from components/
│   │   ├── SectionCard.tsx         # MOVE from shared/
│   │   ├── Toolbar.tsx             # MOVE from shared/
│   │   ├── Modal.tsx               # MOVE from shared/
│   │   ├── IconButton.tsx          # MOVE from shared/
│   │   ├── ProgressBar.tsx         # MOVE from shared/
│   │   ├── DatePicker.tsx          # MOVE from shared/
│   │   ├── LoadingSpinner.tsx      # MOVE from ui/feedback/
│   │   └── ErrorBoundary.tsx       # MOVE from ui/feedback/ (DELETE old ErrorBoundary.jsx)
│   ├── layout/
│   │   ├── AppShell.tsx            # NEW: SidebarProvider + Sidebar + SidebarInset
│   │   ├── Sidebar.tsx             # REFACTOR: Sidebar.jsx → TSX
│   │   ├── Header.tsx              # REFACTOR: Header.jsx → TSX
│   │   └── ContentSection.tsx      # KEEP from layout/
│   └── features/                   # Feature-specific composite components
│       ├── FeatureStoryBanner.tsx  # REFACTOR: FeatureStoryBanner.jsx → TSX
│       └── Guard.tsx               # REFACTOR: auth/Guard.jsx → TSX
├── pages/
│   ├── Dashboard/ (TSX)            # KEEP (already refactored)
│   ├── EODMonitor/ (TSX)           # KEEP (already refactored)
│   ├── Backups/ (TSX)              # KEEP (already refactored)
│   ├── office-agents/ (TSX)        # KEEP (already refactored)
│   ├── Login/                      # REFACTOR: index.jsx → index.tsx
│   ├── Logout/                     # REFACTOR: index.jsx → index.tsx
│   ├── Profile/                    # REFACTOR: index.jsx → index.tsx
│   ├── StoreSync/                  # REFACTOR: index.jsx → index.tsx
│   ├── StoreManagement/            # REFACTOR: index.jsx → index.tsx
│   ├── IdentityCheck/              # REFACTOR: index.jsx → index.tsx
│   ├── LiveSync/                   # REFACTOR: index.jsx → index.tsx
│   ├── SystemHealth/               # REFACTOR: index.jsx → index.tsx
│   ├── AfterHours/                 # REFACTOR: index.jsx → index.tsx
│   ├── AfterHoursReport/           # REFACTOR: index.jsx → index.tsx
│   ├── AgentUpdater/               # REFACTOR: index.jsx → index.tsx
│   ├── UsersAdmin/                 # REFACTOR: index.jsx → index.tsx
│   ├── RolesAdmin/                 # REFACTOR: index.jsx → index.tsx
│   └── About/                      # REFACTOR: index.jsx → index.tsx
├── hooks/                          # Global hooks
│   └── useAuth.ts                  # REFACTOR: context/AuthContext.jsx → TS hook
├── lib/
│   ├── api/
│   │   ├── client.ts               # REFACTOR: client.js → TS
│   │   ├── auth.ts                 # NEW: auth-specific API functions
│   │   ├── stores.ts               # NEW: store-specific API functions
│   │   ├── eod.ts                  # NEW: EOD-specific API functions
│   │   └── types.ts               # MOVE: lib/api/types.d.ts
│   ├── auth/
│   │   ├── permissions.ts          # KEEP
│   │   ├── roleMap.js              # KEEP
│   │   └── roles.js                # KEEP
│   ├── date.ts                     # REFACTOR: date.js → TS
│   ├── utils.ts                    # KEEP (cn() + shared)
│   ├── design-tokens.ts            # KEEP (already exists)
│   └── constants.ts                # NEW: app-wide constants
├── types/
│   └── index.ts                    # KEEP (User, ApiResponse, etc.)
├── router/
│   └── index.tsx                   # NEW: data router config (createBrowserRouter)
├── context/
│   ├── AuthContext.jsx              # MERGE into hooks/useAuth.ts then DELETE
│   └── AuthProvider.jsx             # MERGE into hooks/useAuth.ts then DELETE
├── data/
│   └── stories.js                  # KEEP (portfolio stories)
├── App.tsx                         # REFACTOR: App.jsx → TSX (lean, just providers)
├── main.tsx                        # REFACTOR: main.jsx → TSX
└── index.css                       # KEEP (with housekeeping: remove unused classes)
```

### Target: apps/api/src/

**Decision: Keep current structure** — no folder restructure for backend.

Rationale: The backend already follows a clean MVC-like pattern (routes → controllers → services → models). The key improvements needed are:

- Add Zod validation to all routes (incremental change to existing files)
- Extract remaining business logic from controllers to services (incremental)
- Ensure consistent `{ ok, data, meta, error }` on all responses (mostly there)

Backend target:

```
apps/api/
├── server.js              # KEEP (but extract app setup & listen into app.js + index.js)
├── app.js                 # SPLIT from server.js: Express setup + middleware + routes
├── index.js               # SPLIT from server.js: listen only
├── config/                # KEEP
├── middleware/            # KEEP
├── routes/                # KEEP (add validation middleware to each)
├── controllers/           # KEEP (extract business logic to services)
├── services/              # KEEP
├── models/                # KEEP
├── validators/            # NEW: move Zod schemas from routes into validators/
├── migrations/            # KEEP
├── utils/                 # KEEP
├── seed.js                # KEEP
├── seedRbac.js            # KEEP
└── tests/                 # KEEP
```

---

## 3. Migration Map

### Root Files

| Current Path              | Action | New Path             | Reason                                              |
| ------------------------- | ------ | -------------------- | --------------------------------------------------- |
| `package.json`            | UPDATE | same                 | Add root scripts: dev, build, lint, test, typecheck |
| `pnpm-workspace.yaml`     | UPDATE | same                 | Add packages/shared if created                      |
| `docker-compose.yml`      | KEEP   | same                 | Production compose                                  |
| `docker-compose.demo.yml` | KEEP   | same                 | Demo compose                                        |
| `docker-compose.prod.yml` | DELETE | —                    | Redundant with docker-compose.yml                   |
| `AGENTS.md`               | KEEP   | same                 | Agent guide                                         |
| `CLAUDE.md`               | KEEP   | same                 | Claude config                                       |
| `DESIGN.md`               | KEEP   | same                 | Architecture doc                                    |
| `PORTFOLIO.md`            | KEEP   | same                 | Portfolio doc                                       |
| `README.md`               | KEEP   | same                 | Readme                                              |
| —                         | NEW    | `.env.example`       | All required env vars documented                    |
| —                         | NEW    | `.npmrc`             | pnpm settings                                       |
| —                         | NEW    | `prettier.config.js` | Shared formatting                                   |
| —                         | NEW    | `eslint.config.js`   | Shared ESLint 9 flat config (apps extend this)      |
| —                         | NEW    | `tsconfig.base.json` | Shared TypeScript config                            |

### apps/web Files

| Current Path                            | Action   | New Path                                         | Reason                                  |
| --------------------------------------- | -------- | ------------------------------------------------ | --------------------------------------- |
| `src/App.jsx`                           | REFACTOR | `src/App.tsx`                                    | JSX → TSX + use data router             |
| `src/main.jsx`                          | REFACTOR | `src/main.tsx`                                   | JSX → TSX                               |
| `src/components/AppShell.jsx`           | DELETE   | —                                                | Redundant 3-line re-export of Layout    |
| `src/components/Layout.jsx`             | REFACTOR | `src/components/layout/AppShell.tsx`             | JSX → TSX + proper name                 |
| `src/components/Sidebar.jsx`            | REFACTOR | `src/components/layout/Sidebar.tsx`              | JSX → TSX                               |
| `src/components/Header.jsx`             | REFACTOR | `src/components/layout/Header.tsx`               | JSX → TSX                               |
| `src/components/PrivateRoute.jsx`       | REFACTOR | `src/components/common/PrivateRoute.tsx`         | JSX → TSX, move to common               |
| `src/components/Guard.jsx`              | REFACTOR | `src/components/features/Guard.tsx`              | JSX → TSX                               |
| `src/components/ErrorBoundary.jsx`      | DELETE   | —                                                | Replaced by ErrorBoundary.tsx           |
| `src/components/FeatureStoryBanner.jsx` | REFACTOR | `src/components/features/FeatureStoryBanner.tsx` | JSX → TSX                               |
| `src/components/PageTransition.jsx`     | REFACTOR | `src/components/common/PageTransition.tsx`       | JSX → TSX                               |
| `src/components/PageLoader.jsx`         | MOVE     | `src/components/common/PageLoader.tsx`           | Move + convert                          |
| `src/components/UserAccessModal.jsx`    | REFACTOR | `src/components/features/UserAccessModal.tsx`    | Use shadcn Dialog                       |
| `src/components/shared/DataTable.tsx`   | MOVE     | `src/components/common/DataTable.tsx`            | Better folder name                      |
| `src/components/ui/data-table/*`        | MOVE     | `src/components/common/data-table/*`             | Not shadcn-managed                      |
| `src/components/ui/cards/*`             | MOVE     | `src/components/common/cards/*`                  | Not shadcn-managed                      |
| `src/components/ui/forms/*`             | MOVE     | `src/components/common/forms/*`                  | Not shadcn-managed                      |
| `src/components/ui/feedback/*`          | MOVE     | `src/components/common/feedback/*`               | Not shadcn-managed                      |
| `src/components/shared/*.tsx`           | MOVE     | `src/components/common/*.tsx`                    | Consolidate shared → common             |
| `src/context/AuthContext.jsx`           | MERGE    | `src/hooks/useAuth.ts`                           | Convert to hook, delete context pattern |
| `src/context/AuthProvider.jsx`          | MERGE    | `src/hooks/useAuth.ts`                           | Merge into hook                         |
| `src/lib/api/client.js`                 | REFACTOR | `src/lib/api/client.ts`                          | JS → TS                                 |
| —                                       | NEW      | `src/lib/api/auth.ts`                            | Domain-specific API functions           |
| —                                       | NEW      | `src/lib/api/stores.ts`                          | Domain-specific API functions           |
| —                                       | NEW      | `src/lib/api/eod.ts`                             | Domain-specific API functions           |
| —                                       | NEW      | `src/router/index.tsx`                           | Data router config                      |
| `src/pages/Login/index.jsx`             | REFACTOR | `src/pages/Login/index.tsx`                      | JSX → TSX                               |
| `src/pages/Logout/index.jsx`            | REFACTOR | `src/pages/Logout/index.tsx`                     | JSX → TSX                               |
| `src/pages/Profile/index.jsx`           | REFACTOR | `src/pages/Profile/index.tsx`                    | JSX → TSX                               |
| `src/pages/StoreSync/index.jsx`         | REFACTOR | `src/pages/StoreSync/index.tsx`                  | JSX → TSX                               |
| `src/pages/StoreManagement/index.jsx`   | REFACTOR | `src/pages/StoreManagement/index.tsx`            | JSX → TSX                               |
| `src/pages/IdentityCheck/index.jsx`     | REFACTOR | `src/pages/IdentityCheck/index.tsx`              | JSX → TSX                               |
| `src/pages/LiveSync/index.jsx`          | REFACTOR | `src/pages/LiveSync/index.tsx`                   | JSX → TSX                               |
| `src/pages/SystemHealth/index.jsx`      | REFACTOR | `src/pages/SystemHealth/index.tsx`               | JSX → TSX                               |
| `src/pages/AfterHours/index.jsx`        | REFACTOR | `src/pages/AfterHours/index.tsx`                 | JSX → TSX                               |
| `src/pages/AfterHoursReport/index.jsx`  | REFACTOR | `src/pages/AfterHoursReport/index.tsx`           | JSX → TSX                               |
| `src/pages/AgentUpdater/index.jsx`      | REFACTOR | `src/pages/AgentUpdater/index.tsx`               | JSX → TSX                               |
| `src/pages/UsersAdmin/index.jsx`        | REFACTOR | `src/pages/UsersAdmin/index.tsx`                 | JSX → TSX                               |
| `src/pages/RolesAdmin/index.jsx`        | REFACTOR | `src/pages/RolesAdmin/index.tsx`                 | JSX → TSX                               |
| `src/pages/About/index.jsx`             | REFACTOR | `src/pages/About/index.tsx`                      | JSX → TSX                               |

### apps/api Files

| Current Path             | Action | New Path              | Reason                                       |
| ------------------------ | ------ | --------------------- | -------------------------------------------- |
| `server.js`              | SPLIT  | `app.js` + `index.js` | Separate app config from listen              |
| `middleware/validate.js` | KEEP   | same                  | But needs to be applied to all routes        |
| `utils/response.js`      | KEEP   | same                  | Keep `{ ok, data, meta, error }` shape       |
| Routes (all)             | UPDATE | same                  | Add Zod validation middleware to each        |
| Controllers (all)        | UPDATE | same                  | Extract remaining business logic to services |
| —                        | NEW    | `validators/` dir     | Centralized Zod schemas per domain           |

### Files to DELETE

| File                                         | Reason                            |
| -------------------------------------------- | --------------------------------- |
| `docker-compose.prod.yml`                    | Redundant with docker-compose.yml |
| `src/components/AppShell.jsx`                | Redundant re-export               |
| `src/components/ErrorBoundary.jsx`           | Replaced by TSX version           |
| `src/components/ui/Toast.jsx`                | Already deleted in prev phase     |
| `src/components/ui/ToastContext.jsx`         | Already deleted in prev phase     |
| `src/context/AuthContext.jsx`                | Merged into useAuth hook          |
| `src/context/AuthProvider.jsx`               | Merged into useAuth hook          |
| `src/components/shared/Card.jsx` (if exists) | Replaced by shadcn Card           |

### Files to KEEP as-is

| File                          | Reason                              |
| ----------------------------- | ----------------------------------- |
| `src/lib/auth/permissions.js` | Working, no need to change          |
| `src/lib/auth/roleMap.js`     | Working, no need to change          |
| `src/lib/auth/roles.js`       | Working, no need to change          |
| `src/data/stories.js`         | Static data                         |
| `src/types/index.ts`          | Working, no need to change          |
| `src/lib/utils.ts`            | cn() helper                         |
| `src/lib/date.js`             | WIB helpers                         |
| `src/lib/design-tokens.ts`    | Already exists                      |
| `src/index.css`               | Design tokens + utilities           |
| `mock-api/server.js`          | Standalone, no changes needed       |
| All `ui/*.tsx` (shadcn)       | Managed by CLI, not edited manually |
| All backend `models/*`        | Working                             |
| All backend `migrations/*`    | Working                             |
| All backend `utils/*`         | Working                             |
| `nginx/security-headers.conf` | Working                             |

---

## 4. Commit Strategy

| Phase    | Commit Message                                       | Scope                                      |
| -------- | ---------------------------------------------------- | ------------------------------------------ |
| Phase 2  | `refactor(root): phase 2 — monorepo foundation`      | Root configs + shared packages             |
| Phase 3a | `refactor(api): phase 3a — middleware & validation`  | Add Zod to all routes, ensure auth         |
| Phase 3b | `refactor(api): phase 3b — service layer extraction` | Move logic from controllers to services    |
| Phase 3c | `refactor(api): phase 3c — app.js split + cleanup`   | Split server.js → app.js + index.js        |
| Phase 4a | `refactor(web): phase 4a — router & API layer`       | Data router + domain API modules           |
| Phase 4b | `refactor(web): phase 4b — layout migration`         | Sidebar, Header, AppShell → TSX            |
| Phase 4c | `refactor(web): phase 4c — page migrations batch 1`  | Login, Logout, Profile, About, LiveSync    |
| Phase 4d | `refactor(web): phase 4d — page migrations batch 2`  | StoreSync, StoreManagement, IdentityCheck  |
| Phase 4e | `refactor(web): phase 4e — page migrations batch 3`  | SystemHealth, AfterHours, AfterHoursReport |
| Phase 4f | `refactor(web): phase 4f — page migrations batch 4`  | AgentUpdater, UsersAdmin, RolesAdmin       |
| Phase 5  | `refactor(infra): phase 5 — infrastructure cleanup`  | Docker, nginx, .env.example                |
| Phase 6  | `refactor: phase 6 — quality gate`                   | Lint, typecheck, test, build               |

### Rollback Points

Each commit is a rollback checkpoint. If something breaks, revert the last commit:

```bash
git revert HEAD --no-edit
```

---

## 5. Summary of Work

| Category     | Files to REFACTOR | Files to MOVE | Files to DELETE | Files to CREATE |
| ------------ | ----------------- | ------------- | --------------- | --------------- |
| **Root**     | 2                 | 0             | 1               | 4               |
| **apps/web** | 23                | 22            | 5               | 6               |
| **apps/api** | 15                | 0             | 0               | 1               |
| **Total**    | ~40               | ~22           | ~6              | ~11             |

**Estimated total: ~55-60 files changed across all phases.**

---

## 6. Risks & Mitigations

| Risk                                               | Likelihood | Mitigation                                            |
| -------------------------------------------------- | ---------- | ----------------------------------------------------- |
| JSX → TSX introduces type errors                   | Medium     | Commit after each page, test immediately              |
| Route changes break navigation                     | Low        | Keep all route paths identical                        |
| Auth context → hook breaks login                   | Medium     | Test login flow immediately after migration           |
| Data router breaks lazy loading                    | Low        | Keep lazy() pattern, just wrap in createBrowserRouter |
| Zod validation on API routes blocks valid requests | Low        | Test each validated endpoint immediately              |
