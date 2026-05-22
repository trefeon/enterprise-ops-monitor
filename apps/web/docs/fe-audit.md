# Frontend Audit Report — Enterprise Ops Monitor

> Generated: Phase 0 of frontend rework guide
> Date: 2026-05-22
> Scope: `apps/web/src/`

---

## 1. Project Structure Overview

```
src/
├── App.jsx                  # Root: routes, lazy-load, providers
├── main.jsx                 # Entry point
├── index.css                # Global styles + design tokens + utilities
├── components/
│   ├── AppShell.jsx         # Re-export of Layout.jsx
│   ├── Layout.jsx           # Root layout: Sidebar + Header + Outlet
│   ├── Sidebar.jsx          # Collapsible nav, user profile, mobile sheet
│   ├── Header.jsx           # Top bar: mobile menu toggle, org name, avatar
│   ├── FeatureStoryBanner.jsx  # Portfolio story expandable banner
│   ├── PageTransition.jsx   # Framer-motion page enter/exit
│   ├── PageLoader.jsx       # Global lazy-load skeleton
│   ├── PrivateRoute.jsx     # Auth gate + permission check
│   ├── ErrorBoundary.jsx    # React error boundary
│   ├── UserAccessModal.jsx  # User management modal (legacy)
│   ├── auth/
│   │   └── Guard.jsx        # Permission-based conditional render
│   ├── data/
│   │   └── columns/         # Column defs for legacy DataTable
│   ├── shared/              # Reusable TSX components (newer)
│   │   ├── DataTable.tsx    # Main table component
│   │   ├── StatCard.tsx     # KPI metric card
│   │   ├── EmptyState.tsx   # Empty/no-data state
│   │   ├── SectionCard.tsx  # Card with header section
│   │   ├── PageHeader.tsx   # Page title + description + actions
│   │   ├── PageShell.tsx    # Page container wrapper
│   │   ├── Modal.tsx        # Dialog wrapper
│   │   ├── ConfirmDialog.tsx# Confirm/delete dialog
│   │   ├── SearchBar.tsx    # Debounced search input
│   │   ├── StatusBadge.tsx  # Status pill with dot
│   │   ├── Toolbar.tsx      # Filter/search bar
│   │   ├── ProgressBar.tsx  # Progress bar wrapper
│   │   ├── DatePicker.tsx   # Date input (TBD)
│   │   ├── IconButton.tsx   # Icon-only button
│   │   └── Card.jsx         # Legacy? (to check)
│   └── ui/                  # shadcn primitives (installed)
│       ├── badge.tsx, button.tsx, card.tsx, dialog.tsx
│       ├── input.tsx, select.tsx, separator.tsx, sheet.tsx
│       ├── skeleton.tsx, progress.tsx, table.tsx, sonner.tsx
│       └── Toast.jsx + ToastContext.jsx  # Legacy toast system
├── pages/                   # 17 page modules
│   ├── Dashboard/ (TSX)     # Main dashboard
│   ├── AfterHours/ (JSX)
│   ├── AfterHoursReport/ (JSX)
│   ├── AgentUpdater/ (JSX)
│   ├── EODMonitor/ (JSX, 1063 lines — biggest)
│   ├── Backups/ (JSX, 615 lines)
│   ├── StoreSync/ (JSX)
│   ├── StoreManagement/ (JSX)
│   ├── IdentityCheck/ (JSX)
│   ├── SystemHealth/ (JSX)
│   ├── UsersAdmin/ (JSX)
│   ├── RolesAdmin/ (JSX)
│   ├── Profile/ (JSX)
│   ├── Login/ (JSX)
│   ├── Logout/ (JSX)
│   ├── LiveSync/ (JSX)
│   ├── About/ (JSX)
│   └── office-agents/ (TSX)  # Newer, better structured
└── lib/
    ├── api/client.js         # Axios wrapper
    ├── api/types.js          # API response types
    ├── auth/permissions.js   # Permission constants
    ├── auth/roleMap.js       # Role hierarchy
    ├── auth/roles.js         # Role definitions
    ├── dashboard/noData.js   # No-data helpers
    ├── date.js               # WIB date helpers
    └── utils.ts              # cn() helper
```

