---
name: Enterprise Operations Monitor
description: Operational dashboard for retail EOD, sync, backups, agents, and access control
version: alpha

colors:
  background: "#0A0A0A"
  foreground: "#FAFAFA"
  card: "#0A0A0A"
  card-foreground: "#FAFAFA"
  primary: "#FAFAFA"
  primary-foreground: "#1A1C1E"
  secondary: "#1E293B"
  secondary-foreground: "#FAFAFA"
  muted: "#1E293B"
  muted-foreground: "#9CA3AF"
  accent: "#1E293B"
  accent-foreground: "#FAFAFA"
  destructive: "#7F1D1D"
  destructive-foreground: "#FAFAFA"
  border: "#202024"
  input: "#202024"
  ring: "#D4D4D8"
  success: "#00A857"
  warning: "#FFB300"
  error: "#7F1D1D"
  info: "#3399FF"
  brand: "#3399FF"
  sidebar: "#1A1C1E"
  sidebar-foreground: "#FAFAFA"
  sidebar-primary: "#1A1C1E"
  sidebar-primary-foreground: "#FAFAFA"
  sidebar-accent: "#27272A"
  sidebar-accent-foreground: "#1A1C1E"
  sidebar-border: "#FFFFFF1A"
  sidebar-ring: "#52525B"
  status-dot-online: "#00A857"
  status-dot-offline: "#7F1D1D"
  status-dot-warning: "#FFB300"
  status-dot-info: "#3399FF"

typography:
  font-body:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: "400"
    lineHeight: 1.5
  font-display:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: "400"
    lineHeight: 1.5
  page-title:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: "600"
    lineHeight: 1.3
    letterSpacing: -0.02em
  page-subtitle:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: "400"
    lineHeight: 1.5
    color: "{colors.muted-foreground}"
  page-meta:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: "400"
    lineHeight: 1.5
    color: "{colors.muted-foreground}"
  section-title:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: "600"
    lineHeight: 1.3
    letterSpacing: -0.02em
  table-header:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: "600"
    lineHeight: 1.5
    letterSpacing: 0.05em
    textTransform: uppercase
    color: "{colors.muted-foreground}"
  table-cell:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: "400"
    lineHeight: 1.5
  stat-value:
    fontFamily: Inter
    fontSize: 1.8rem
    fontWeight: "600"
    lineHeight: 1.2
    letterSpacing: -0.02em
  stat-label:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: "500"
    lineHeight: 1.3
    color: "{colors.muted-foreground}"
  stat-subtext:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: "400"
    lineHeight: 1.5
    color: "{colors.muted-foreground}"
  badge-text:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: "600"
    lineHeight: 1.5
  modal-title:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: "600"
    lineHeight: 1.3
  toolbar-label:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: "700"
    lineHeight: 1.5
    letterSpacing: 0.05em
    textTransform: uppercase
    color: "{colors.muted-foreground}"

spacing:
  none: 0px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
  page-x: 24px
  page-y: 24px
  section-gap: 24px
  card-padding: 24px
  table-cell-x: 12px
  table-cell-y: 10px
  row-height: 60px

rounded:
  none: 0px
  sm: 10px
  md: 12px
  lg: 14px
  xl: 16px
  2xl: 18px
  full: 9999px

