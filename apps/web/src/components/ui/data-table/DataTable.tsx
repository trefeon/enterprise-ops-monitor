import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  getExpandedRowModel,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  type OnChangeFn,
  flexRender,
} from '@tanstack/react-table';
import { Download, Loader2 } from 'lucide-react';

import {
  Table as ShadcnTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

import { DataTablePagination } from './DataTablePagination';
import { DataTableToolbar } from './DataTableToolbar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DataTableProps<TData extends Record<string, unknown>> {
  columns: ColumnDef<TData>[];
  data: TData[];
  loading?: boolean;
  emptyState?: ReactNode;
  /**
   * If true, use server-side pagination/sorting/filtering.
   * Client-managed state handlers are still called so the consumer can fetch
   * the correct slice of data.
   */
  serverSide?: boolean;
  /** Current page index (0-based) for server-side mode */
  pageIndex?: number;
  /** Total row count for server-side mode */
  totalRows?: number;
  onPageChange?: (pageIndex: number) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  onSortingChange?: OnChangeFn<SortingState>;
  sortBy?: SortingState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  columnFilters?: ColumnFiltersState;
  onRowClick?: (row: TData) => void;
  keyExtractor?: (row: TData) => string | number;
  className?: string;
  noCard?: boolean;
  mobileCardView?: boolean;
  toolbar?: ReactNode;
  exportable?: boolean;
  /** Enable row selection checkboxes */
  selectable?: boolean;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  rowSelection?: RowSelectionState;
  /** Initial column visibility */
  columnVisibility?: VisibilityState;
}

// ---------------------------------------------------------------------------
// CSV export helper
// ---------------------------------------------------------------------------

