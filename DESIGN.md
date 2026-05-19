# Enterprise Operations Monitor Design System

**Status:** Current canonical visual system
**Verified against:** `apps/web/src/index.css`, `apps/web/tailwind.config.js`, `apps/web/index.html`, shared UI primitives, app shell, and route pages
**Stack:** React 19, Vite 7, Tailwind CSS 3.4, shadcn/Base UI primitives, Lucide React
**Theme:** Dark only

This file is the visual design source of truth. For React architecture, routes, component ownership, and data-flow patterns, see [apps/web/docs/design.md](apps/web/docs/design.md).

## Design Direction

The app uses the Industrial Clarity system: a dense, operational dashboard style for branch monitoring, EOD checks, sync health, backups, agents, RBAC, and after-hours workflows.

Core principles:

- Dark-only operational UI, no light mode toggle.
- Green is the primary action and active-state color.
- Surface brightness creates depth; large shadows are reserved for floating overlays.
- Data values, IDs, timestamps, and version strings use monospace.
- Lucide React is the only rendered icon library.
- Tailwind stays on v3; no Tailwind v4 migration.

## Token Sources

Runtime tokens live in [apps/web/src/index.css](apps/web/src/index.css).
Tailwind mappings live in [apps/web/tailwind.config.js](apps/web/tailwind.config.js).
Font loading lives in [apps/web/index.html](apps/web/index.html).

Use CSS variables and Tailwind aliases instead of hardcoded colors in components.

## Color System

Direct design tokens:

```css
--bg-base: rgb(11 12 14);
--bg-surface: rgb(17 19 22);
--bg-elevated: rgb(24 27 31);
--bg-input: rgb(20 23 27);
--bg-hover: rgb(30 33 38);

--border-subtle: rgb(255 255 255 / 0.06);
--border-default: rgb(255 255 255 / 0.1);
--border-strong: rgb(255 255 255 / 0.18);
--border-accent: rgb(74 222 128 / 0.4);

--text-primary: rgb(240 242 245);
--text-secondary: rgb(139 145 154);
--text-muted: rgb(80 85 94);
--text-disabled: rgb(56 60 66);
--text-inverse: rgb(11 12 14);

--accent-solid: rgb(74 222 128);
--accent-dim: rgb(34 197 94);
--accent-muted: rgb(74 222 128 / 0.12);
--accent-glow: rgb(74 222 128 / 0.2);

--color-success: rgb(74 222 128);
--color-warning: rgb(251 191 36);
--color-danger: rgb(248 113 113);
--color-info: rgb(96 165 250);
--color-neutral: rgb(107 114 128);
```

shadcn/Tailwind HSL tokens are mapped to the same system:

| Token                              | Current role                        |
| ---------------------------------- | ----------------------------------- |
| `--background`                     | App canvas, mapped near `--bg-base` |
| `--card`                           | Cards, sidebar, header surfaces     |
| `--popover`                        | Menus, selects, elevated overlays   |
| `--primary`                        | Green action and active color       |
| `--secondary`                      | Hover and quiet grouped controls    |
| `--muted`                          | Table headers, subdued panels       |
| `--destructive`                    | Error and dangerous actions         |
| `--ring`                           | Green focus ring                    |
| `--success`, `--warning`, `--info` | Operational statuses                |

Tailwind aliases include `bg-bg-base`, `bg-bg-surface`, `bg-bg-elevated`, `bg-bg-input`, `text-primary`, `text-secondary`, `text-muted`, `status-success`, `status-warning`, `status-error`, `status-info`, and `status-neutral`.

## Status Colors

| Variant                 | Use                           | Tailwind                                      |
| ----------------------- | ----------------------------- | --------------------------------------------- |
| `success`               | Healthy, completed, synced    | `text-status-success`, `bg-status-success/10` |
| `warning`               | Pending, stale, degraded      | `text-status-warning`, `bg-status-warning/10` |
| `error` / `destructive` | Failed, offline, blocked      | `text-status-error`, `bg-destructive/10`      |
| `info`                  | Neutral technical information | `text-status-info`, `bg-status-info/10`       |
| `neutral`               | Unknown, inactive, disabled   | `text-status-neutral`, `bg-secondary`         |

Status badges default to a dot plus uppercase label. Live badges can animate the dot.

## Typography

Font tokens:

```css
--font-display: "DM Sans", "Geist", system-ui, sans-serif;
--font-body: "Geist", "DM Sans", system-ui, sans-serif;
--font-mono:
  "Geist Mono", "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
```

Loading:

- DM Sans and Geist Mono are loaded from Google Fonts in `index.html`.
- Geist body text is loaded through `@fontsource-variable/geist` in `index.css`.
- Tailwind exposes `font-display`, `font-body`, `font-heading`, and `font-mono`.

Type rules:

- Page titles use `.page-title`: `2rem`, bold, display font.
- Section titles use `.section-title`: `1.125rem`, semibold, display font.
- Body copy uses `font-body`, usually `text-sm`.
- Form labels use `.form-label`: 11px, uppercase, 0.08em tracking.
- KPI values use `font-mono`, `1.75rem`, bold.
- Table IDs, timestamps, versions, branch codes, and store codes use `font-mono`.
- Letter spacing is normal for headings. Only labels and metadata use positive tracking.

## Shape, Spacing, Motion

Radius tokens:

```css
--radius-xs: 4px;
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 10px;
--radius-xl: 12px;
--radius-2xl: 16px;
--radius-full: 9999px;
--radius: var(--radius-lg);
```

Usage:

- Cards and panels: `rounded-lg`.
- Buttons: `rounded-md`, with small buttons at `rounded-sm`.
- Inputs: `rounded-sm`.
- Badges and chips: `rounded-xs` or `rounded-sm`.
- Modals and larger elevated panels: `rounded-xl`.
- Avoid `rounded-3xl`, `rounded-4xl`, and `rounded-5xl` in app UI.

Spacing tokens:

```css
--page-px: 24px;
--page-py: 24px;
--section-gap: 24px;
--card-p: 20px;
--table-cell-px: 16px;
--table-cell-py: 12px;
--row-h: 48px;
```

Motion tokens:

```css
--transition-fast: 150ms ease;
--transition-normal: 250ms ease;
--transition-slow: 350ms ease-out;
--transition-spring: 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
```

Reduced motion is honored globally in `index.css`.

## Background And Elevation

The page background is textured:

- `--bg-base` as the base color.
- A subtle green radial glow at the top.
- A low-opacity 40px grid texture.

Elevation model:

| Level | Surface                       | Use                               |
| ----- | ----------------------------- | --------------------------------- |
| 0     | `--bg-base`                   | Body and app canvas               |
| 1     | `--bg-surface` / `--card`     | Cards, sidebar, header            |
| 2     | `--bg-elevated` / `--popover` | Menus, dropdowns, table headers   |
| 3     | Elevated surface plus shadow  | Dialogs, toast, floating overlays |
| 4     | `--bg-input`                  | Inputs and selects                |

Use borders and surface brightness first. Avoid old heavy shadows and decorative gradients.

## Layout System

App shell:

- Root layout is `dark flex h-screen overflow-hidden bg-background font-body text-foreground`.
- Desktop sidebar width is `w-60` (240px).
- Collapsed sidebar width is `md:w-20` (80px).
- Mobile sidebar uses a `Sheet` drawer at `w-60`.
- Header is sticky, `h-12`, `bg-card/95`, with a mobile menu button.
- Main content scrolls independently.

Page shell:

```jsx
<PageShell>
  <FeatureStoryBanner story={getFeatureStory("feature-id")} />
  <PageHeader title="..." subtitle="..." />
  {/* stats, toolbar, primary content */}
</PageShell>
```

`PageShell` applies `.page-container`: max width `screen-2xl`, responsive page padding, and `space-y-6`.

Feature story banners are the portfolio layer. Use one at the top of each routed operational page. Nested tab content, such as After Hours Monthly Report, must not render another page banner.

## Components

### Button

Source: [apps/web/src/components/ui/button.tsx](apps/web/src/components/ui/button.tsx)

Variants:

- `default`: green primary CTA.
- `secondary`: quiet surface action.
- `outline`: bordered secondary action.
- `ghost`: nav, toolbar, icon-only quiet action.
- `destructive`: transparent red destructive action.
- `link`: text link.

Sizes:

- `default` / `md`: minimum height 40px.
- `sm` / `xs`: compact toolbar actions.
- `lg`: 48px large action.
- `icon`, `icon-sm`, `icon-xs`, `icon-lg`: fixed icon buttons.

Button icons should be Lucide components rendered as children, not string icon names.

### Card

Source: [apps/web/src/components/ui/card.tsx](apps/web/src/components/ui/card.tsx)

Cards use `rounded-lg`, `border-border`, `bg-card`, and internal 20px horizontal padding. Use `size="sm"` for denser panels.

Do not put generic page sections inside nested decorative cards. Cards are for repeated items, grouped tools, tables, dialogs, and specific panels.

### Input And Select

Sources:

