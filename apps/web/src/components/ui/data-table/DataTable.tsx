// Consolidated DataTable — core TanStack impl + simplified Column API
// Origin: merged from base/base-data-table.tsx + shared/DataTable.tsx

import * as React from "react";
import type { ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";
import { DataTablePagination } from "./DataTablePagination";
import { DataTableToolbar } from "./DataTableToolbar";
import { DataTableColumnHeader } from "./DataTableColumnHeader";

// ─── Raw TanStack Props (was BaseDataTableProps) ───

export interface RawDataTableProps<TData, TValue = unknown> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  error?: ReactNode;
  emptyState?: ReactNode;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  bulkActions?: ReactNode;
  toolbar?: ReactNode;
  enableSearch?: boolean;
  enablePagination?: boolean;
  enableRowSelection?: boolean;
  enableColumnVisibility?: boolean;
  pageSizeOptions?: number[];
  manualPagination?: boolean;
  pageCount?: number;
  rowCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  manualSorting?: boolean;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  manualFiltering?: boolean;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  getRowId?: (row: TData, index: number) => string;
  onRowClick?: (row: TData) => void;
  rowClassName?: (row: TData) => string;
  renderMobileRow?: (row: Row<TData>) => ReactNode;
  mobileCardView?: boolean;
  frame?: "card" | "plain";
  className?: string;
  tableClassName?: string;
}

// ─── Simple Column API (was in shared/DataTable.tsx) ───

export interface SimpleColumn<T> {
  header: string;
  accessor?: keyof T;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  hiddenBelow?: "sm" | "md" | "lg";
  sortable?: boolean;
  sortKey?: string;
}

export interface SimplePagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface SimpleDataTableProps<T> {
  columns: SimpleColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: SimplePagination;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
  keyExtractor: (row: T) => string | number;
  tableFixed?: boolean;
  noCard?: boolean;
  className?: string;
  stickyHeader?: boolean;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  sortBy?: string;
  sortDesc?: boolean;
  onSort?: (key: string, desc: boolean) => void;
  rowClassName?: (row: T) => string;
}

// ─── Helpers ───

function responsiveClass(hiddenBelow?: "sm" | "md" | "lg") {
  if (hiddenBelow === "sm") return "hidden sm:table-cell";
  if (hiddenBelow === "md") return "hidden md:table-cell";
  if (hiddenBelow === "lg") return "hidden lg:table-cell";
  return "";
}

function selectionColumn<TData>(): ColumnDef<TData> {
  return {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
        aria-label="Select all rows"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
        onClick={(event) => event.stopPropagation()}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 36,
  };
}

// ─── Raw DataTable (was BaseDataTable) ───

