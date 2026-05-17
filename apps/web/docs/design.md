# Frontend Design — Enterprise Operations Monitor

## Stack Overview

| Layer | Technology |
| --- | --- |
| Framework | React 19 |
| Build | Vite 7 |
| Language | Hybrid JSX / TSX (`.jsx` pages, `.tsx` shared components) |
| Routing | React Router 7 (lazy-loaded routes, nested layouts) |
| Styling | Tailwind CSS 3 + CSS custom properties |
| Component System | shadcn/ui (base-nova style) + custom legacy components |
| Icons | Material Symbols (outlined) + Lucide React |
| Animation | Framer Motion 12 |
| HTTP Client | Axios 1.13 with request/response interceptors |
| Test | Vitest 4 + jsdom + @testing-library/react |
| Lint | ESLint 9 + Prettier 3 |
| Auth | JWT (Bearer token) via Axios interceptor |

## Project Structure

```
src/
├── main.jsx                  # Entry point — renders <App> with StrictMode
├── App.jsx                   # Root component — router, providers, lazy pages
├── index.css                 # Global styles, CSS variables, Tailwind layers
├── vite-env.d.ts             # Vite type declarations
│
├── context/
│   ├── AuthContext.jsx        # createContext / useAuth hook
│   └── AuthProvider.jsx       # login(), logout(), token/user persistence
│
├── components/
│   ├── AppShell.jsx           # Re-exports Layout (route wrapper)
│   ├── Layout.jsx             # Sidebar + Header + <Outlet> shell
│   ├── Sidebar.jsx            # Collapsible nav, permission-filtered links
│   ├── Header.jsx             # Top bar with mobile menu toggle + profile shortcut
│   ├── PrivateRoute.jsx       # Auth guard + permission check per route
│   ├── ErrorBoundary.jsx      # Class-based crash recovery UI
│   ├── PageTransition.jsx     # Framer Motion fade/slide wrapper
│   ├── PageLoader.jsx         # Suspense fallback spinner
│   ├── FeatureStoryBanner.jsx # Per-page problem/solution/impact accordion
│   ├── UserAccessModal.jsx    # Bulk user permission management UI
│   ├── auth/
│   │   └── Guard.jsx          # Action-level permission gate (hides/falls back)
│   ├── shared/
│   │   ├── DataTable.tsx      # Reusable sortable/filterable table
│   │   ├── StatCard.tsx       # KPI card with icon + value + subtext
│   │   ├── PageHeader.tsx     # Title + description + meta + actions row
│   │   ├── SearchBar.tsx      # Debounced search input
│   │   ├── StatusBadge.tsx    # Colored status indicator
│   │   └── EmptyState.tsx     # Placeholder for empty data
│   └── ui/                    # shadcn/ui primitives + legacy UI
│       ├── button.tsx, card.tsx, input.tsx, select.tsx, ...
│       ├── badge.tsx, table.tsx, skeleton.tsx, progress.tsx
│       ├── dialog.tsx, sheet.tsx, separator.tsx
│       ├── sonner.tsx         # Toast notification shim (sonner)
│       ├── Toast.jsx / ToastContext.jsx  # Legacy toast wrapper
│       ├── Modal.jsx, ConfirmDialog.jsx  # Legacy modal/dialog
│       ├── DataTable.jsx, EmptyState.jsx # Legacy shared data components
│       ├── Divider.jsx, IconButton.jsx, IconLink.jsx
│       ├── PageShell.jsx, PageHeader.jsx, StatCard.jsx
│       ├── ProgressBar.jsx, SectionCard.jsx, StatusBadge.jsx
│       └── Toolbar.jsx
│
├── lib/
│   ├── api/
│   │   ├── client.js          # Axios instance, interceptors, apiGet/Post/Patch/Put/Delete
│   │   ├── types.js           # API response envelope type helpers
│   │   └── types.d.ts         # TypeScript declarations for envelope
│   ├── auth/
│   │   ├── permissions.js     # All 30 permission constants, groups, RolePermissions, hasPermission()
│   │   ├── roleMap.js         # Normalizes role names to canonical IDs
│   │   └── roles.js           # hasAtLeast() role hierarchy check
│   ├── dashboard/
│   │   └── data.js            # Dashboard data transformation helpers
│   ├── date.js                # WIB timezone utilities (Intl.DateTimeFormat)
│   └── utils.ts               # Generic cn() classname merger
│
├── data/
│   └── stories.js             # Feature story definitions (16 features)
│       # Each story: id, featureName, route, tagline, problem, solution,
│       # impact, metrics[], techHighlight, materialIcon
│
├── pages/
│   ├── Dashboard/             # / — KPI cards, alerts table, auto-refresh 60s (TSX)
│   │   ├── index.tsx, types.ts, hooks/useDashboard.ts
│   ├── EODMonitor/            # /eod — Store EOD status, filters, retry, export
│   │   └── index.jsx
│   ├── StoreSync/             # /sync — Branch health, store freshness, history views
│   │   └── index.jsx
│   ├── StoreManagement/       # /stores — Searchable store directory
│   │   └── index.jsx
│   ├── IdentityCheck/         # /identity — Employee NIK/name directory
│   │   └── index.jsx
│   ├── Backups/               # /backups — Snapshot list, run/delete/restore
│   │   └── index.jsx
│   ├── SystemHealth/          # /system — Service status, healthchecks, log viewer
│   │   └── index.jsx
│   ├── AgentUpdater/          # /agent-updater — Agent rollout, version upload
│   │   └── index.jsx
│   ├── office-agents/         # /office-agents — Machine monitoring (TSX)
│   │   ├── index.tsx, types.ts, mock-data.ts
│   │   ├── hooks/useOfficeAgents.ts
│   │   └── components/
│   │       ├── MachineTable.tsx, MachineDetailDrawer.tsx
│   │       ├── DownloadDialog.tsx, LabelEditDialog.tsx
│   ├── UsersAdmin/            # /admin/users — User CRUD, roles, scopes
│   │   └── index.jsx
│   ├── RolesAdmin/            # /admin/roles — Role editor, permission groups
│   │   └── index.jsx
│   ├── AfterHours/            # /admin/afterhours — Violation checks, notifications
│   │   └── index.jsx (lazy imports AfterHoursReport)
│   ├── AfterHoursReport/      # Lazy-loaded monthly report view
│   │   └── index.jsx
│   ├── LiveSync/              # /live, /live.html — Public wallboard
│   │   └── index.jsx
│   ├── Login/                 # /login — Demo auto-type, manual login
│   │   └── index.jsx
│   ├── Logout/                # /logout — Confirmation-based session exit
│   │   └── index.jsx
│   ├── Profile/               # /profile — User info, password change
│   │   └── index.jsx
│   └── About/                 # /about — Portfolio narrative, feature catalog
│       └── index.jsx
│
├── assets/                    # Static assets
├── test/
│   └── setupTests.js          # Vitest test setup
├── types/                     # Global type declarations
└── docs/
    └── design.md              # This file
```