- [apps/web/src/components/ui/input.tsx](apps/web/src/components/ui/input.tsx)
- [apps/web/src/components/ui/select.tsx](apps/web/src/components/ui/select.tsx)

Inputs use `bg-input`, `border-input`, `rounded-sm`, green focus rings, and dark native option styling.

### StatusBadge

Sources:

- [apps/web/src/components/shared/StatusBadge.tsx](apps/web/src/components/shared/StatusBadge.tsx)
- [apps/web/src/components/ui/StatusBadge.jsx](apps/web/src/components/ui/StatusBadge.jsx)

Use the shared TSX component for new or migrated pages. The JSX component remains for older data-column helpers. Supported variants are `success`, `warning`, `error`/`destructive`, `info`, and `neutral`, plus shadcn passthrough variants used by some legacy pages.

### StatCard

Sources:

- [apps/web/src/components/shared/StatCard.tsx](apps/web/src/components/shared/StatCard.tsx)
- [apps/web/src/components/ui/StatCard.jsx](apps/web/src/components/ui/StatCard.jsx)

The shared TSX StatCard is preferred. It accepts a React node icon, status rail, mono KPI value, and optional click handler. The JSX version is still present for compatibility but should not receive new Material-style string icons.

### Table

Sources:

- [apps/web/src/components/ui/table.tsx](apps/web/src/components/ui/table.tsx)
- [apps/web/src/components/shared/DataTable.tsx](apps/web/src/components/shared/DataTable.tsx)
- [apps/web/src/components/ui/DataTable.jsx](apps/web/src/components/ui/DataTable.jsx)

Prefer shadcn `<Table>` or the shared TSX `DataTable` for new work. Legacy JSX `DataTable` remains where pages have not been fully migrated.

### Toolbar

Source: [apps/web/src/components/ui/Toolbar.jsx](apps/web/src/components/ui/Toolbar.jsx)

Use `Toolbar` for filter/search/action rows. Keep controls responsive and wrap onto multiple rows rather than compressing dense operational controls.

### FeatureStoryBanner

Source: [apps/web/src/components/FeatureStoryBanner.jsx](apps/web/src/components/FeatureStoryBanner.jsx)

`stories.js` still uses a `materialIcon` key name for historical compatibility, but the banner maps those values to Lucide icons internally. Do not import Material Symbols or render icon font spans.

## Login Page

Route: `/login`

The login page uses a 60/40 responsive split:

- Hero side with app identity, operational status chips, portfolio copy, and mono footer/version text.
- Form side with elevated login card, tokenized inputs, green full-width submit button, and demo account panel.
- Mobile stacks hero and form vertically.

Login-specific utility classes live in `index.css` with the `login-*` prefix.

## Iconography

Use Lucide React only.

Size conventions:

| Context          | Class                  |
| ---------------- | ---------------------- |
| Sidebar nav      | `size-4`               |
| Button icon      | `size-4`               |
| Input prefix     | `size-3.5` or `size-4` |
| Status icon      | `size-3`               |
| Page/card icon   | `size-5`               |
| Empty state icon | `size-8` to `size-10`  |

Do not add Material Symbols imports. Do not add string-icon handling to new reusable components.

## Page Standards

Every routed private page should:

- Use `<PageShell>`.
- Start with a single `<FeatureStoryBanner>` unless it is nested content.
- Follow with `<PageHeader>`.
- Use shared StatCards before dense tables where KPIs are important.
- Use `Toolbar` for filters and actions.
- Use shared `StatusBadge` and Lucide icons.
- Keep destructive actions behind confirmation and demo-user write blocking.
- Use WIB date helpers from `lib/date.js`.

## Do

- Use `bg-card`, `bg-secondary`, `bg-input`, `text-foreground`, `text-muted-foreground`, and status tokens.
- Keep controls compact and scannable.
- Use `gap-*`, not `space-*`, for new flexible layouts.
- Use mono type for branch IDs, store codes, version strings, timestamps, and metrics.
- Preserve dark-only behavior.
- Use Tailwind v3-compatible classes.

## Do Not

- Do not use raw black/white as primary UI surfaces or text.
- Do not bring back blue/white primary CTA styling.
- Do not use oversized radii for operational cards.
- Do not use Material Symbols or icon font spans.
- Do not add new design tokens without updating `index.css`, `tailwind.config.js`, and this file.
- Do not make nested page banners inside tabs or subviews.

## Useful Checks

```bash
rg "material-symbols|Material Symbols" apps/web
rg "rounded-4xl|rounded-5xl|shadow-2xl|bg-white|text-white|bg-black|text-black" apps/web/src
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web build
```