components:
  page-shell:
    maxWidth: 1536px
    padding: "{spacing.page-x}"
    paddingY: "{spacing.page-y}"
    gap: "{spacing.section-gap}"

  page-header:
    display: flex
    flexDirection: column
    gap: "{spacing.lg}"
    responsive-md-flexDirection: row
    responsive-md-alignItems: start
    responsive-md-justifyContent: space-between

  page-title:
    typography: "{typography.page-title}"

  page-subtitle:
    typography: "{typography.page-subtitle}"

  surface-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    padding: "{spacing.card-padding}"
    shadow: sm

  surface-card-compact:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    padding: "{spacing.lg}"
    shadow: sm

  button-default:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    paddingX: "{spacing.lg}"
    paddingY: "{spacing.sm}"
    fontWeight: 500
    fontSize: 0.875rem
    minHeight: 44px

  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.lg}"
    paddingX: "{spacing.lg}"
    paddingY: "{spacing.sm}"
    fontWeight: 500
    fontSize: 0.875rem
    minHeight: 44px

  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-foreground}"
    rounded: "{rounded.lg}"
    paddingX: "{spacing.lg}"
    paddingY: "{spacing.sm}"
    fontWeight: 500
    fontSize: 0.875rem
    minHeight: 44px

  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    paddingX: "{spacing.sm}"
    paddingY: "{spacing.sm}"
    fontWeight: 500
    fontSize: 0.875rem
    minHeight: 44px

  button-outline:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    paddingX: "{spacing.lg}"
    paddingY: "{spacing.sm}"
    fontWeight: 500
    fontSize: 0.875rem
    minHeight: 44px

  button-icon:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    paddingX: "{spacing.sm}"
    paddingY: "{spacing.sm}"
    width: 44px
    height: 44px

  stat-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    padding: "{spacing.card-padding}"
    gap: "{spacing.sm}"
    iconContainer-size: 44px
    iconContainer-rounded: "{rounded.xl}"
    iconContainer-borderColor: "{colors.border}"
    iconContainer-borderWidth: 1px
    iconContainer-fontSize: 26px

  table:
    borderColor: "{colors.border}"
    headerRow-height: "{spacing.row-height}"
    dataRow-height: "{spacing.row-height}"
    headerCell-paddingX: "{spacing.table-cell-x}"
    headerCell-paddingY: "{spacing.table-cell-y}"
    dataCell-paddingX: "{spacing.table-cell-x}"
    dataCell-paddingY: "{spacing.table-cell-y}"
    header-typography: "{typography.table-header}"
    cell-typography: "{typography.table-cell}"
    header-backgroundColor: "{colors.muted}"
    header-backgroundOpacity: 0.3
    hover-backgroundColor: "{colors.muted}"
    hover-backgroundOpacity: 0.3

  status-badge:
    rounded: "{rounded.md}"
    paddingX: "{spacing.sm}"
    paddingY: 2px
    fontSize: 0.75rem
    fontWeight: 600
    dot-size: 8px

  status-badge-success:
    backgroundColor: "{colors.success}"
    backgroundColorOpacity: 0.1
    textColor: "{colors.success}"
    dotColor: "{colors.success}"

  status-badge-warning:
    backgroundColor: "{colors.warning}"
    backgroundColorOpacity: 0.1
    textColor: "{colors.warning}"
    dotColor: "{colors.warning}"

  status-badge-error:
    backgroundColor: "{colors.destructive}"
    backgroundColorOpacity: 0.1
    textColor: "{colors.destructive}"
    dotColor: "{colors.destructive}"

  status-badge-info:
    backgroundColor: "{colors.info}"
    backgroundColorOpacity: 0.1
    textColor: "{colors.info}"
    dotColor: "{colors.info}"

  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    paddingX: "{spacing.md}"
    paddingY: "{spacing.sm}"
    fontSize: 0.875rem
    minHeight: 44px

  select-trigger:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    paddingX: "{spacing.md}"
    paddingY: "{spacing.sm}"
    fontSize: 0.875rem
    minHeight: 44px

  modal:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
    maxHeight: 65vh
    scrollable: true

  modal-scroll-70:
    maxHeight: 70vh
    scrollable: true

  progress-bar:
    height: 4px
    rounded: "{rounded.full}"
    track-backgroundColor: "{colors.muted}"
    fill-backgroundColor: "{colors.primary}"
    fill-transition: width 0.3s ease

  sidebar:
    backgroundColor: "{colors.card}"
    width-collapsed: 80px
    width-expanded: 256px
    item-rounded: "{rounded.lg}"
    item-minHeight: 44px
    item-paddingX: "{spacing.lg}"
    item-paddingY: "{spacing.sm}"
    item-active-backgroundColor: "{colors.secondary}"
    item-active-textColor: "{colors.secondary-foreground}"
    item-hover-backgroundColor: "{colors.secondary}"
    item-hover-opacity: 0.5
    item-icon-fontSize: 1.25rem

  search-bar:
    rounded: "{rounded.lg}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    backgroundColor: "{colors.background}"
    paddingX: "{spacing.md}"
    minHeight: 44px
    icon-fontSize: 1.25rem

  empty-state:
    gap: "{spacing.lg}"
    icon-fontSize: 3rem
    icon-color: "{colors.muted-foreground}"
    icon-opacity: 0.5
    title-fontSize: 1rem
    title-fontWeight: 500
    description-fontSize: 0.875rem
    description-color: "{colors.muted-foreground}"

  feature-banner:
    backgroundColor: "{colors.muted}"
    backgroundColorOpacity: 0.2
    rounded: "{rounded.lg}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    paddingX: "{spacing.lg}"
    paddingY: "{spacing.md}"
    iconContainer-size: 32px
    iconContainer-rounded: "{rounded.md}"
    iconContainer-backgroundColor: "{colors.info}"
    iconContainer-backgroundOpacity: 0.15
    iconContainer-textColor: "{colors.info}"
    expand-icon-color: "{colors.muted-foreground}"

  divider:
    borderColor: "{colors.border}"
    borderWidth: 1px
    marginY: "{spacing.sm}"