## Architecture & Design Decisions

### 1. Routing Architecture

The app uses a **layered route guard** pattern:

```
<BrowserRouter>
  <ErrorBoundary>                          # Catches render crashes
    <AuthProvider>                          # JWT state, login/logout
      <ToastProvider>                       # Toast notification context
        <Suspense>                          # Lazy-load fallback
          <Routes>
            /login        → Login           # Public
            /live         → LiveSync        # Public
            /live.html    → LiveSync        # Public

            <PrivateRoute>                  # Auth gate (no user → redirect /login)
              <AppShell>                    # Sidebar + Header + <Outlet>
                <PrivateRoute perm=X>       # Permission gate per route
                  PAGE
                </PrivateRoute>
                /about → About              # Auth-only, no extra permission
                /profile → Profile          # Auth-only, no extra permission
                /logout → Logout            # Auth-only, no extra permission
              </AppShell>
            </PrivateRoute>
          </Routes>
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  </ErrorBoundary>
</BrowserRouter>
```

- **Lazy loading** — all pages use `React.lazy()` + `Suspense` for code splitting
- **PageTransition** — each route gets a framer-motion fade+slide animation
- `/eod-area` redirects to `/eod` for backward compatibility

### 2. Authentication & State

**AuthProvider** manages the entire auth lifecycle:

- **Storage**: Dual-mode — `localStorage` (persistent/"Remember me") or `sessionStorage` (session-only)
- **Token**: JWT stored as `token` key, injected via Axios interceptor (`Authorization: Bearer <token>`)
- **User**: Stored as JSON `user` key, refreshed on mount via `GET /auth/me`
- **RBAC v2**: User object carries `effectivePerms[]`, `roleNames[]`, `scopeBranches[]`, `isAllBranches`
- **Logout**: Clears both storages, deletes Axios header, sets user to null

### 3. Authorization (RBAC)

Three-layer permission check:

| Layer | Mechanism | Location |
| --- | --- | --- |
| Route access | `<PrivateRoute requiredPerm={X}>` | `App.jsx` |
| Nav visibility | `Sidebar.jsx` filters items via `hasPermission()` | `Sidebar.jsx` |
| Action visibility | `<Guard permission={X}>` shows/hides buttons | per-page |

- **30 permissions** across 8 categories (Monitoring, Store Ops, Employee Data, Backups, System, After Hours, User Management, Agent)
- **7 system roles**: `viewer`, `ops`, `admin`, `super_admin`, `demo`, `it`, `hc`
- **hasPermission(user, perm)**: First checks `user.effectivePerms` (RBAC v2), falls back to legacy `RolePermissions` map
- **Guard component**: Shows children for demo users (action buttons visible but handler-blocked on click + 403 from API)

### 4. API Communication

**Axios client** (base `VITE_API_URL || /api`):

- **Request interceptor**: Attaches Bearer token from storage
- **Response interceptor**: Unwraps `response.data`, normalizes errors to `{ ok, code, message }`
- **Error types**: `TIMEOUT`, `NETWORK_ERROR`, `HTTP_ERROR`, `CANCELED`, `UNAUTHORIZED`, `INVALID_CREDENTIALS`
- **API envelope**: All responses follow `{ ok: boolean, data: any, meta: object|null, error: object|null }`
- **Helpers**: `apiGet`, `apiPost`, `apiPatch`, `apiPut`, `apiDelete` for typed requests

### 5. Styling System

**CSS Variables** with HSL color space for theming:

```
--background: 0 0% 3.9%       # Dark mode
--foreground: 0 0% 98%
--border: 220 10% 14%
--radius: 14px
```

**Custom semantic colors** (HSL):

| Token | Purpose |
| --- | --- |
| `--success` (150 100% 38%) | Green status |
| `--warning` (45 100% 55%) | Yellow/orange alerts |
| `--info` (210 100% 60%) | Blue info |
| `--destructive` | Red errors |
| `--brand` | Primary brand blue |

**Spacing system** (CSS custom properties exposed as Tailwind tokens):

- `--page-px: 24px`, `--page-py: 24px`
- `--section-gap: 24px`
- `--card-p: 24px`
- `--table-cell-px: 12px`, `--table-cell-py: 10px`
- `--row-h: 60px`

**Tailwind layers**:

| Class | Purpose |
| --- | --- |
| `.page-container` | Max-width wrapper with responsive padding |
| `.page-header` | Title row with actions |
| `.surface-card` | Standard card with border + shadow |
| `.table-base` / `.table-row` / `.table-cell` | Table structure |
| `.glass-panel` | Frosted glass effect |
| `.glow-button` | Button with glow shadow |
| `.animate-in` | Entry animation |

**Dark mode**: Set to `class` strategy, root `<div>` has `dark` class. No light mode toggle.

### 6. Page Layout

