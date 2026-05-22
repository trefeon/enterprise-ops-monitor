# Reconstruction Audit — Enterprise Ops Monitor

> Date: 2026-05-22
> Phase 0 output for full repo reconstruction

---

## 1. Monorepo Structure

### Current Folder Tree (2 levels deep)

```
enterprise-ops-monitor/
├── .env                        # Local env vars (gitignored)
├── .env.example                # Missing — no example file!
├── .gitignore                  # Present, moderately complete
├── AGENTS.md                   # Project guide for AI agents
├── CLAUDE.md                   # Claude Code config
├── DESIGN.md                   # Architecture design doc
├── PORTFOLIO.md                # Portfolio showcase doc
├── README.md                   # Project README
├── package.json                # Root workspace (pnpm)
├── pnpm-lock.yaml              # Lockfile
├── pnpm-workspace.yaml         # Workspace: apps/*
├── docker-compose.yml          # Production Docker setup
├── docker-compose.demo.yml     # Demo Docker setup (mock API)
├── docker-compose.prod.yml     # Production Docker setup (duplicate of docker-compose.yml)
├── apps/
│   ├── api/                    # Express 5 + Sequelize 6 backend
│   ├── web/                    # React 19 + Vite 7 frontend
│   └── mock-api/               # Standalone Express mock server
├── docs/                       # Documentation
├── nginx/
│   └── security-headers.conf   # Nginx security config
├── backups/                    # Runtime backup files (gitignored)
├── agent_updates/              # Agent update files (gitignored)
├── scripts/                    # Utility scripts
└── .agent/                     # Antigravity agent config
```

### pnpm-workspace.yaml
```yaml
packages:
  - "apps/*"
```
Simple glob — includes all apps/. No `packages/` directory. No shared packages.

