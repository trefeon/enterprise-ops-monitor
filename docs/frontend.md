# Frontend Architecture

## Overview

React 19 SPA built with Vite 7, React Router 7, TailwindCSS 3, and shadcn/ui components. ES Modules, JSX. Dark mode enforced.

## Tech Stack

| Category  | Library                                                 |
| --------- | ------------------------------------------------------- |
| Framework | React 19                                                |
| Bundler   | Vite 7                                                  |
| Routing   | React Router 7                                          |
| Styling   | TailwindCSS 3 + shadcn/ui                               |
| Icons     | lucide-react                                            |
| HTTP      | Axios                                                   |
| Auth      | AuthContext (JWT in localStorage or sessionStorage)     |
| Testing   | Vitest 4 + @testing-library/react                       |
| Typecheck | TypeScript 5.9 (JSDoc in JS files, `.ts` in some pages) |

## Routing

Defined in `apps/web/src/App.jsx`. Uses `React.lazy` + `Suspense` for code splitting.

```
<AuthProvider>
  <BrowserRouter>
    <Routes>
      /login                        → Login (public)
      /live, /live.html             → LiveSync (public)

      <PrivateRoute>                ← redirects to /login if not authed
        <AppShell>                  ← Layout + Sidebar + Header + Outlet

          /                         → Dashboard (DASHBOARD_VIEW)
          /eod                      → EODMonitor (EOD_VIEW)
          /stores                   → StoreManagement (STORES_VIEW)
          /sync                     → StoreSync (SYNC_VIEW)
          /identity                 → IdentityCheck (EMPLOYEES_VIEW)
          /backups                  → Backups (BACKUPS_VIEW)
          /system                   → SystemHealth (SYSTEM_VIEW)
          /admin/users              → UsersAdmin (ACCOUNTS_VIEW)
          /admin/roles              → RolesAdmin (ROLES_VIEW)
          /admin/afterhours         → AfterHours (AFTERHOURS_VIEW)
          /agent-updater            → AgentUpdater (AGENT_UPDATE)
          /office-agents            → OfficeAgents (AGENT_UPDATE)
          /about                    → About (public within auth)
          /profile                  → Profile
          /logout                   → Logout

        </AppShell>
      </PrivateRoute>
      * → redirect to /
    </Routes>
  </BrowserRouter>
</AuthProvider>
```

## Component Tree

```
<App>
  <ErrorBoundary>
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <PrivateRoute>
              <AppShell>
                <Sidebar />         ← permission-gated nav links
                <Header />          ← user menu, mobile hamburger
                <main>
                  <Outlet />        ← lazy-loaded page component
                </main>
              </AppShell>
            </PrivateRoute>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  </ErrorBoundary>
</App>
```

## Auth Flow

1. User logs in via `POST /api/auth/login` — receives JWT + user info + permissions
2. Token stored in `localStorage` when "remember me" is enabled, otherwise `sessionStorage`
3. `AuthContext` parses token, sets `user` object with `effectivePerms` and `branchScope`
4. `PrivateRoute` checks auth state before rendering protected routes
5. API requests include `Authorization: Bearer <token>` header via Axios interceptor
6. On 401 response, interceptor clears auth state and redirects to `/login`

## RBAC Patterns (Frontend)

Three levels of permission enforcement:

| Level     | Mechanism                                                    | File                      |
| --------- | ------------------------------------------------------------ | ------------------------- |
| Route     | `<PrivateRoute requiredPerm={Permissions.SYNC_VIEW}>`        | `PrivateRoute.jsx`        |
| Component | `<Guard permission="EOD_SYNC"><button>Sync</button></Guard>` | Shared guard component    |
| Function  | `hasPermission(user, "EOD_SYNC")` — returns boolean          | `lib/auth/permissions.js` |

Permissions are computed server-side and returned as `user.effectivePerms`. The frontend mirrors the permission constants in `lib/auth/permissions.js`.

## API Client

Located in `apps/web/src/lib/api/`. Axios-based with:

- Base URL from `VITE_API_URL` env var
- Request interceptor: attaches JWT token
- Response interceptor: unwraps `{ ok, data, meta, error }` envelope, handles 401
- Helper functions: `apiGet`, `apiPost`, `apiPut`, `apiDelete`

## Key Conventions

- **File naming**: Page components in `pages/PageName/index.jsx` (`.jsx` or `.tsx`) with co-located hooks, types
- **Shared components**: `components/shared/` — `DataTable`, `StatCard`, `StatusBadge`, `SearchBar`, `PageHeader`, `EmptyState`, `UserAccessModal`
- **UI primitives**: `components/ui/` — shadcn/ui generated components
- **Auth**: `context/AuthContext.jsx` + `context/AuthProvider.jsx`
- **Styles**: `index.css` for Tailwind directives, design tokens, custom utilities, and app-level overrides
- **Dark mode**: `dark` class on root div; forced by default
- **Code splitting**: All 18 pages are `React.lazy` loaded

## Dashboard Page

Has co-located structure as example:

```
pages/Dashboard/
  index.tsx       ← page component
  types.ts        ← TypeScript interfaces
  hooks/
    useDashboard.ts ← data fetching hook
```
