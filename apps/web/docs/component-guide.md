# Component Library Guide — Enterprise Ops Monitor

> How to use each component in the UI library
> Updated: 2026-05-22

---

## Data Table

### DataTable (TanStack-based)

**Location:** `@/components/ui/data-table/DataTable`

The primary table component built on TanStack Table v8. Supports client-side and server-side modes.

```tsx
import { DataTable } from '@/components/ui/data-table/DataTable';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<MyType>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge ... /> },
  { id: 'actions', cell: ({ row }) => <Button>Edit</Button> },
];

<DataTable
  columns={columns}
  data={items}
  loading={isLoading}
  emptyState={<EmptyState title="No items" />}
  pageSize={25}
  serverSide={false}
  selectable={true}
  onRowClick={(row) => handleClick(row)}
/>
```

**Props:**
| Prop | Type | Default | Description |
|---|---|---|---|
| `columns` | `ColumnDef<T>[]` | required | TanStack column definitions |
| `data` | `T[]` | required | Row data |
| `loading` | `boolean` | `false` | Shows skeleton rows |
| `emptyState` | `ReactNode` | `'No records found.'` | Empty state content |
| `pageSize` | `number` | `25` | Rows per page |
| `selectable` | `boolean` | `false` | Row checkboxes |
| `serverSide` | `boolean` | `false` | Enable server pagination |

### DataTableColumnHeader

**Location:** `@/components/ui/data-table/DataTableColumnHeader`

Sortable column header with dropdown menu.

```tsx
<DataTableColumnHeader column={column} title="Name" />
```

### DataTablePagination

**Location:** `@/components/ui/data-table/DataTablePagination`

Pagination controls — page size, prev/next, first/last.

### DataTableToolbar

**Location:** `@/components/ui/data-table/DataTableToolbar`

Search + column visibility toggle + custom filters.

---

## Cards

**Location:** `@/components/ui/cards/`

### StatCard

(Existing in `@/components/shared/StatCard`)

```tsx
<StatCard
  title="Total Stores"
  value={42}
  icon={<Store className="size-5" />}
  status="success"
  trend={{ value: 12, direction: 'up', label: 'vs yesterday' }}
  loading={isLoading}
/>
```

### ListCard

```tsx
<ListCard
  title="Recent Alerts"
  subtitle="Last 24 hours"
  items={alerts.map((a) => ({
    id: a.id,
    label: a.title,
    value: <StatusBadge variant="warning">{a.severity}</StatusBadge>,
    icon: <AlertTriangle className="size-4" />,
    onClick: () => handleAlert(a),
  }))}
  loading={isLoading}
  maxHeight="400px"
/>
```

### DetailCard

```tsx
<DetailCard
  title="Store Information"
  subtitle="Branch #A-1234"
  columns={2}
  fields={[
    { label: 'Store Code', value: 'STO-001' },
    { label: 'Area', value: 'Jakarta Pusat' },
    { label: 'Status', value: <StatusBadge variant="success">Active</StatusBadge> },
    { label: 'Last Sync', value: formatTime(syncAt), span: 2 },
  ]}
  loading={isLoading}
/>
```

### ActionCard

```tsx
<ActionCard
  title="Run Backup"
  description="Create a manual database backup snapshot"
  icon={<Database className="size-5" />}
  actionLabel="Start Backup"
  onAction={handleBackup}
  variant="primary"
  loading={isProcessing}
/>
```

### EmptyCard

```tsx
<EmptyCard
  title="No stores found"
  description="Try adjusting your search filters"
  icon={<Store className="size-8" />}
  action={<Button onClick={resetFilters}>Clear Filters</Button>}
/>
```

---

## Forms

**Location:** `@/components/ui/forms/`

### FormField

```tsx
import { FormField } from '@/components/ui/forms/FormField';

<FormField label="Store Name" name="storeName" required>
  <Input {...register('storeName')} />
</FormField>;
```

### SearchInput

```tsx
<SearchInput
  value={search}
  onChange={setSearch}
  placeholder="Search stores..."
  debounceMs={300}
  size="sm"
/>
```

### FilterBar

```tsx
<FilterBar activeCount={filterCount} onReset={clearFilters}>
  <Select ... />
  <Select ... />
</FilterBar>
```

---

## Layout

**Location:** `@/components/layout/`

### ContentSection

```tsx
<ContentSection
  title="Backup History"
  subtitle="Recent database snapshots"
  actions={<Button onClick={refresh}>Refresh</Button>}
  footer={<div className="text-xs text-muted-foreground">Last updated 2 min ago</div>}
>
  <DataTable ... />
</ContentSection>
```

---

## Feedback

**Location:** `@/components/ui/feedback/`

### LoadingSpinner

```tsx
<LoadingSpinner size="lg" label="Loading dashboard..." />
```

### ErrorBoundary

```tsx
import { ErrorBoundary } from '@/components/ui/feedback/ErrorBoundary';

<ErrorBoundary onRetry={handleRetry}>
  <Dashboard />
</ErrorBoundary>;
```

---

## Toast (Sonner)

All toasts now use **Sonner** instead of the old custom Toast system.

```tsx
import { toast } from 'sonner';

toast.success('Backup complete', { description: 'File saved successfully' });
toast.error('Sync failed', { description: error.message });
toast.warning('Demo mode', { description: 'Action not available' });
toast.info('Data refreshed', { description: `${count} records updated` });
```

Add `<Toaster />` in the root layout (already done in `App.jsx`).

---

## Design Tokens

**Location:** `@/lib/design-tokens`

```tsx
import { SPACING, TYPOGRAPHY, RADIUS, ANIMATION, STATUS } from '@/lib/design-tokens';
```

Use for consistent spacing, typography, radius, animation durations, and status colors.

---

## Migration Checklist

When refactoring a page:

1. ✅ Replace `useToast()` → `import { toast } from 'sonner'`
2. ✅ Replace custom `<header>` → `<PageHeader>`
3. ✅ Replace raw `<table>` → `<DataTable>` from data-table/
4. ✅ Replace raw `<Card>` wrappers → SectionCard / StatCard / ListCard / DetailCard
5. ✅ Add TypeScript interfaces for all data types
6. ✅ Add loading / empty / error states
7. ✅ Run `pnpm typecheck` — zero new errors
8. ✅ Remove old `.jsx` file after migration