### Issues Found
- **No `.env.example`** — required vars are undocumented
- **`docker-compose.yml` vs `docker-compose.prod.yml`** — duplicates, nearly identical
- **No `packages/` directory** — no shared types or utils between FE and BE
- **No root configs** — ESLint, Prettier, lint-staged at root level (they're in apps/)
- **No tsconfig.base.json** — TypeScript config not shared

---

## 2. Frontend Audit (apps/web)

### Current Structure

```
apps/web/
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── components.json           # shadcn config
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── index.html
├── Dockerfile
├── .env                       # env vars
├── .env.example               # exists
├── src/
│   ├── App.jsx                # Root: routes, lazy-load, providers — JSX, not TSX
│   ├── main.jsx               # Entry point
│   ├── index.css              # Global styles + design tokens (377 lines)
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── AppShell.jsx       # Re-export of Layout.jsx
│   │   ├── Layout.jsx         # Root layout: Sidebar + Header + Outlet
│   │   ├── Sidebar.jsx        # Collapsible nav, user profile, mobile sheet
│   │   ├── Header.jsx         # Top bar: mobile menu, org name, avatar
│   │   ├── FeatureStoryBanner.jsx  # Portfolio story expandable banner
│   │   ├── PageTransition.jsx # Framer-motion page enter/exit
│   │   ├── PageLoader.jsx     # Global lazy-load skeleton
│   │   ├── PrivateRoute.jsx   # Auth gate + permission check
│   │   ├── ErrorBoundary.jsx  # React error boundary (OLD, replaced by TSX version)
│   │   ├── UserAccessModal.jsx# User management modal (manual, not shadcn Dialog)
│   │   ├── auth/
│   │   │   └── Guard.jsx      # Permission-based conditional render
│   │   ├── data/columns/      # Legacy column definitions (3 files)
│   │   ├── shared/            # Reusable components (14 files)
│   │   │   ├── DataTable.tsx  # TanStack-based DataTable (NEW)
│   │   │   ├── StatCard.tsx, EmptyState.tsx, SectionCard.tsx
│   │   │   ├── PageHeader.tsx, PageShell.tsx, Modal.tsx, ConfirmDialog.tsx
│   │   │   ├── SearchBar.tsx, StatusBadge.tsx, Toolbar.tsx
│   │   │   ├── ProgressBar.tsx, DatePicker.tsx, IconButton.tsx
│   │   └── ui/                # shadcn primitives (35 files)
│   │       ├── button.tsx, card.tsx, dialog.tsx, input.tsx, etc.
│   │       ├── data-table/    # NEW: TanStack-based DataTable set
│   │       ├── cards/         # NEW: ListCard, DetailCard, ActionCard, EmptyCard
│   │       ├── forms/         # NEW: FormField, SearchInput, FilterBar
│   │       └── feedback/      # NEW: LoadingSpinner, ErrorBoundary (TSX)
│   ├── pages/                 # 17 page directories
│   │   ├── Dashboard/ (TSX)   # Refactored
│   │   ├── EODMonitor/ (TSX)  # Refactored (152 lines)
│   │   ├── Backups/ (TSX)     # Refactored (211 lines)
│   │   ├── office-agents/ (TSX)# Refactored
│   │   └── 13 more JSX pages # NOT yet refactored
│   ├── context/               # AuthContext.jsx, AuthProvider.jsx
│   ├── hooks/                 # Empty directory
│   ├── lib/
│   │   ├── api/               # Axios wrapper (client.js, types.d.ts, types.js)
│   │   ├── auth/              # permissions.js, roleMap.js, roles.js
│   │   ├── dashboard/         # noData.js
│   │   ├── date.js            # WIB date helpers
│   │   ├── design-tokens.ts   # NEW: Design token constants
│   │   └── utils.ts           # cn() helper
│   ├── data/                  # stories.js (portfolio feature stories)
│   ├── types/                 # index.ts (User, ApiResponse, etc.)
│   └── test/                  # setupTests.js
```

### Components Summary

| Component | Path | Type | Reusable | Has Loading | Has Empty | Has Error | TypeScript |
|---|---|---|---|---|---|---|---|
| DataTable | shared/DataTable.tsx | TSX | ✅ | ✅ | ✅ | ❌ | ✅ |
| StatCard | shared/StatCard.tsx | TSX | ✅ | ✅ | ❌ | ❌ | ✅ |
| EmptyState | shared/EmptyState.tsx | TSX | ✅ | ❌ | ✅ | ❌ | ✅ |
| PageHeader | shared/PageHeader.tsx | TSX | ✅ | ❌ | ❌ | ❌ | ✅ |
| PageShell | shared/PageShell.tsx | TSX | ✅ | ❌ | ❌ | ❌ | ✅ |
| Modal | shared/Modal.tsx | TSX | ✅ | ❌ | ❌ | ❌ | ✅ |
| ConfirmDialog | shared/ConfirmDialog.tsx | TSX | ✅ | ✅ | ❌ | ❌ | ✅ |
| SectionCard | shared/SectionCard.tsx | TSX | ✅ | ❌ | ❌ | ❌ | ✅ |
| Toolbar | shared/Toolbar.tsx | TSX | ✅ | ❌ | ❌ | ❌ | ✅ |
| StatusBadge | shared/StatusBadge.tsx | TSX | ✅ | ❌ | ❌ | ❌ | ✅ |
| SearchBar | shared/SearchBar.tsx | TSX | ✅ | ❌ | ❌ | ❌ | ✅ |
| IconButton | shared/IconButton.tsx | TSX | ✅ | ❌ | ❌ | ❌ | ✅ |
| ProgressBar | shared/ProgressBar.tsx | TSX | ✅ | ❌ | ❌ | ❌ | ✅ |
| Sidebar | Sidebar.jsx | JSX | ✅ | ❌ | ❌ | ❌ | ❌ |
| Header | Header.jsx | JSX | ✅ | ❌ | ❌ | ❌ | ❌ |
| Layout | Layout.jsx | JSX | ✅ | ❌ | ❌ | ❌ | ❌ |
| PrivateRoute | PrivateRoute.jsx | JSX | ✅ | ❌ | ❌ | ❌ | ❌ |
| Guard | auth/Guard.jsx | JSX | ✅ | ❌ | ❌ | ❌ | ❌ |
| UserAccessModal | UserAccessModal.jsx | JSX | ❌ | ✅ | ❌ | ❌ | ❌ |
| PageTransition | PageTransition.jsx | JSX | ✅ | ❌ | ❌ | ❌ | ❌ |
| PageLoader | PageLoader.jsx | JSX | ✅ | ✅ | ❌ | ❌ | ❌ |
| FeatureStoryBanner | FeatureStoryBanner.jsx | JSX | ❌ | ❌ | ❌ | ❌ | ❌ |
| ErrorBoundary (old) | ErrorBoundary.jsx | JSX | ✅ | ❌ | ❌ | ✅ | ❌ |
| ErrorBoundary (new) | ui/feedback/ErrorBoundary.tsx | TSX | ✅ | ❌ | ❌ | ✅ | ✅ |

### Routing (react-router-dom 7)

Current setup in `App.jsx` uses `<BrowserRouter>` + `<Routes>` + `<Route>` pattern (not data router).
- 17 lazy-loaded pages via `React.lazy()`
- Wrapped in `<Suspense>` with inline fallback
- `<AppShell>` wraps authenticated routes
- `<PrivateRoute>` handles auth + permission checks
- Page transitions via `<PageTransition>` (framer-motion)

### Flagged Issues

1. **JSX → TSX migration**: App.jsx, Sidebar, Header, Layout, Guard, PrivateRoute, ErrorBoundary (old), UserAccessModal, and 13 pages still in JSX
2. **AppShell.jsx** is a redundant 3-line re-export of Layout.jsx
3. **hooks/** directory is empty
4. **ErrorBoundary.jsx** (old) still exists alongside new ErrorBoundary.tsx (new one not wired in)
5. **Sonner** installed but `<Toaster>` in App.jsx needs verification
6. **Inline styles** in Login page (`.login-*` CSS classes in index.css)
7. **No router loaders** — all data fetching is in useEffect
8. **No route-level errorElement**

---

## 3. Backend Audit (apps/api)

### Current Structure

```
apps/api/
├── server.js              # Entry: Express setup, middleware, routes, listen
├── config/
│   ├── env.js             # Zod env validation (fail-fast)
│   └── afterhoursDefaults.js
├── middleware/            # 7 middleware files
│   ├── authMiddleware.js  # JWT verification
│   ├── rbac.js            # RBAC permission check
│   ├── errorHandler.js    # Global error handler
│   ├── notFound.js        # 404 handler
│   ├── requestId.js       # Request ID generator
│   ├── validate.js        # Zod validation middleware
│   └── cacheHeaders.js    # Cache control headers
├── routes/                # 15 route files
├── controllers/           # 14 controllers
├── services/              # 11+ services
├── models/                # 16 Sequelize models
├── migrations/            # 10 migration files
├── utils/                 # 14 utility files
├── seed.js                # Database seeder
├── seedRbac.js            # RBAC seeder
└── tests/                 # 14 test files
```

### Routes — Complete Map (30+ endpoints)

| Method | Path | Auth | Validation |
|---|---|---|---|
| POST | /api/auth/login | No | Zod ✅ |
| POST | /api/auth/logout | Yes | ❌ |
| GET | /api/auth/me | Yes | ❌ |
| PATCH | /api/auth/me/password | Yes | Zod ✅ |
| GET | /api/dashboard/summary | Yes | ❌ |
| GET | /api/dashboard/alerts | Yes | ❌ |
| POST | /api/dashboard/sync | Yes | ❌ |
| GET | /api/eod/stores | Yes | ❌ |
| GET | /api/eod/areas | Yes | ❌ |
| GET | /api/eod/trend | Yes | ❌ |
| GET | /api/eod/ranking | Yes | ❌ |
| GET | /api/eod/stores/:storeCode/history | Yes | ❌ |
| POST | /api/eod/sync | Yes | ❌ |
| GET | /api/stores | Yes | ❌ |
| GET | /api/stores/:storeCode | Yes | ❌ |
| GET | /api/sync/summary | Yes | ❌ |
| GET | /api/sync/logs | Yes | ❌ |
| GET | /api/backups/summary | Yes | ❌ |
| GET | /api/backups/files | Yes | ❌ |
| POST | /api/backups/run | Yes | ❌ |
| DELETE | /api/backups/files/:fileName | Yes | ❌ |
| POST | /api/backups/restore | Yes | ❌ |
| GET | /api/backups/files/:fileName/download | Yes | ❌ |
| GET | /api/users | Yes | ❌ |
| GET | /api/users/:id | Yes | ❌ |
| PATCH | /api/users/:id/roles | Yes | ❌ |
| PATCH | /api/users/:id/branch-scope | Yes | ❌ |
| PATCH | /api/users/:id/permissions | Yes | ❌ |
| GET | /api/roles | Yes | ❌ |
| POST | /api/roles | Yes | ❌ |
| PATCH | /api/roles/:id | Yes | ❌ |
| DELETE | /api/roles/:id | Yes | ❌ |
| GET | /api/system/branches | Yes | ❌ |
| GET | /api/system/services | Yes | ❌ |
| POST | /api/system/services/:name/restart | Yes | ❌ |
| GET | /api/agents | Yes | ❌ |
| GET | /api/agents/:id | Yes | ❌ |
| POST | /api/agents/:id/update | Yes | ❌ |
| GET | /api/afterhours/settings | Yes | ❌ |
| PATCH | /api/afterhours/settings | Yes | ❌ |
| GET | /api/nik/list | Yes | ❌ |
| GET | /api/nik/roles | Yes | ❌ |

### Flagged Issues

1. **Validation**: Only 2 out of 40+ routes have Zod validation (auth/login, auth/me/password)
2. **Auth checks**: All routes use authMiddleware but some may be missing RBAC
3. **Response envelope**: Uses `{ ok, data, meta, error }` — guide proposes `{ success, data, error, meta }` — need to decide
4. **No refresh token**: JWT only uses single access token, no refresh mechanism
5. **business logic in controllers**: Some controllers mix request handling with business logic
6. **CommonJS**: All files use require/module.exports (consistent, no migration needed per constraints)
7. **console.log**: Present in authMiddleware.js (line 66) and errorHandler.js (line 38)

### Auth Flow
- Login → JWT issued (no expiry noted in code, defaults to how jsonwebtoken works)
- Token stored in localStorage
- Auth middleware: verify JWT → load authz from DB → attach req.user + req.authz
- RBAC middleware: check effectivePerms against required permission
- Special case: `env_admin` (from .env) gets synthetic super_admin authz

---

## 4. Infrastructure Audit

### docker-compose.yml
- Services: api, web, eom-db, autoheal
- api health check ✅
- db health check ✅
- web health check ✅
- External volume: `eom_postgres_data` ✅
- Network: bridge (app-network) ✅
- **Issues:** No nginx service, no mock-api in main compose

### docker-compose.demo.yml
- Services: mock-api, web (demo)
- Mock API on port 4000
- Web with VITE_API_URL pointing to mock API

### docker-compose.prod.yml
- Nearly identical to docker-compose.yml — redundant

### nginx/security-headers.conf
- HSTS, X-Content-Type-Options, X-Frame-Options, CSP ✅
- **Missing:** Nginx site config (reverse proxy rules)

### .env (current state)
- 31 lines covering DB, auth, default users, backups, data sync
- **Missing:** JWT expiration config, NODE_ENV, mock API port

---

## 5. Research Alignment Gap

### From docs/fe-research.md

| Recommendation | Implemented? | Priority |
|---|---|---|
| TanStack Table + shadcn Table | ✅ Done (DataTable.tsx) | HIGH |
| Sonner toast (replace custom) | ✅ Done (all pages migrated) | HIGH |
| Form components (RHF + Zod) | ⚠️ Partially (form.tsx exists, not wired to pages) | MED |
| Sidebar component (shadcn official) | ❌ Not done (custom Sidebar.jsx) | MED |
| Card variants (ListCard, DetailCard, etc.) | ✅ Done | MED |
| Design token constants | ✅ Done (design-tokens.ts) | LOW |
| Framer-motion page transitions | ✅ Already present | LOW |
| JSX → TSX migration (all components) | ⚠️ Partial (Sidebar, Header, etc. still JSX) | HIGH |
| Loading states on all pages | ⚠️ Partial (Dashboard ✅, EOD ✅, others ❌) | HIGH |
| Empty states on all lists | ⚠️ Partial | MED |
| Error boundaries per page | ❌ Not done (only root-level) | MED |
| Route-level errorElement | ❌ Not done (uses old Router, not data router) | LOW |

### From docs/fe-backend-audit.md

| Recommendation | Implemented? | Priority |
|---|---|---|
| Zod validation on all routes | ❌ Only 2/40+ routes validated | HIGH |
| Service layer extraction | ⚠️ Partial (some business logic in controllers) | MED |
| Consistent response envelope | ⚠️ Uses `ok` vs proposed `success` | LOW |
| Refresh token mechanism | ❌ Not present | MED |
| Remove console.log | ❌ Present in authMiddleware + errorHandler | LOW |
| OpenAPI/Swagger docs | ❌ Not present | LOW |

---

## Summary of Key Findings

### Blocking Issues (Must Fix)
1. **Most API routes lack Zod validation** — only 2/40+ validated
2. **13 of 17 pages still in JSX** (not TSX)
3. **No .env.example** at repo root
4. **Root-level ESLint/Prettier/lint-staged configs missing**
5. **No router loaders** — all data fetch via useEffect

### Medium Priority
6. **Duplicate docker-compose files** (yml vs prod.yml)
7. **AppShell.jsx** is a redundant 3-line wrapper
8. **hooks/** directory is empty
9. **Old ErrorBoundary.jsx** not removed after TSX replacement
10. **Response envelope** inconsistency (`ok` vs `success`)

### Low Priority
11. **No packages/ directory** for shared types
12. **noData.js** in lib/dashboard/ — only used in one place
13. **CSS utility classes** in index.css (350+ lines) could be componentized
14. **No nginx site config** (only security headers file)