---

## 2. All Components Inventory

### shadcn Primitives (installed, ready)
| Component | File | Status |
|---|---|---|
| badge | `ui/badge.tsx` | ✅ Installed |
| button | `ui/button.tsx` | ✅ Installed |
| card | `ui/card.tsx` | ✅ Installed |
| dialog | `ui/dialog.tsx` | ✅ Installed |
| input | `ui/input.tsx` | ✅ Installed |
| select | `ui/select.tsx` | ✅ Installed |
| separator | `ui/separator.tsx` | ✅ Installed |
| sheet | `ui/sheet.tsx` | ✅ Installed |
| skeleton | `ui/skeleton.tsx` | ✅ Installed |
| progress | `ui/progress.tsx` | ✅ Installed |
| table | `ui/table.tsx` | ✅ Installed |
| sonner | `ui/sonner.tsx` | ✅ (but unused) |

### Shared Components (custom)
| Component | File | Type | Reusable | States |
|---|---|---|---|---|
| DataTable | `shared/DataTable.tsx` | TSX | ✅ | loading, empty, sort, paginate |
| StatCard | `shared/StatCard.tsx` | TSX | ✅ | loading, trend, status |
| EmptyState | `shared/EmptyState.tsx` | TSX | ✅ | icon, action, compact |
| SectionCard | `shared/SectionCard.tsx` | TSX | ✅ | title, subtitle, right |
| PageHeader | `shared/PageHeader.tsx` | TSX | ✅ | breadcrumbs, actions, meta |
| PageShell | `shared/PageShell.tsx` | TSX | ✅ | container |
| Modal | `shared/Modal.tsx` | TSX | ✅ | — |
| ConfirmDialog | `shared/ConfirmDialog.tsx` | TSX | ✅ | loading, confirm text |
| SearchBar | `shared/SearchBar.tsx` | TSX | ✅ | sizes |
| StatusBadge | `shared/StatusBadge.tsx` | TSX | ✅ | variants, sizes, dot, live |
| Toolbar | `shared/Toolbar.tsx` | TSX | ✅ | left, right |
| ProgressBar | `shared/ProgressBar.tsx` | TSX | ✅ | colored |
| DatePicker | `shared/DatePicker.tsx` | TSX | ❓ | (need to inspect) |
| IconButton | `shared/IconButton.tsx` | TSX | ✅ | intents, disabled |
| FeatureStoryBanner | `FeatureStoryBanner.jsx` | JSX | ❌ Page-specific | expanded/collapsed |
| PageTransition | `PageTransition.jsx` | JSX | ✅ | — |
| PageLoader | `PageLoader.jsx` | JSX | ✅ | — |
| Toast | `ui/Toast.jsx` | JSX | ✅ | variants, auto-dismiss |

### Legacy Components (JSX, need migration)
| Component | File | Issues |
|---|---|---|
| Sidebar | `Sidebar.jsx` | JSX, should be TSX |
| Header | `Header.jsx` | JSX, should be TSX |
| Layout | `Layout.jsx` | JSX, should be TSX |
| Guard | `auth/Guard.jsx` | JSX, should be TSX |
| UserAccessModal | `UserAccessModal.jsx` | 400 lines, no TS, no shadcn dialog, manual modal |
| PrivateRoute | `PrivateRoute.jsx` | JSX, should be TSX |
| ErrorBoundary | `ErrorBoundary.jsx` | JSX, should be TSX |
| Toast | `ui/Toast.jsx` | Custom toast, sonner exists but unused |

---

## 3. Duplication & Technical Debt

