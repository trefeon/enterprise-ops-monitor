# Frontend Audit — Enterprise Ops Monitor

> Generated 2026-07-07 via browser screenshot + code analysis

## Visual Issues by Page

### Landing (`/`)
- **Hero headline color split** — "with confidence" dimmer gray, dilutes CTA
- **Dashboard screenshot clipped** — bottom charts cut off
- **Low contrast body text** — medium gray on black, WCAG concern
- **No footer visible** in screenshot (may be under fold)

### Case Study (`/case-study`)
- **🔴 Disclosure box text cutoff** — right padding insufficient, "message-provider, or operational data is included." clipped
- **Faint vertical separators** — almost invisible on black bg
- **Title line-height tight** — descenders nearly touch ascenders
- **"production" word-broken** mid-word in hero title
- **No hover/active states** on nav links

### Login (`/login`)
- **🔴 Login form overlaps left branding section** — layout misalignment
- **Low contrast form text** — light font on dark bg hard to read
- **Cramped spacing** between input fields and checkbox/button
- No error states shown

### Starter/Docs (`/starter`)
- **🔴 Right-side content truncated** — cards overflow viewport
- **Inconsistent vertical rhythm** — gaps vary drastically
- **Low contrast card descriptions** — too small and dim

### Dashboard (`/app`)
- **🔴 Right-side overflow** — Active Nodes card and Recent Alerts clipped
- **Uneven card widths** — "Active Nodes" smaller than others
- **Sidebar shows wrong selection** — "System" highlighted while on Dashboard
- **Redundant header** — "ENTERPRISE OPS STARTER" in both top bar and page title

### System Health (`/app/system`)
- **CPU Usage displays "-"** — missing metric value
- **Disk progress bar too thin** — blends into background
- **Faint service icons** — barely visible on dark cards

### EOD Monitor (`/app/eod`)
- **🔴 Sidebar selection mismatch** — "System" highlighted not "EOD Monitor"
- **Inconsistent button styling** — action buttons vs demo buttons different heights
- **Icon style mismatch** — summary cards mix outline and filled icons
- **Thin progress bars** across all cards

### Store Sync (`/app/sync`)
- (fully functional — best rendered page)

## Component Architecture Issues

### 3-Layer Duplication

| Concern | `base/` | `shared/` | `ui/` |
|---|---|---|---|
| DataTable | `base-data-table.tsx` | `DataTable.tsx` | `data-table/DataTable.tsx` |
| Empty State | `base-empty-state.tsx` | `EmptyState.tsx` | `empty.tsx` |
| Card | `base-card.tsx` | `StatCard.tsx` / `SectionCard.tsx` | `card.tsx` + `cards/*` |
| Dialog/Modal | `base-dialog.tsx` | `Modal.tsx` / `ConfirmDialog.tsx` | `dialog.tsx` / `alert-dialog.tsx` |
| Toolbar | `base-toolbar.tsx` | `Toolbar.tsx` | — |
| Pagination | `base-data-table-pagination.tsx` | — | `pagination.tsx` / `data-table/DataTablePagination.tsx` |
| DatePicker | `base-date-picker.tsx` | `DatePicker.tsx` | `calendar.tsx` |
| Sidebar | `base-sidebar.tsx` / `base-sidebar-nav.tsx` | — | `sidebar.tsx` |
| Sheet | `base-sheet.tsx` | — | `sheet.tsx` |
| Loading | `base-loading-state.tsx` | — | `skeleton.tsx` / `spinner.tsx` |
| Error | `base-error-state.tsx` | — | `feedback/ErrorBoundary.tsx` |
| Form | `base-form-field.tsx` | `EntityFormDialog.tsx` | `form.tsx` / `forms/*` |
| Tabs | `base-tabs.tsx` | — | `tabs.tsx` |
| Breadcrumbs | `base-breadcrumbs.tsx` | — | `breadcrumb.tsx` |

**Total duplicated components: ~15**

### Target: Single `ui/` Layer

Merge into one flat component library:
```
src/components/ui/
├── data-table/        → DataTable, ColumnHeader, Pagination, Toolbar
├── cards/             → StatCard, ListCard, DetailCard, ActionCard
├── forms/             → FormField, SearchInput, FilterBar
├── feedback/          → LoadingSpinner, ErrorBoundary
└── *.tsx              → button, card, dialog, badge, etc (shadcn primitives)
```

## Pages Needing Decomposition

| Page | Lines | Priority |
|---|---|---|
| AfterHours | 1566 | 🔴 Split into types/hooks/components/index |
| StoreSync | 958 | 🔴 Split |
| AfterHoursReport | 885 | 🔴 Split |
| AgentUpdater | 748 | 🟡 Split |
| SystemHealth | 739 | 🟡 Split |
| LiveSync | 631 | 🟡 Strcture |
| StoreManagement | 629 | 🟡 Structure |
| IdentityCheck | 628 | 🟡 Structure |
| UsersAdmin | 603 | 🟡 Structure |
| Dashboard | 573 | 🟡 Structure |
| Landing | 501 | 🟢 Good enough |
| RemoteConfig/Backups | 359 | 🟢 Good enough |

## Design Token Alignment

Current: Vercel Geist dark palette (cyan #22d3ee accent) ✓
- Border radius: Already has variants (xs-2xl) ✓
- Typography: Space Grotesk display + Geist body ✓
- Shadows: Vercel-aligned ✓
- Animations: framer-motion installed ✓

Gaps:
- Focus styles not visible in screenshots
- Missing `prefers-reduced-motion` support
- Some inline arbitrary values remain in CSS