```
┌─────────────────────────────────────────────────┐
│ Sidebar (collapsible)  │  Header (sticky)       │
│                        │                        │
│ ┌───────┐              │  ┌─────────────────┐  │
│ │ Logo  │              │  │ Mobile menu btn  │  │
│ └───────┘              │  │ Profile avatar   │  │
│                        │  └─────────────────┘  │
│ Nav items              ├────────────────────────┤
│ (filtered by perm)     │                        │
│                        │  <main> (scrollable)   │
│ • Dashboard            │  ┌─────────────────┐  │
│ • Store Sync           │  │ PageShell       │  │
│ • EOD Monitor          │  │  ┌───────────┐  │  │
│ • Store Directory      │  │  │ Feature   │  │  │
│ • Employee Dir         │  │  │ Story     │  │  │
│ • Backups              │  │  │ Banner    │  │  │
│ • System               │  │  └───────────┘  │  │
│ • Agent Updater        │  │  ┌───────────┐  │  │
│ • Office Agents        │  │  │ Page      │  │  │
│ • Accounts             │  │  │ Header    │  │  │
│ • Roles                │  │  └───────────┘  │  │
│ • After Hours          │  │  ┌───────────┐  │  │
│                        │  │  │ Content   │  │  │
│ ───────────            │  │  └───────────┘  │  │
│ • About This Project   │  └─────────────────┘  │
│                        │                        │
│ [User profile block]   │                        │
└─────────────────────────────────────────────────┘
```

**Sidebar**:
- Collapsible (persisted to `localStorage`)
- Navigation items filtered by user permissions
- Support section for About
- User profile summary at bottom → navigates to `/profile`

**Layout**: `<div class="dark bg-background text-foreground overflow-hidden h-screen flex">` — full-height flex container.

### 7. Timezone Handling

All times are **WIB (Asia/Jakarta, UTC+7)**. Date utilities in `lib/date.js`:

- `formatDate()` — e.g., "17 May 2026"
- `formatTime()` — e.g., "19:30:45"
- `formatDateTime()` — e.g., "17 May 2026, 19:30"
- `getWibToday()` — ISO date string for API queries
- `getWibParts()` — Parsed date components
- `isWithinEodWindowNow()` — Returns true after 19:30 WIB

No external date libraries — `Intl.DateTimeFormat` with `timeZone: 'Asia/Jakarta'` throughout.

### 8. Component Hierarchy

**shadcn/ui primitives** (in `components/ui/`, mostly `.tsx`):
- `button.tsx` — CVA variant-based button (default, secondary, destructive, ghost, outline, link)
- `card.tsx` — Card, CardHeader, CardTitle, CardContent, CardFooter
- `dialog.tsx` — Modal dialog with Radix UI
- `sheet.tsx` — Slide-out panel (mobile sidebar)
- `select.tsx` — Custom styled select with Radix UI
- `table.tsx` — Semantic table with Tailwind styling
- `badge.tsx` — Inline status labels
- `input.tsx` — Styled input
- `skeleton.tsx` — Loading skeleton
- `progress.tsx` — Progress bar
- `separator.tsx` — Visual divider
- `sonner.tsx` — Toast shim

**Legacy UI components** (in `components/ui/`, `.jsx`):
- Legacy versions predate shadcn migration: `Modal.jsx`, `ConfirmDialog.jsx`, `DataTable.jsx`, `ProgressBar.jsx`, `StatCard.jsx`, `PageHeader.jsx`, `StatusBadge.jsx`, `EmptyState.jsx`, `Toolbar.jsx`, `SectionCard.jsx`

**Shared components** (in `components/shared/`, `.tsx`):
- `StatCard.tsx` — Icon-based KPI card (newer version)
- `DataTable.tsx` — Reusable sortable table
- `PageHeader.tsx` — Title + description + actions
- `SearchBar.tsx` — Debounced search with icon
- `StatusBadge.tsx` — Colored dot + label
- `EmptyState.tsx` — Icon + message placeholder

### 9. Feature Story System

Each page is documented with a "feature story" in `data/stories.js` — a design pattern for portfolio context:

```js
{
  id: 'dashboard',
  featureName: 'Dashboard',
  route: '/',
  materialIcon: 'dashboard',
  tagline: 'The daily control room for store operations.',
  problem: '...',
  solution: '...',
  impact: '...',
  metrics: [{ label: '...', value: '...' }],
  techHighlight: '...',    // Optional technical note
}
```

- **FeatureStoryBanner** — Accordion on every page showing Problem / Solution / Impact
- **About page** — Full feature catalog with all 16 stories
- **Banner toggle**: `banner: false` disables per-page banner (e.g., About page itself)

### 10. Demo Account Protection