### Duplicated Logic
- **Toast system**: Custom `Toast.jsx` + `ToastContext.jsx` exists, but `sonner.tsx` (shadcn) is installed and unused
- **Sidebar initials logic**: `getInitials()` duplicated in both `Sidebar.jsx` and `Header.jsx`
- **Column definitions**: 3 separate column files (`backupColumns.jsx`, `eodMonitorColumns.jsx`, `storeColumns.jsx`) instead of per-page inline in each page
- **StatCard direct usage**: Dashboard page uses both `StatCard` and raw `<Card>` for non-KPI sections — inconsistent
- **Page header markup**: Backups page uses raw `<header>` + `<h1>` instead of `<PageHeader>` component

### Hardcoded Values & Magic Numbers
- `index.css`: Hardcoded `"data:image/svg+xml,..."` grid pattern in body background
- `index.css`: Custom scrollbar widths (6px), modal max-heights (65vh, 70vh)
- `Sidebar.jsx`: Hardcoded `"Ops Hub"` brand name, `14px` logo area height
- Various pages: Inline padding values (`p-4`, `p-6`, `py-8`) instead of design tokens
- Backups page: `"Daily 00:05 WIB"` default schedule fallback string
- EODMonitor: 1063 lines — needs decomposition into sub-components

### Inline Styles
- None found in shadcn components (good)
- `index.css`: Login shadow values (`box-shadow: 0 24px 80px ...`) in CSS utility classes (acceptable)

---

## 4. Current Dependencies

| Package | Type | Purpose |
|---|---|---|
| react 19 | UI | Framework |
| react-dom 19 | UI | DOM renderer |
| react-router-dom 7 | Routing | Client-side routing |
| vite 7 | Build | Bundler + dev server |
| tailwindcss 3 | Styling | Utility-first CSS |
| @base-ui/react | UI | Radix-style primitives |
| class-variance-authority | UI | Component variants |
| clsx + tailwind-merge | Utility | `cn()` helper |
| framer-motion 12 | Animation | Page transitions + motion |
| lucide-react | Icons | Icon set |
| next-themes | Theme | Dark mode (forced) |
| sonner | Toast | shadcn toast (unused) |
| axios | HTTP | API client |
| tw-animate-css | Animation | Tailwind animation utilities |
| **typescript 5** | **Tooling** | Type checking |

### Dev Dependencies
| Package | Purpose |
|---|---|
| @eslint/js + eslint 9 | Linting |
| prettier | Formatting |
| @vitejs/plugin-react | Vite React plugin |
| @testing-library/react + jest-dom | Testing |
| vitest 4 | Test runner |
| jsdom | Test DOM |
| postcss + autoprefixer | CSS processing |
| typescript 5 | Type checking |
| jscodeshift | Code transforms |

---

## 5. Pages — Size & Priority Assessment

