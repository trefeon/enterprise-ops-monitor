# Component Basecode Guide

## Imports

```tsx
import {
  BaseCard,
  BaseToolbar,
  BaseDataTable,
  BaseDatePicker,
  BaseDialog,
  BaseEmptyState,
} from '@/components/base';
```

## Folder Contract

- `components/ui`: shadcn/Base UI primitives and registry output.
- `components/base`: reusable app patterns built from shadcn primitives.
- `components/shared`: compatibility wrappers or domain-specific shared components.
- `pages/*`: workflow state, API calls, route behavior, and composition only.

## BaseCard

Use `BaseCard` for repeated panels, metrics, settings blocks, and framed content.

```tsx
<BaseCard
  title="Automation"
  desc="Notification delivery status"
  icon={Bell}
  actions={<Button size="sm">Refresh</Button>}
>
  <StatusBadge variant="success">Enabled</StatusBadge>
</BaseCard>
```

Avoid nested cards. If a section needs visual grouping inside a card, use borders, spacing, or `BaseSection`.

## BaseToolbar

Use `BaseToolbar` for page filters, table controls, search, date controls, and grouped actions.

```tsx
<BaseToolbar
  title="Stores"
  searchValue={query}
  onSearchChange={setQuery}
  filters={<BaseDatePicker value={date} onChange={setDate} />}
  primaryAction={{ label: 'Refresh', icon: RefreshCw, onClick: refresh }}
/>
```

Keep workflow logic in the page; keep responsive wrapping and action layout in the toolbar.

## Base States

Use `BaseLoadingState`, `BaseEmptyState`, and `BaseErrorState` instead of one-off state markup. Every table, dialog, and card with remote data should expose loading, empty, and error states.

## Forms

Use `BaseFormField` for label, hint, required, and error structure. Use `Input`, `Textarea`, `Select`, `Checkbox`, or `BaseDatePicker` inside the field slot.

## New Component Rules

- Add a base component only when the pattern repeats or hides meaningful accessibility/behavior.
- Prefer children, slots, and small typed config objects over large prop sets.
- Export public types from `components/base/index.ts`.
- Use `cn()` and tokenized classes only.
- Document the API in `docs/*` before migrating more pages to it.

## Tweakcn Customization Workflow

Use tweakcn as a token editor, not as a page-specific styling source. Export Tailwind v3 HSL variables and map them into `apps/web/src/index.css`.

Keep these token groups aligned:

- Core: `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`.
- Surfaces: `--card`, `--card-foreground`, `--popover`, `--popover-foreground`.
- Sidebar: `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring`.
- Charts/status: keep semantic app tokens mapped to shadcn-compatible surfaces and avoid raw hex classes.
- Shape: `--radius`; base components derive rounded corners from shadcn primitives and Tailwind radius tokens.

Base components are intentionally easy to tweak through class slots:

```tsx
<BaseCard
  title="Sync Health"
  className="border-sidebar-border bg-card"
  contentClassName="grid gap-3"
/>

<BaseDataTable
  columns={columns}
  data={rows}
  tableClassName="[&_tbody_tr:hover]:bg-sidebar-accent/40"
/>

<BaseSlideIn direction="up" offset={8} transition={{ duration: 0.18 }}>
  <BaseToolbar title="Filters" />
</BaseSlideIn>
```

Do not paste one-off tweakcn colors directly into pages. Update tokens first, then use base component props or slots for local layout adjustments.