export function RawDataTable<TData, TValue = unknown>({
  columns,
  data,
  loading = false,
  error,
  emptyState,
  searchPlaceholder,
  filters,
  actions,
  bulkActions,
  toolbar,
  enableSearch = true,
  enablePagination = true,
  enableRowSelection = false,
  enableColumnVisibility = true,
  pageSizeOptions,
  manualPagination = false,
  pageCount,
  rowCount,
  pagination,
  onPaginationChange,
  manualSorting = false,
  sorting,
  onSortingChange,
  manualFiltering = false,
  columnFilters,
  onColumnFiltersChange,
  columnVisibility,
  onColumnVisibilityChange,
  rowSelection,
  onRowSelectionChange,
  getRowId,
  onRowClick,
  rowClassName,
  renderMobileRow,
  mobileCardView = true,
  frame = "card",
  className,
  tableClassName,
}: RawDataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const [internalColumnFilters, setInternalColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [internalColumnVisibility, setInternalColumnVisibility] = React.useState<VisibilityState>({});
  const [internalRowSelection, setInternalRowSelection] = React.useState<RowSelectionState>({});
  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSizeOptions?.[0] ?? 10,
  });
  const [globalFilter, setGlobalFilter] = React.useState("");

  const finalColumns = React.useMemo(
    () => (enableRowSelection ? [selectionColumn<TData>(), ...columns] : columns),
    [columns, enableRowSelection]
  );

  const table = useReactTable({
    data,
    columns: finalColumns,
    getRowId,
    pageCount,
    rowCount,
    manualPagination,
    manualSorting,
    manualFiltering,
    enableRowSelection,
    enableHiding: enableColumnVisibility,
    state: {
      sorting: sorting ?? internalSorting,
      columnFilters: columnFilters ?? internalColumnFilters,
      columnVisibility: columnVisibility ?? internalColumnVisibility,
      rowSelection: rowSelection ?? internalRowSelection,
      pagination: pagination ?? internalPagination,
      globalFilter,
    },
    onSortingChange: onSortingChange ?? setInternalSorting,
    onColumnFiltersChange: onColumnFiltersChange ?? setInternalColumnFilters,
    onColumnVisibilityChange: onColumnVisibilityChange ?? setInternalColumnVisibility,
    onRowSelectionChange: onRowSelectionChange ?? setInternalRowSelection,
    onPaginationChange: onPaginationChange ?? setInternalPagination,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    getFilteredRowModel: manualFiltering ? undefined : getFilteredRowModel(),
    getPaginationRowModel: manualPagination || !enablePagination ? undefined : getPaginationRowModel(),
    getFacetedRowModel: manualFiltering ? undefined : getFacetedRowModel(),
    getFacetedUniqueValues: manualFiltering ? undefined : getFacetedUniqueValues(),
  });

  const visibleRows = table.getRowModel().rows;
  const visibleLeafColumns = table.getVisibleLeafColumns();

  const renderTableBody = () => {
    if (loading && data.length === 0) {
      return Array.from({ length: 5 }).map((_, rowIndex) => (
        <TableRow key={`loading-${rowIndex}`}>
          {visibleLeafColumns.map((column) => (
            <TableCell key={column.id}>
              <div className="h-4 w-3/4 rounded bg-muted" />
            </TableCell>
          ))}
        </TableRow>
      ));
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={visibleLeafColumns.length}>
            <ErrorState description={error} />
          </TableCell>
        </TableRow>
      );
    }

    if (visibleRows.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={visibleLeafColumns.length} className="h-32">
            {emptyState ?? <EmptyState />}
          </TableCell>
        </TableRow>
      );
    }

    return visibleRows.map((row) => (
      <TableRow
        key={row.id}
        data-state={row.getIsSelected() ? "selected" : undefined}
        className={cn(onRowClick && "cursor-pointer", rowClassName?.(row.original))}
        onClick={() => onRowClick?.(row.original)}
      >
        {row.getVisibleCells().map((cell) => (
          <TableCell
            key={cell.id}
            className={(cell.column.columnDef.meta as { className?: string } | undefined)?.className}
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
    if (loading && data.length === 0) return <LoadingState variant="skeleton" />;
    if (error) return <ErrorState description={error} />;
    if (visibleRows.length === 0) return emptyState ?? <EmptyState />;

    return (
      <div className="grid gap-3 sm:hidden">
        {visibleRows.map((row) => (
          <Card
            key={row.id}
            size="sm"
            className={cn(
              onRowClick && "cursor-pointer",
              row.getIsSelected() && "border-primary",
              rowClassName?.(row.original)
            )}
            onClick={() => onRowClick?.(row.original)}
          >
            <CardContent className="grid gap-2 p-4">
              {renderMobileRow
                ? renderMobileRow(row)
                : row.getVisibleCells().map((cell) => {
                    if (cell.column.id === "select") return null;
                    const header = typeof cell.column.columnDef.header === "string" ? cell.column.columnDef.header : cell.column.id;
                    return (
                      <div key={cell.id} className="grid gap-1 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{header}</span>
                        <div className="break-words text-sm">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                      </div>
                    );
                  })}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const content = (
    <>
      {toolbar ??
        (enableSearch || filters || actions || bulkActions ? (
          <DataTableToolbar
            table={table}
            searchPlaceholder={searchPlaceholder}
            filters={filters}
            actions={actions}
            bulkActions={bulkActions}
          />
        ) : null)}
      <div className="relative">
        {loading && data.length > 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/60 backdrop-blur-[1px]">
            <LoadingState label="Refreshing..." className="min-h-20" />
          </div>
        )}
        <div className={cn("hidden overflow-x-auto sm:block", tableClassName)}>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={(header.column.columnDef.meta as { className?: string } | undefined)?.className}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>{renderTableBody()}</TableBody>
          </Table>
        </div>
        {renderMobileCards()}
      </div>
      {enablePagination && <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />}
    </>
  );

  if (frame === "plain") {
    return <div className={cn("overflow-hidden rounded-lg border border-border bg-card", className)}>{content}</div>;
  }

  return (
    <Card className={cn("overflow-hidden p-0", className)}>
      <CardContent className="p-0">{content}</CardContent>
    </Card>
  );
}

// ─── Simple DataTable (was shared/DataTable — wraps RawDataTable with Column API) ───

export function SimpleDataTable<T>({
  columns,
  data,
  loading,
  pagination,
  onPageChange,
  onRowClick,
  emptyState,
  keyExtractor,
  tableFixed = false,
  noCard = false,
  className,
  stickyHeader = false,
  pageSizeOptions = [10, 25, 50, 100],
  onPageSizeChange,
  sortBy,
  sortDesc = false,
  onSort,
  rowClassName,
}: SimpleDataTableProps<T>) {
  const columnDefs = React.useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((column, index) => {
        const id = column.sortKey || (column.accessor ? String(column.accessor) : `column_${index}`);
        return {
          id,
          accessorFn: column.accessor ? (row) => row[column.accessor as keyof T] : undefined,
          header: ({ column: tableColumn }) =>
            column.sortable ? (
              <DataTableColumnHeader column={tableColumn} title={column.header} className={column.className} />
            ) : (
              <span className={cn("text-xs font-semibold text-muted-foreground", column.className)}>
                {column.header}
              </span>
            ),
          cell: ({ row }) => {
            const original = row.original;
            return column.render
              ? column.render(original, row.index)
              : column.accessor
                ? String(original[column.accessor] ?? "")
                : null;
          },
          enableSorting: Boolean(column.sortable),
          enableHiding: Boolean(column.hiddenBelow),
          meta: {
            className: cn(column.className, responsiveClass(column.hiddenBelow)),
          },
        } satisfies ColumnDef<T>;
      }),
    [columns]
  );

  const sorting: SortingState = sortBy ? [{ id: sortBy, desc: sortDesc }] : [];

  const handleSortingChange: OnChangeFn<SortingState> = (updaterOrValue) => {
    const nextSorting =
      typeof updaterOrValue === "function" ? updaterOrValue(sorting) : updaterOrValue;
    const next = nextSorting[0];
    if (next) onSort?.(next.id, next.desc);
  };

  const controlledPagination: PaginationState | undefined = pagination
    ? { pageIndex: Math.max(pagination.page - 1, 0), pageSize: pagination.pageSize }
    : undefined;

  const handlePaginationChange: RawDataTableProps<T>["onPaginationChange"] = (updaterOrValue) => {
    if (!pagination) return;
    const next =
      typeof updaterOrValue === "function" ? updaterOrValue(controlledPagination!) : updaterOrValue;
    if (next.pageIndex !== controlledPagination?.pageIndex) onPageChange?.(next.pageIndex + 1);
    if (next.pageSize !== controlledPagination?.pageSize) onPageSizeChange?.(next.pageSize);
  };

  return (
    <RawDataTable
      columns={columnDefs}
      data={data}
      loading={loading}
      emptyState={emptyState}
      getRowId={(row, index) => {
        const key = keyExtractor(row);
        return key === undefined || key === null || key === "" ? `row_${index}` : String(key);
      }}
      onRowClick={onRowClick}
      rowClassName={rowClassName}
      enableSearch={false}
      enablePagination={Boolean(pagination)}
      manualPagination={Boolean(pagination)}
      pageCount={pagination ? Math.ceil(pagination.total / pagination.pageSize) : undefined}
      rowCount={pagination?.total}
      pagination={controlledPagination}
      onPaginationChange={pagination ? handlePaginationChange : undefined}
      pageSizeOptions={pageSizeOptions}
      manualSorting={Boolean(onSort)}
      sorting={sorting}
      onSortingChange={onSort ? handleSortingChange : undefined}
      frame={noCard ? "plain" : "card"}
      className={className}
      tableClassName={cn(tableFixed && "[&_table]:table-fixed", stickyHeader && "[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10")}
    />
  );
}

// ─── Aliases for backward compat ───
export const BaseDataTable = RawDataTable;
export const DataTable = SimpleDataTable;
export default DataTable;
export type { RawDataTableProps as BaseDataTableProps };