The app has a **read-only demo sandbox**:

| Layer | Mechanism |
| --- | --- |
| Route guard | `PrivateRoute` requires auth, no special demo path |
| Nav visibility | All nav items visible to demo (read permissions granted) |
| Action visibility | `<Guard>` shows all buttons to demo users |
| Action blocking | Page-level `isDemoUser` checks block writes with toast notification |
| API enforcement | Backend returns 403 for write endpoints under demo account |

Demo login is at `/login` with an auto-typing credential animation (typewriter effect for username/password).

### 11. Performance Patterns

- **Lazy loading**: All pages via `React.lazy()` + `Suspense`
- **Auto-refresh**: Polling intervals per page (EOD: 30s, Sync: 10s, Dashboard: 60s, Agent: 30s, Live: 10s)
- **Conditional refresh**: Dashboard only polls during EOD window (after 19:30 WIB)
- **Debounced search**: Store/employee searches debounce before API call
- **useCallback/useMemo**: Heavy computations wrapped where applicable

### 12. Build & Dev

| Script | Command |
| --- | --- |
| Dev | `vite` (HMR on local network) |
| Build | `vite build` |
| Preview | `vite preview` |
| Test | `vitest run` |
| Typecheck | `tsc --noEmit` |
| Lint | `eslint .` |
| Format | `prettier --write "src/**/*.{js,jsx,css}"` |

**Proxy**: Vite dev server proxies `/api/*` → `http://localhost:3000` (avoids CORS in dev).

**Allowed hosts**: `dash.lmntea.fun` accepted by dev server.

### 13. Page-by-Page Details

| Page | Route | Key Features | Auto-refresh | Permission |
| --- | --- | --- | --- | --- |
| Dashboard | `/` | KPI stats, alerts table, quick-nav cards | 60s (EOD window) | `DASHBOARD_VIEW` |
| Login | `/login` | Demo auto-type, manual login, remember-me | — | Public |
| Logout | `/logout` | Confirmation dialog, API + local cleanup | — | Auth |
| Profile | `/profile` | User info, password change, admin link | — | Auth |
| Store Sync | `/sync` | Branch health, freshness grid, history | 10s | `SYNC_VIEW` |
| EOD Monitor | `/eod` | Status grid, filters, retry, export | 30s | `EOD_VIEW` |
| Store Directory | `/stores` | Search, branch filter, XLSX export | — | `STORES_VIEW` |
| Employee Directory | `/identity` | NIK/name search, role filter, CSV export | — | `EMPLOYEES_VIEW` |
| Backups | `/backups` | Health card, snapshots, run/delete/restore | — | `BACKUPS_VIEW` |
| System Health | `/system` | Service cards, log viewer, healthcheck | — | `SYSTEM_VIEW` |
| Agent Updater | `/agent-updater` | Node table, version upload, status | 30s | `AGENT_UPDATE` |
| Office Agent Monitor | `/office-agents` | Machine inventory, heartbeat, labels | — | `AGENT_UPDATE` |
| Accounts | `/admin/users` | Create/edit/delete users, scope, roles | — | `ACCOUNTS_VIEW` |
| Roles | `/admin/roles` | Permissions editor, create custom roles | — | `ROLES_VIEW` |
| After Hours | `/admin/afterhours` | Violations, notifications, staged warnings | — | `AFTERHOURS_VIEW` |
| Live Sync | `/live` | Public wallboard, EOD + sync signals | 10s | Public |
| About | `/about` | Feature catalog, demo disclosure | — | Auth |

### 14. Key Design Patterns

- **Dual data-fetch pattern**: Pages use either `useAuth().api` directly or imported `apiGet()/apiPost()` — both resolve through the same Axios client
- **PageShell wrapper**: Every page wraps content in `<PageShell>` which provides `page-container` class (max-width + padding + spacing)
- **FeatureStoryBanner**: Every operational page starts with an expandable accordion explaining the feature's problem/solution/impact
- **Guard component**: Conditionally renders children based on permission — used for action buttons (not route-level, which uses PrivateRoute)
- **EmptyState**: Shown when data is null/empty after loading completes — consistent icon + message + optional action
