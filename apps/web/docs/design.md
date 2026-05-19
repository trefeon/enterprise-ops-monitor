# Web App Design And Architecture

**Status:** Current implementation guide
**Visual system:** [../../../DESIGN.md](../../../DESIGN.md)
**Verified against:** `src/App.jsx`, `src/index.css`, `tailwind.config.js`, `index.html`, shared UI primitives, app shell, and route pages

This document explains how the React/Vite frontend is structured and how the design system is applied in code. It intentionally avoids duplicating the full token spec; use the root `DESIGN.md` for exact colors, typography, spacing, radius, motion, and component styling rules.

## Stack

| Layer         | Current implementation                                  |
| ------------- | ------------------------------------------------------- |
| Framework     | React 19                                                |
| Build         | Vite 7                                                  |
| Language      | Hybrid JSX / TSX                                        |
| Routing       | React Router 7                                          |
| Styling       | Tailwind CSS 3.4 + CSS custom properties                |
| UI primitives | shadcn/Base UI primitives plus local wrappers           |
| Icons         | Lucide React                                            |
| Animation     | Framer Motion route/page transitions plus CSS utilities |
| HTTP          | Axios 1.13 through `lib/api/client.js`                  |
| Tests         | Vitest 4, jsdom, Testing Library                        |
| Lint / format | ESLint 9, Prettier 3                                    |
| Auth          | JWT bearer token injected by Axios interceptor          |

## Source Map

```text
apps/web/
├── index.html                  # Google Font links, root element
├── tailwind.config.js          # Tailwind v3 token mappings
├── package.json                # React/Vite/Tailwind package versions
└── src/
    ├── App.jsx                 # Router, providers, lazy routes
    ├── main.jsx                # React entry point
    ├── index.css               # Global tokens, utilities, base styles
    ├── context/
    │   ├── AuthContext.jsx
    │   └── AuthProvider.jsx
    ├── components/
    │   ├── Layout.jsx          # Sidebar, header, sheet, route outlet
    │   ├── Sidebar.jsx         # Permission-filtered nav
    │   ├── Header.jsx          # Sticky mobile-aware top bar
    │   ├── PrivateRoute.jsx    # Auth and route permission guard
    │   ├── FeatureStoryBanner.jsx
    │   ├── PageTransition.jsx
    │   ├── PageLoader.jsx
    │   ├── shared/             # Preferred TSX shared components
    │   └── ui/                 # shadcn/Base UI and legacy wrappers
    ├── data/stories.js         # Feature narrative content
    ├── lib/
    │   ├── api/client.js       # apiGet/apiPost/apiPatch/apiPut/apiDelete
    │   ├── auth/permissions.js # Permission constants and helpers
    │   ├── auth/roleMap.js
    │   ├── auth/roles.js
    │   ├── date.js             # WIB date/time helpers
    │   └── utils.ts            # cn() class merger
    └── pages/                  # Lazy-loaded route modules
```

## Provider And Routing Model

The root app uses a layered provider and guard tree:

```jsx
<ErrorBoundary>
  <AuthProvider>
    <ToastProvider>
      <BrowserRouter>
        <Suspense>
          <Routes>
            {/* public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/live" element={<LiveSync />} />
            <Route path="/live.html" element={<LiveSync />} />

            {/* private app shell */}
            <Route element={<PrivateRoute />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<PrivateRoute requiredPerm={...}><Dashboard /></PrivateRoute>} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  </AuthProvider>
</ErrorBoundary>
```

Important details:

- Pages are imported with `React.lazy()`.
- `PageTransition` wraps public routes and the private `<Outlet>`.
- `/eod-area` redirects to `/eod`.
- `/live` and `/live.html` are public wallboard routes.
- Private pages are wrapped by `Layout` through `AppShell`.
- Route permissions use `PrivateRoute requiredPerm={Permissions.X}`.

## Route Inventory

| Route                 | Page module             | Access            |
| --------------------- | ----------------------- | ----------------- |
| `/login`              | `pages/Login`           | Public            |
| `/live`, `/live.html` | `pages/LiveSync`        | Public            |
| `/`                   | `pages/Dashboard`       | `DASHBOARD_VIEW`  |
| `/eod`                | `pages/EODMonitor`      | `EOD_VIEW`        |
| `/stores`             | `pages/StoreManagement` | `STORES_VIEW`     |
| `/sync`               | `pages/StoreSync`       | `SYNC_VIEW`       |
| `/identity`           | `pages/IdentityCheck`   | `EMPLOYEES_VIEW`  |
| `/backups`            | `pages/Backups`         | `BACKUPS_VIEW`    |
| `/system`             | `pages/SystemHealth`    | `SYSTEM_VIEW`     |
| `/admin/users`        | `pages/UsersAdmin`      | `ACCOUNTS_VIEW`   |
| `/admin/roles`        | `pages/RolesAdmin`      | `ROLES_VIEW`      |
| `/admin/afterhours`   | `pages/AfterHours`      | `AFTERHOURS_VIEW` |
| `/agent-updater`      | `pages/AgentUpdater`    | `AGENT_UPDATE`    |
| `/office-agents`      | `pages/office-agents`   | `AGENT_UPDATE`    |
| `/about`              | `pages/About`           | Authenticated     |
| `/profile`            | `pages/Profile`         | Authenticated     |
| `/logout`             | `pages/Logout`          | Authenticated     |