| Page | File | Lines | Type | State Mgmt | UI Quality | Priority |
|---|---|---|---|---|---|---|
| **EODMonitor** | `index.jsx` | 1063 | JSX | useState+useEffect | ⭐ Low | **#1** |
| **Backups** | `index.jsx` | 615 | JSX | useState+useEffect | ⭐⭐ | **#2** |
| **Dashboard** | `index.tsx` | 598 | TSX | useDashboard hook | ⭐⭐⭐⭐ | **#3** |
| **UsersAdmin** | `index.jsx` | ~500+ | JSX | useState+useEffect | ⭐⭐ | **#4** |
| **StoreSync** | `index.jsx` | ~500+ | JSX | useState+useEffect | ⭐⭐ | **#5** |
| **EODMonitor** sub-components | — | — | — | — | — | — |
| **StoreManagement** | `index.jsx` | ~400 | JSX | useState+useEffect | ⭐⭐ | **#6** |
| **AfterHours** | `index.jsx` | ~300 | JSX | useState+useEffect | ⭐⭐ | **#7** |
| **SystemHealth** | `index.jsx` | ~300 | JSX | useState+useEffect | ⭐⭐ | **#8** |
| **RolesAdmin** | `index.jsx` | ~300 | JSX | useState+useEffect | ⭐⭐ | **#9** |
| **IdentityCheck** | `index.jsx` | ~250 | JSX | useState+useEffect | ⭐⭐ | #10 |
| **office-agents** | `index.tsx` | 206 | TSX | Custom hook | ⭐⭐⭐⭐ | #11 |
| **AfterHoursReport** | `index.jsx` | ~200 | JSX | useState+useEffect | ⭐⭐ | #12 |
| **AgentUpdater** | `index.jsx` | ~200 | JSX | useState+useEffect | ⭐⭐ | #13 |
| **Login** | `index.jsx` | ~200 | JSX | useState+useEffect | ⭐⭐⭐ | #14 |
| **Profile** | `index.jsx` | ~150 | JSX | useState+useEffect | ⭐⭐ | #15 |
| **LiveSync** | `index.jsx` | ~150 | JSX | useState+useEffect | ⭐⭐ | #16 |
| **About** | `index.jsx` | ~150 | JSX | Static | ⭐⭐⭐ | #17 |
| **Logout** | `index.jsx` | ~30 | JSX | Minimal | ⭐⭐⭐ | #18 |

### Identified Worst Pages (UI/UX)
1. **EODMonitor** (1063 lines) — massive monolith, needs decomposition
2. **Backups** (615 lines) — own `<header>` instead of PageHeader, manual modal
3. **UsersAdmin** — raw `<table>` markup, no DataTable
4. **StoreSync** — redundant markup patterns

---

## 6. shadcn Usage Analysis

### Already using shadcn:
- `Card`, `Button`, `Badge`, `Input`, `Select`, `Dialog`, `Sheet`
- `Table`, `Skeleton`, `Progress`, `Separator`
- All via `@/components/ui/*` imports

### Using shadcn incorrectly or partially:
- **Sonner**: installed but unused — custom `Toast.jsx` used instead
- **Sidebar**: uses `<Sheet>` for mobile menu (good) but is JSX not TSX
- **Modal**: wraps shadcn `<Dialog>` (good pattern)

### NOT using shadcn (using custom/raw):
- **Toast notification**: Custom `Toast.jsx` + `ToastContext.jsx` context
- **UserAccessModal**: Manual modal overlay (`fixed inset-0`) — should use shadcn `<Dialog>`

---

## 7. Styling Audit

### index.css Design Tokens
- Custom CSS variables defined in `:root`: colors, typography, spacing, radius, transitions
- Dark mode only (no light mode needed — forced dark)
- `prefers-reduced-motion` respected ✅
- Semantic color tokens used: `--text-primary`, `--bg-surface`, `--border-default`, etc.

### Issues in index.css
- ~377 lines of custom CSS — some should be Tailwind classes
- Custom scrollbar styles (global, not scoped)
- Utility classes (`.page-container`, `.page-header`) — could be components
- Glow/glass/logo animation utilities — only used in Login page
- Portfolio storytelling utilities mixed with app CSS
- Login-specific utilities mixed in global CSS

---

## 8. Data Tables, Cards, Forms, Modals, Navbars, Sidebars

### Data Tables
- **DataTable.tsx**: Good reusable component with TanStack-like API
  - Sorting ✅, pagination ✅, loading skeleton ✅, empty state ✅
  - Mobile card view ✅
  - No row selection, no CSV export, no server-side mode
  - Not using TanStack Table library (custom implementation)

### Cards
- **StatCard.tsx**: Excellent — sizes, variants, trend indicators, loading state
- **SectionCard.tsx**: Good — title, subtitle, right actions
- **EmptyState.tsx**: Good — icon, action, compact/regular
- Raw `<Card>` usage in many pages (Dashboard, Backups) instead of composed components

### Forms
- No reusable form components built yet
- Forms scattered across pages using raw shadcn `<Input>`, `<Select>`
- No `react-hook-form` integration
- No `FormField` wrapper component
- Login form: raw `<input>` with custom CSS class `.login-input`

