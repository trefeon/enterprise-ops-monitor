# Table Standard

## Rule

All app tables must use `BaseDataTable<TData, TValue>` directly or through `@/components/shared/DataTable`. Do not add raw `<table>` markup outside `components/ui/table.tsx` or `components/base/base-data-table.tsx`.

## Basic Usage

```tsx
import type { ColumnDef } from '@tanstack/react-table';
import { BaseDataTable, BaseDataTableColumnHeader } from '@/components/base';

type StoreRow = {
  id: string;
  name: string;
  status: string;
};

const columns: ColumnDef<StoreRow>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <BaseDataTableColumnHeader column={column} title="Store" />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge>{row.original.status}</StatusBadge>,
  },
];

<BaseDataTable columns={columns} data={rows} getRowId={(row) => row.id} />;
```

## Sorting

Use `BaseDataTableColumnHeader` for sortable columns. Disable sorting on action, badge-only, and selection columns.

```tsx
{
  accessorKey: 'updatedAt',
  header: ({ column }) => <BaseDataTableColumnHeader column={column} title="Updated" />,
}
```

## Row Actions

Use `rowActions` for repeated per-row menus.

```tsx
<BaseDataTable
  columns={columns}
  data={rows}
  rowActions={[
    { label: 'Open', icon: ExternalLink, onSelect: (row) => open(row) },
    { label: 'Disable', variant: 'destructive', onSelect: disable },
  ]}
/>
```

## Filters And Search

Use `searchValue`, `onSearchChange`, `searchPlaceholder`, and `toolbar` slots for global search and filters. Keep server query state in the page.

```tsx
<BaseDataTable
  columns={columns}
  data={rows}
  searchValue={query}
  onSearchChange={setQuery}
  toolbar={<BaseToolbar filters={<StatusFilter value={status} onChange={setStatus} />} />}
/>
```

## Bulk Actions

Enable row selection and pass `bulkActions`.

```tsx
<BaseDataTable
  columns={columns}
  data={rows}
  enableRowSelection
  bulkActions={[
    { label: 'Export selected', icon: Download, onSelect: exportRows },
  ]}
/>
```

## Pagination

Use client pagination by default. For API-backed tables, pass server pagination state and callbacks.

```tsx
<BaseDataTable
  columns={columns}
  data={rows}
  manualPagination
  pageCount={pageCount}
  pagination={pagination}
  onPaginationChange={setPagination}
/>
```

## Loading, Empty, Error

```tsx
<BaseDataTable
  columns={columns}
  data={rows}
  loading={loading}
  error={error}
  emptyTitle="No stores found"
  emptyDescription="Adjust filters and try again."
/>
```

## Migration Checklist

1. Define `ColumnDef<T>[]`.
2. Move cell rendering into `cell`.
3. Add `getRowId` for stable API IDs.
4. Move search/filter controls to `BaseDataTableToolbar` or `BaseToolbar`.
5. Wire server pagination with zero-based table state and one-based API state at the wrapper boundary.
6. Remove raw table markup.