---

## Overview

Enterprise Operations Monitor is a dark-mode-only operational dashboard for retail branch management. The UI follows a **utility-first design system** built on Tailwind CSS with CSS custom properties. Every pixel comes from a predefined set of design tokens — no hardcoded values, no ad-hoc spacing, no orphan colors.

**Core principles:**
- Dark mode forced — no light toggle, no mixed themes
- Every page follows the same template: FeatureStoryBanner → PageHeader → content
- All components come from either shadcn/ui primitives or project-specific shared components
- Spacing, colors, and typography are governed by CSS variables declared in `index.css`
- Responsive at `md:` breakpoint (768px) — sidebar collapses, page padding shrinks, layouts stack

## Colors

The palette is industrial-dark with a single semantic accent (blue/info). Status colors carry operational meaning.

### Background & Surface

- **Background (`#0A0A0A`)** — Page canvas. Applied via `bg-background`.
- **Card (`#0A0A0A`)** — Identical to background for seamless card embedding. `bg-card`.
- **Secondary (`#1E293B`)** — Sidebar active state, button secondary variant, table header. `bg-secondary`.
- **Muted (`#1E293B`)** — Same as secondary. Used for hover states, progress track, stat card icon container. `bg-muted`.

### Text

- **Foreground (`#FAFAFA`)** — Primary text, page titles, stat values. `text-foreground`.
- **Muted-foreground (`#9CA3AF`)** — Secondary text, subtitles, descriptions, metadata, table headers, disabled. `text-muted-foreground`.
- **Primary-foreground / Secondary-foreground** — Text on colored buttons. Always high-contrast.

### Borders & Inputs

- **Border (`#202024`)** — Cards, tables, inputs, dividers, modals. `border-border`.
- **Input (`#202024`)** — Same as border. `border-input`.

### Status (Semantic)

| Token | Hex | Tailwind Utility | Usage |
| --- | --- | --- | --- |
| Success | `#00A857` | `text-status-success`, `bg-status-success/10`, `border-status-success/30` | Completed operations, synced, healthy |
| Warning | `#FFB300` | `text-status-warning`, `bg-status-warning/10`, `border-status-warning/30` | Stale data, degraded, pending |
| Error/Destructive | `#7F1D1D` | `text-destructive`, `bg-destructive/10`, `border-destructive/30` | Failed operations, access denied, offline |
| Info | `#3399FF` | `text-status-info`, `bg-status-info/10`, `border-status-info/20` | Technical notes, banners, blue accents |
| Brand | `#3399FF` | Same as info | Primary brand accent, links |

Status colors are always used at 10%–30% opacity for backgrounds/borders to maintain hierarchy. Full opacity only for the color value itself (text, dots, indicators).

### Sidebar