After Hours owns two tab views in one route: Daily Monitor and a lazy-loaded Monthly Report module. Monthly Report is nested tab content and must not render its own `PageShell` or `FeatureStoryBanner`.

## App Shell

Source files:

- `components/Layout.jsx`
- `components/Sidebar.jsx`
- `components/Header.jsx`
- `components/ui/sheet.tsx`

Shell behavior:

- Root shell is dark-only and full height.
- Desktop sidebar is fixed at `w-60` (240px).
- Collapsed desktop sidebar is `md:w-20` (80px), persisted in `localStorage`.
- Mobile sidebar uses a left `Sheet` drawer at `w-60`.
- Header is sticky, `h-12`, with a mobile menu trigger and mobile profile shortcut.
- Main content is the only scrollable pane.

Navigation behavior:

- Sidebar links are filtered by `hasPermission(user, permission)`.
- Active app links use green `bg-primary/10 text-primary`.
- Portfolio/About link uses info-blue status styling.
- Icons are Lucide components stored in the nav item config.

## Page Template

Private routed pages should follow this shape:

```jsx
<PageShell>
  <FeatureStoryBanner story={getFeatureStory('feature-id')} />
  <PageHeader title="..." subtitle="..." />
  {/* optional StatCard grid */}
  {/* optional Toolbar */}
  {/* primary table, grid, or form content */}
  {/* dialogs and drawers */}
</PageShell>
```

Rules:

- Use exactly one top-level feature banner per routed page.
- Nested subviews and tabs do not get their own page shell or feature banner.
- `PageHeader` comes after the feature banner.
- Keep KPI rows before dense tables when they orient the user.
- Use `Toolbar` for search/filter/action rows.
- Keep table and form controls responsive by wrapping rows instead of compressing all controls into one line.

## Styling Implementation

Global tokens and utilities are in `src/index.css`.

Key utility classes:

| Class                                                         | Owner                | Purpose                                  |
| ------------------------------------------------------------- | -------------------- | ---------------------------------------- |
| `.page-container`                                             | `PageShell` only     | Max width, page padding, vertical rhythm |
| `.page-header`                                                | page header wrappers | Header row and bottom border             |
| `.page-title`                                                 | page titles          | Display title style                      |
| `.page-subtitle`                                              | page subtitles       | Muted description style                  |
| `.page-meta`                                                  | metadata             | Mono small text                          |
| `.section-title`                                              | section headings     | Display section heading                  |
| `.surface-card`                                               | card-like wrappers   | Standard surface                         |
| `.surface-card-compact`                                       | compact surfaces     | Dense panels and filters                 |
| `.form-label`                                                 | labels               | Uppercase operational labels             |
| `.table-base`, `.table-head-row`, `.table-row`, `.table-cell` | legacy tables        | Shared table rhythm                      |
| `.login-*`                                                    | login page           | Login-specific responsive styling        |
| `.live-*`                                                     | LiveSync             | Live wallboard-specific sizing           |
| `.portfolio-*`                                                | About/story pages    | Portfolio narrative styling              |

Do not add page-specific global utilities unless the style is reused and cannot be expressed cleanly with existing components/tokens.

## Component Ownership

### Preferred Shared Components

Use these for new or migrated work:

- `components/shared/StatCard.tsx`
- `components/shared/StatusBadge.tsx`
- `components/shared/SearchBar.tsx`
- `components/shared/DatePicker.tsx`
- `components/shared/DataTable.tsx`
- `components/shared/PageHeader.tsx`
- `components/shared/EmptyState.tsx`

### UI Primitives And Wrappers

Use these for primitives and existing JSX pages:

- `components/ui/button.tsx`
- `components/ui/card.tsx`
- `components/ui/input.tsx`
- `components/ui/select.tsx`
- `components/ui/table.tsx`
- `components/ui/dialog.tsx`
- `components/ui/sheet.tsx`
- `components/ui/badge.tsx`
- `components/ui/skeleton.tsx`
- `components/ui/progress.tsx`
- `components/ui/Toolbar.jsx`
- `components/ui/PageShell.jsx`
- `components/ui/PageHeader.jsx`
- `components/ui/Toast.jsx` and `ToastContext.jsx`
- `components/ui/Modal.jsx`, `ConfirmDialog.jsx`, `DataTable.jsx`, `ProgressBar.jsx`, `SectionCard.jsx`