function exportToCsv<TData extends Record<string, unknown>>(
  columns: ColumnDef<TData>[],
  data: TData[],
  filename = 'export.csv',
) {
  const headers = columns
    .filter((col) => col.id !== 'select')
    .map((col) => {
      if (typeof col.header === 'string') return col.header;
      return col.id ?? '';
    });

  const rows = data.map((row) =>
    columns
      .filter((col) => col.id !== 'select')
      .map((col) => {
        const val = row[col.id as keyof TData];
        if (val == null) return '';
        const str = String(val);
        // Escape CSV: wrap in quotes if contains comma, quote, or newline
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(','),
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ---------------------------------------------------------------------------
// Selection column helper
// ---------------------------------------------------------------------------

function getSelectColumn<TData extends Record<string, unknown>>(): ColumnDef<TData> {
  return {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        onClick={(e) => e.stopPropagation()}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DataTable<TData extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyState,
  serverSide = false,
  pageIndex = 0,
  totalRows,
  onPageChange,
  pageSize = 10,
  onPageSizeChange,
  onSortingChange,
  sortBy: externalSortBy,
  onColumnFiltersChange,
  columnFilters: externalColumnFilters,
  onRowClick,
  keyExtractor,
  className,
  noCard = false,
  mobileCardView = true,
  toolbar,
  exportable = false,
  selectable = false,
  onRowSelectionChange,
  rowSelection: externalRowSelection,
  columnVisibility: initialColumnVisibility,
}: DataTableProps<TData>) {
  // ---- Internal state (client-mode) ----
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [internalColumnFilters, setInternalColumnFilters] = useState<ColumnFiltersState>([]);
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({});
  const [internalColumnVisibility, setInternalColumnVisibility] = useState<VisibilityState>(
    initialColumnVisibility ?? {},
  );
  const [globalFilter, setGlobalFilter] = useState('');

  // ---- Resolve state sources ----
  const sorting = serverSide && externalSortBy ? externalSortBy : internalSorting;
  const columnFilters =
    serverSide && externalColumnFilters ? externalColumnFilters : internalColumnFilters;
  const rowSelection =
    serverSide && externalRowSelection ? externalRowSelection : internalRowSelection;

  // ---- Resolve state setters ----
  const handleSortingChange: OnChangeFn<SortingState> = useCallback(
    (updaterOrValue) => {
      if (serverSide && onSortingChange) {
        onSortingChange(updaterOrValue);
      } else {
        setInternalSorting(updaterOrValue);
      }
    },
    [serverSide, onSortingChange],
  );

  const handleColumnFiltersChange: OnChangeFn<ColumnFiltersState> = useCallback(
    (updaterOrValue) => {
      if (serverSide && onColumnFiltersChange) {
        onColumnFiltersChange(updaterOrValue);
      } else {
        setInternalColumnFilters(updaterOrValue);
      }
    },
    [serverSide, onColumnFiltersChange],
  );

  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = useCallback(
    (updaterOrValue) => {
      if (serverSide && onRowSelectionChange) {
        onRowSelectionChange(updaterOrValue);
      } else {
        setInternalRowSelection(updaterOrValue);
      }
    },
    [serverSide, onRowSelectionChange],
  );

  // ---- Build final columns ----
  const finalColumns = useMemo(() => {
    if (selectable) {
      return [getSelectColumn<TData>(), ...columns];
    }
    return columns;
  }, [selectable, columns]);

  // ---- Row ID getter ----
  const getRowId = useCallback(
    (row: TData) => {
      if (keyExtractor) return String(keyExtractor(row));
      return (row.id as string) ?? (row._id as string) ?? crypto.randomUUID();
    },
    [keyExtractor],
  );

  // ---- Create TanStack table ----
  const table = useReactTable<TData>({
    data,
    columns: finalColumns,
    getRowId,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
      columnVisibility: internalColumnVisibility,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: handleRowSelectionChange,
    onColumnVisibilityChange: setInternalColumnVisibility,
    // Client-mode: TanStack manages pagination. Server-mode: consumer controls it.
    manualPagination: serverSide,
    pageCount: serverSide && totalRows != null ? Math.ceil(totalRows / pageSize) : undefined,
    manualSorting: serverSide,
    manualFiltering: serverSide,
    enableRowSelection: selectable,
    enableMultiRowSelection: selectable,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: serverSide ? undefined : getFilteredRowModel(),
    getPaginationRowModel: serverSide ? undefined : getPaginationRowModel(),
    getSortedRowModel: serverSide ? undefined : getSortedRowModel(),
    getFacetedRowModel: serverSide ? undefined : getFacetedRowModel(),
    getFacetedUniqueValues: serverSide ? undefined : getFacetedUniqueValues(),
    getFacetedMinMaxValues: serverSide ? undefined : getFacetedMinMaxValues(),
    getExpandedRowModel: getExpandedRowModel(),
    // In server-side mode, pagination callbacks trigger consumer fetches
    onPaginationChange: serverSide
      ? (updater) => {
          const current = { pageIndex, pageSize };
          const next =
            typeof updater === 'function' ? updater(current) : updater;
          if (next.pageIndex !== pageIndex && onPageChange) {
            onPageChange(next.pageIndex);
          }
          if (next.pageSize !== pageSize && onPageSizeChange) {
            onPageSizeChange(next.pageSize);
          }
        }
      : undefined,
  });

  // ---- CSV export handler ----
  const handleExport = useCallback(() => {
    exportToCsv(columns, data, `data-export-${Date.now()}.csv`);
  }, [columns, data]);

  // ---- Render helpers ----

  const renderTableBody = () => {
    if (loading && data.length === 0) {
      return Array.from({ length: 5 }).map((_, rowIdx) => (
        <TableRow key={`skeleton-${rowIdx}`}>
          {table.getVisibleFlatColumns().map((col) => (
            <TableCell
              key={col.id}
              style={{ width: col.getSize() !== 150 ? col.getSize() : undefined }}
            >
              <Skeleton className="h-4 w-3/4 bg-muted/60" />
            </TableCell>
          ))}
        </TableRow>
      ));
    }

    if (!loading && table.getRowModel().rows.length === 0) {
      return (
        <TableRow>
          <TableCell
            colSpan={table.getVisibleFlatColumns().length}
            className="h-32 text-center text-muted-foreground"
          >
            {emptyState ?? 'No records found.'}
          </TableCell>
        </TableRow>
      );
    }

    return table.getRowModel().rows.map((row) => (
      <TableRow
        key={row.id}
        data-state={row.getIsSelected() && 'selected'}
        onClick={() => {
          if (onRowClick) onRowClick(row.original);
        }}
        className={cn(
          onRowClick && 'cursor-pointer',
        )}
      >
        {row.getVisibleCells().map((cell) => (
          <TableCell
            key={cell.id}
            style={{ width: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined }}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  const renderMobileCards = () => {
    if (!mobileCardView) return null;

    if (loading && data.length === 0) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Card key={idx} size="sm" className="bg-card">
              <CardContent className="space-y-3 p-4">
                {table.getVisibleFlatColumns().map((col) => {
                  if (col.id === 'select') return null;
                  const headerText =
                    typeof col.columnDef.header === 'string'
                      ? col.columnDef.header
                      : col.id;
                  return (
                    <div
                      key={col.id}
                      className="flex flex-col gap-1 border-b border-border/50 pb-2 last:border-0 last:pb-0"
                    >
                      <Skeleton className="h-3 w-1/3 bg-muted/60" />
                      <Skeleton className="h-4 w-3/4 bg-muted/60" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (!loading && table.getRowModel().rows.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {emptyState ?? 'No records found.'}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {table.getRowModel().rows.map((row) => (
          <Card
            key={row.id}
            size="sm"
            onClick={() => {
              if (onRowClick) onRowClick(row.original);
            }}
            className={cn(
              'bg-card',
              onRowClick && 'cursor-pointer',
              row.getIsSelected() && 'border-primary',
            )}
          >
            <CardContent className="space-y-3 p-4">
              {row.getVisibleCells().map((cell) => {
                if (cell.column.id === 'select') return null;
                const headerText =
                  typeof cell.column.columnDef.header === 'string'
                    ? cell.column.columnDef.header
                    : cell.column.id;
                return (
                  <div
                    key={cell.id}
                    className="flex flex-col gap-1 border-b border-border/50 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {headerText}
                    </span>
                    <div className="break-all text-sm text-foreground">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // ---- Main render ----
  const tableElement = (
    <>
      {/* Toolbar */}
      {toolbar ?? <DataTableToolbar table={table} />}

      {/* Desktop table */}
      {exportable && (
        <div className="flex justify-end px-4 pb-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleExport}
          >
            <Download className="mr-1.5 size-3.5" />
            Export CSV
          </Button>
        </div>
      )}

      {/* Loading overlay */}
      <div className="relative">
        {loading && data.length > 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/60 backdrop-blur-[1px]">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Table view (desktop) */}
        <div className="hidden sm:block">
          <ShadcnTable>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{
                        width: header.getSize() !== 150 ? header.getSize() : undefined,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>{renderTableBody()}</TableBody>
          </ShadcnTable>
        </div>

        {/* Mobile card view */}
        {mobileCardView && <div className="block sm:hidden">{renderMobileCards()}</div>}
      </div>

      {/* Pagination */}
      <DataTablePagination table={table} />
    </>
  );

  if (noCard) {
    return (
      <div className={cn('flex flex-col rounded-lg border border-border bg-card', className)}>
        {tableElement}
      </div>
    );
  }

  return (
    <Card className={cn('flex flex-col overflow-hidden p-0', className)}>
      <CardContent className="flex flex-col p-0">{tableElement}</CardContent>
    </Card>
  );
}