Dedicated token set (`--sidebar`, `--sidebar-foreground`, etc.) defined as OKLCH in `index.css`. Applied via Tailwind `sidebar-*` classes. Sidebar border uses white-at-10%-opacity for a subtle separation line.

## Typography

Only **Inter** is used. One typeface, two weights (400 body, 600 headings), no variable fonts in production. The Geist font package is imported but unused by Tailwind classes.

### Type Scale

```
page-title:      1.5rem / 24px  Semibold  -0.02em tracking
section-title:   1.125rem / 18px  Semibold  -0.02em tracking
stat-value:      1.8rem / ~29px   Semibold  -0.02em tracking
modal-title:     1.125rem / 18px  Semibold
body / table:    0.875rem / 14px  Regular
page-subtitle:   1rem / 16px      Regular   (muted-foreground)
table-header:    0.75rem / 12px   Semibold  0.05em tracking, uppercase
stat-label:      0.875rem / 14px  Medium    (muted-foreground)
stat-subtext:    0.75rem / 12px   Regular   (muted-foreground)
badge:           0.75rem / 12px   Semibold
toolbar-label:   0.75rem / 12px   Bold      0.05em tracking, uppercase, (muted-foreground)
page-meta:       0.875rem / 14px  Regular   (muted-foreground)
```

### Usage Rules

- **Page headers**: Use `.page-title` class for `h1`, `.page-subtitle` for description.
- **Section headings**: Use `.section-title` class for `h2`.
- **Stat cards**: Use inline `text-2xl` / `text-[1.8rem]` for value, `text-sm` for label, `text-xs` for subtext.
- **Table header cells**: Use shadcn `<TableHead>` which applies uppercase tracking.
- **Never** set ad-hoc font sizes — always use the predefined scale above.
- **Never** mix fonts — Inter everywhere.

## Layout & Spacing

### Page Container

```
max-width: 1536px (screen-2xl)
padding-x: 24px (px-6 at lg, px-4 at base)
padding-y: 24px (py-6)
gap between sections: 24px (space-y-6)
```

Applied via `.page-container` class on the `<PageShell>` wrapper. Every page uses `<PageShell>`.

### Spacing Scale

| Token | Value | Tailwind | Usage |
| --- | --- | --- | --- |
| xs | 4px | `gap-1`, `p-1` | Badge padding, tiny gaps |
| sm | 8px | `gap-2`, `p-2` | Tight spacing, icon gaps |
| md | 12px | `gap-3`, `p-3` | Input padding, cell padding |
| lg | 16px | `gap-4`, `p-4` | Card compact padding, button padding |
| xl | 24px | `gap-6`, `p-6` | Page padding, card padding, section gap |
| 2xl | 32px | `gap-8`, `p-8` | Large section separation |
| 3xl | 48px | `gap-12` | Major layout transitions |

### Section Order (Every Page)

```
<PageShell>
  <FeatureStoryBanner />          (collapsible accordion)
  <PageHeader />                   (title + subtitle + optional actions)
  (StatCard grid or Toolbar)       (KPI row, filter bar)
  (Primary content table/view)     (table, grid, or detail view)
  (Optional modals/dialogs)        (overlays)
</PageShell>
```

This sequence is **mandatory**. Do not reorder sections. Do not skip the FeatureStoryBanner.

### Responsive Breakpoints

| Breakpoint | Width | Sidebar | Page Padding | Layout |
| --- | --- | --- | --- | --- |
| Base | <768px | Hidden (Sheet drawer) | `px-4` | Single column stacks |
| `md:` | ≥768px | Visible, collapsible | `px-6` | Multi-column grids |
| `lg:` | ≥1024px | Expanded | `px-8` | Full 2-3 column grids |

- Sidebar collapses to 80px (icons only) on `md:` when toggled.
- Tables remain horizontal-scrollable on mobile.
- PageHeader actions stack vertically on mobile.
- StatCard grids go 2 columns on mobile → 4 columns on `sm:`.

## Elevation & Depth

The UI is intentionally **flat** with minimal depth cues:

- **Cards**: `shadow-sm` only (subtle 1px border does most of the separation work).
- **Interactive hover**: Buttons and clickable cards get `hover:shadow-md`, `active:scale-[0.98]`.
- **Modals**: Standard dialog backdrop (background dimmed, no additional shadow).
- **Sidebar**: Flush with viewport edge, border-right separates from content.
- **Header**: `sticky top-0 z-30` with border-bottom — no drop shadow.
- **No gradients, no glass morphism** (except `.glass-panel` for decorative elements only).
- **No blur** in production UI (`.glass-panel` has `backdrop-filter: blur(10px)` but is decorative only).

## Shapes

- **Default radius**: 14px (`rounded-lg`). This is the universal card/button/surface radius.
- **Inner radius**: 12px (`rounded-md`, calc(14px - 2px)). For inputs inside cards.
- **Compact radius**: 10px (`rounded-sm`, calc(14px - 4px)). For tight surfaces.
- **Icon containers**: 16px–18px rounded (`rounded-xl` / `rounded-2xl`). Stat card icons, avatar initials.
- **Badges**: 12px rounded. Small inline labels.
- **Buttons**: 14px rounded, matching card radius for visual alignment.
- **Progress bar**: Fully rounded (`rounded-full`). Thin 4px track.
- **Status dots**: Fully rounded (circular).

**Rule**: Never use a radius value that isn't derived from `var(--radius) = 14px`.

## Components

### PageShell
The outer wrapper for every page. Provides max-width, responsive padding, and vertical spacing. Always the first element inside a page component.

```
<PageShell>
  {children}
</PageShell>
```

### FeatureStoryBanner
An expandable accordion at the top of every operational page. Shows the feature's problem/solution/impact. Collapsed by default. Never omitted — it is the portfolio storytelling layer.

- **Styling**: Muted background, border, collapsible button with expand/collapse icon.
- **Icon container**: 32px, info-blue background at 15% opacity, info-blue icon.
- **Content grid**: 3 columns on `lg:`, single column on mobile.
- **Metric pills**: Inline flex, border, `bg-background` (not card), small text.

### PageHeader
Title + subtitle + optional actions row. Two variants exist (shared/PageHeader.tsx uses `description` prop, ui/PageHeader.jsx uses `subtitle` — they render identically).

- **Layout**: Flex column on mobile, flex row on `md:` with `justify-between`.
- **Title**: `.page-title` class (1.5rem semibold).
- **Subtitle**: `.page-subtitle` class (1rem, muted-foreground).
- **Actions**: Right-aligned row on desktop, full-width stacked on mobile.
- **Meta**: Optional third line below subtitle, `.page-meta` class.

### StatCard
Two variants exist. Use **the right one per page type**:

| Variant | File | Icon Type | When to Use |
| --- | --- | --- | --- |
| **New (TSX)** | `components/shared/StatCard.tsx` | `ReactNode` (lucide-react) | New pages, Office Agents, Dashboard |
| **Legacy (JSX)** | `components/ui/StatCard.jsx` | Material Symbol string | Legacy pages, EOD Monitor, System Health |

**Legacy variant details** (ui/StatCard.jsx):
- Top accent rail (4px, colored by status type)
- Icon container: 44px rounded-2xl, border, shadow-sm
- 5 status modes: `default`, `success`, `warning`, `error`, `info`
- Icon gets hover lift (`group-hover:-translate-y-0.5`)
- Value: `text-2xl` / `text-[1.8rem]` semibold

**New variant details** (shared/StatCard.tsx):
- No top rail — clean card
- Icon rendered via `ReactNode` prop, colored via `accent` string
- Optional `onClick` makes card interactive with `cursor-pointer` + scale feedback
- Simpler structure: title | value | subtext

### Surface Card
Standard card container used for content sections, stat cards, and group wrappers.

- **`.surface-card`**: 14px rounded, border, card background, `p-card` (24px), `shadow-sm`.
- **`.surface-card-compact`**: Same but `p-4` (16px). For toolbars, filters, tight content.

### Table
Two implementations — prefer shadcn for new pages:

| Implementation | File | Usage |
| --- | --- | --- |
| shadcn Table | `@/components/ui/table` | New / migrated pages (Dashboard, Office Agents) |
| Legacy DataTable | `components/ui/DataTable.jsx` | Legacy pages (Stores, Employees, Accounts) |

**shadcn Table styles**:
- Header row: 60px, muted/30 background, uppercase tracking, `text-xs`, semibold
- Data rows: 60px, border-b between rows, hover with muted/30 background
- Cells: px-3 (12px) x / py-2.5 (10px) y

### Button
CVA-based variants from `@/components/ui/button.tsx`:

| Variant | Class | When |
| --- | --- | --- |
| Default | `variant="default"` | Primary actions |
| Secondary | `variant="secondary"` | Alternative actions |
| Destructive | `variant="destructive"` | Delete, restart, guarded |
| Ghost | `variant="ghost"` | Icon buttons, sidebar collapse |
| Outline | `variant="outline"` | Secondary with border |
| Link | `variant="link"` | Text-only navigation |

All buttons have `min-h-[44px]` for touch target compliance. Icon-only buttons use `size="icon"` with 44px × 44px.

### StatusBadge
Colored label with dot indicator. Four semantic variants matching status colors: `success`, `warning`, `error`, `info`.

- Dot is 8px, circular, filled with status color.
- Background uses status color at 10% opacity.
- Text uses status color at full opacity.
- Rounded at 12px.

### Modal / Dialog
Two implementations:
- **shadcn Dialog** (`@/components/ui/dialog.tsx`): New pages, standard dialog behavior.
- **Legacy Modal** (`components/ui/Modal.jsx`): Older pages, simpler API.
- **ConfirmDialog** (`components/ui/ConfirmDialog.jsx`): Destructive action confirmation with cancel/confirm buttons.

Modal content is scrollable at `max-height: 65vh` (`.modal-scroll-65`) or `70vh` (`.modal-scroll-70`).

### SearchBar
Search input with leading icon. Standardized in `components/shared/SearchBar.tsx`. No legacy variant.

- 44px min-height, 14px rounded, border, icon positioned absolutely on the left.
- Debounced by default (implemented in the parent page).

### ProgressBar
Thin (4px), fully rounded track. Used in EOD Monitor and Backups for completion percentage.

- Track: `bg-muted`
- Fill: `bg-primary` with width transition `0.7s ease-out`

## Do's and Don'ts

### Do
- Do wrap every page in `<PageShell>`
- Do start every page with `<FeatureStoryBanner story={getFeatureStory('id')} />`
- Do follow `<PageHeader>` → content ordering
- Do use `hasPermission(user, Permissions.X)` for access checks (not role comparison)
- Do use `apiGet()` / `apiPost()` helpers for API calls
- Do use `lib/date.js` functions for all date/time display
- Do use `formatBytes()` pattern from Backups for file sizes
- Do use `formatDuration()` pattern from StoreSync/LiveSync for time durations
- Do add `isDemoUser` checks in page handlers to block write actions
- Do use `<Guard>` for conditional button visibility
- Do use `<EmptyState>` when data is null/empty after loading
- Do use `<Skeleton>` for loading states in new pages
- Do keep file sizes under 600 lines — split into `components/` or `hooks/` subfolders

### Don't
- Don't use `npm` or `yarn` — use `pnpm`
- Don't hardcode colors, spacing, or font sizes — use CSS variable tokens and Tailwind utilities
- Don't use `new Date().toLocaleString()` — use WIB helpers from `lib/date.js`
- Don't import `axios` directly — use the client wrapper
- Don't compare `user.role` directly — use `hasPermission(user, perm)`
- Don't add new status color variants — the four (success, warning, error, info) cover all cases
- Don't add light mode — the app is dark-only
- Don't use ad-hoc border radii — always derive from `var(--radius)`
- Don't create new icon systems — use lucide-react for in-page, Material Symbols for legacy
- Don't add external state management — `useState` + `useCallback` is sufficient
- Don't create new button variants — the 6 CVA variants cover all use cases
- Don't skip the FeatureStoryBanner on any operational page
- Don't use ALTER TABLE — use migration files