Legacy JSX components remain because the app is hybrid JSX/TSX. Prefer TSX shared components for new shared UI, but keep edits compatible with existing JSX pages.

## Icons

The rendered icon system is Lucide React.

Historical note: `data/stories.js` still uses a property named `materialIcon`. That property is only a compatibility key; `FeatureStoryBanner.jsx` maps those string values to Lucide components. Do not add Material Symbols font imports, icon font spans, or new string-icon APIs.

## Authentication And Authorization

Auth state lives in `AuthProvider` and is exposed through `useAuth()`.

Storage:

- Persistent login uses `localStorage`.
- Session-only login uses `sessionStorage`.
- Token and user keys are mirrored according to the selected login mode.

API auth:

- `lib/api/client.js` injects `Authorization: Bearer <token>`.
- Responses are unwrapped to the API envelope shape.
- Errors are normalized to `{ ok: false, code, message, original }`.

Permission checks:

| Layer             | Mechanism                                       |
| ----------------- | ----------------------------------------------- |
| Route access      | `<PrivateRoute requiredPerm={Permissions.X}>`   |
| Nav visibility    | `Sidebar.jsx` filters with `hasPermission()`    |
| Action visibility | `<Guard permission={Permissions.X}>`            |
| Write blocking    | Page-level `isDemoUser` guards plus backend 403 |

Do not compare `user.role` directly for access decisions. Use `hasPermission(user, permission)`.

## API Pattern

Use these helpers from `lib/api/client.js`:

```js
apiGet(url, config);
apiPost(url, data, config);
apiPatch(url, data, config);
apiPut(url, data, config);
apiDelete(url, config);
```

Do not import Axios directly in pages. The client wrapper handles base URL, token injection, envelope unwrapping, timeout handling, and normalized errors.

API responses follow:

```js
{
  ok: boolean,
  data: unknown,
  meta: object | null,
  error: object | null
}
```

## Toasts

`ToastProvider` provides:

- `push({ variant, title, message, duration })`
- `dismiss(id)`
- `showToast(message, variant)` compatibility helper

Variants are `success`, `warning`, `error`, `info`, and `neutral`. Toasts use Lucide icons and an elevated popover surface.

## Feature Story System

Source:

- `data/stories.js`
- `components/FeatureStoryBanner.jsx`
- `pages/About/index.jsx`

Each story can include:

```js
{
  id: 'dashboard',
  featureName: 'Dashboard',
  route: '/',
  materialIcon: 'dashboard',
  tagline: '...',
  problem: '...',
  solution: '...',
  impact: '...',
  metrics: [{ label: '...', value: '...' }],
  techHighlight: '...',
  banner: true
}
```

`banner: false` disables banner rendering for a story. The About page renders the full story catalog.

## Time And Dates

All user-facing operational dates and times are WIB (`Asia/Jakarta`, UTC+7).

Use helpers from `lib/date.js`, including:

- `formatDate()`
- `formatTime()`
- `formatDateTime()`
- `getWibToday()`
- `getWibParts()`
- `isWithinEodWindowNow()`

Do not use raw `toLocaleString()` in pages because it follows the browser locale.

## Data Fetching

Most pages use local `useState` plus `useEffect`/`useCallback`.

Current patterns:

- Dashboard auto-refreshes during the EOD window.
- Store Sync and LiveSync use interval polling.
- EOD Monitor supports auto-refresh controls.
- Search pages debounce input in page logic.
- Long-running requests should ignore stale responses or clean up timers on unmount.

There is no global server-state manager in this app.

## Demo User Pattern

Demo users can see operational actions but cannot mutate data.

Pattern:

```js
const isDemoUser = user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo';

if (isDemoUser) {
  push({ variant: 'warning', title: 'Demo Account', message: 'This action is not available.' });
  return;
}
```

The backend also enforces write protection.

## Design Checks For UI Work

Before finishing visual work, check for stale design patterns:

```bash
rg "material-symbols|Material Symbols" apps/web
rg "rounded-4xl|rounded-5xl|shadow-2xl|bg-white|text-white|bg-black|text-black" apps/web/src
```

Expected result:

- No Material Symbols imports or font spans.
- No oversized operational radii.
- No raw black/white primary surfaces.
- Any remaining shadows should be intentional overlay shadows.

## Verification Commands

Use pnpm only:

```bash
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web build
```

For broader repo confidence:

```bash
pnpm check:all
```

For frontend visual changes, also run the app and inspect affected routes in a browser at desktop and mobile widths.