### Modals
- **Modal.tsx**: Wraps shadcn `<Dialog>` ✅
- **ConfirmDialog.tsx**: Confirm/delete dialog with type-to-confirm ✅
- **UserAccessModal.jsx**: Custom hand-rolled modal ❌ (400 lines, no shadcn)

### Navigation
- **Sidebar.jsx**: Collapsible, permission-filtered, mobile sheet, user profile ✅
- **Header.jsx**: Sticky, mobile menu button, user avatar ✅
- Both need TSX migration
- No breadcrumb component (PageHeader has breadcrumbs, but only a few pages use PageHeader)

---

## 9. Accessibility Issues

- Custom `Toast.jsx`: No `role="alert"` or `aria-live` region
- `UserAccessModal.jsx`: Manual focus management missing, no `aria-modal`
- `Input[type=date]`.date-input-no-indicator: Hides native picker without accessible alternative
- `Sidebar.jsx`: `aria-label` on collapse toggle ✅
- shadcn components have built-in ARIA ✅

---

## 10. Data Flow & State

- No global state manager (Redux, Zustand, etc.)
- Local state via `useState` + `useCallback` per page
- Custom hooks in Dashboard (`useDashboard.ts`) and Office Agents (`useOfficeAgents.ts`)
- Auth state via `AuthContext` + `AuthProvider`
- Toast via `ToastContext` (legacy)
- API calls via wrapper: `apiGet`, `apiPost`, etc.

### Issues
- `Backups.jsx`: Two separate loading states (`loadingSummary`, `loadingFiles`) when one would suffice
- `Backups.jsx`: Duplicated demo-user check pattern repeated in every handler
- No loading state component shared across pages (PageLoader is only for Suspense fallback)
- No error boundary per page (only root-level)

---

## 11. Summary of Changes Needed

### Critical (Phase 3+4 targets)
| # | Item | Effort |
|---|---|---|
| 1 | Decompose EODMonitor (1063 lines) into sub-components | Large |
| 2 | Migrate toast to sonner, remove custom Toast | Small |
| 3 | Build reusable form components (FormField, FilterBar, MultiSelect) | Medium |
| 4 | Build reusable card variants (ListCard, DetailCard, ActionCard, EmptyCard) | Medium |
| 5 | Add TanStack Table with sorting/filtering/pagination/CSV export | Medium |
| 6 | Replace UserAccessModal with shadcn Dialog | Medium |
| 7 | Migrate all legacy JSX components to TSX | Large |

### Important
| # | Item | Effort |
|---|---|---|
| 8 | Create `design-tokens.ts` — consolidate CSS vars into TS constants | Small |
| 9 | Build AppShell/Sidebar/Header as proper layout components | Medium |
| 10 | Add loading/empty states to all pages that lack them | Medium |
| 11 | Add page entry animations to all pages | Small |
| 12 | Rebuild Backups page to use PageHeader (not raw header markup) | Small |

### Nice-to-have
| # | Item | Effort |
|---|---|---|
| 13 | Remove duplicate `getInitials()` logic | Small |
| 14 | Create shared `hooks/` directory with common patterns | Small |
| 15 | Add error boundaries per page (not just root) | Small |
| 16 | Purge unused CSS from index.css | Medium |
| 17 | Add breadcrumb support to all pages | Small |

---

## 12. Recommendations (Priority Order for Phase 4)

1. **EODMonitor** — biggest page, worst ratio, needs full decomposition
2. **Backups** — hardcoded header, redundant state, needs sonner migration
3. **UsersAdmin** — raw table, needs DataTable + modal refactor
4. **StoreSync** — similar patterns to EODMonitor
5. **SystemHealth / AfterHours / RolesAdmin** — medium pages, similar fixes
6. **Remaining JSX pages** — migrate to TSX + component library
