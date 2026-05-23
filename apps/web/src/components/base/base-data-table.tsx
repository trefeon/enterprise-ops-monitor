import * as React from "react";
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
import { BaseEmptyState } from "./base-empty-state";
import { BaseErrorState } from "./base-error-state";
import { BaseLoadingState } from "./base-loading-state";
import { BaseDataTablePagination } from "./base-data-table-pagination";
import { BaseDataTableToolbar } from "./base-data-table-toolbar";

export interface BaseDataTableProps<TData, TValue = unknown> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  error?: React.ReactNode;
  emptyState?: React.ReactNode;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  bulkActions?: React.ReactNode;
  toolbar?: React.ReactNode;
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
  renderMobileRow?: (row: Row<TData>) => React.ReactNode;
  mobileCardView?: boolean;
  frame?: "card" | "plain";
  className?: string;
  tableClassName?: string;
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

export function BaseDataTable<TData, TValue = unknown>({
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
}: BaseDataTableProps<TData, TValue>) {
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
            <BaseErrorState description={error} />
          </TableCell>
        </TableRow>
      );
    }

    if (visibleRows.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={visibleLeafColumns.length} className="h-32">
            {emptyState ?? <BaseEmptyState />}
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
    if (loading && data.length === 0) return <BaseLoadingState variant="skeleton" />;
    if (error) return <BaseErrorState description={error} />;
    if (visibleRows.length === 0) return emptyState ?? <BaseEmptyState />;

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
            <BaseDataTableToolbar
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
              <BaseLoadingState label="Refreshing..." className="min-h-20" />
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
      {enablePagination && <BaseDataTablePagination table={table} pageSizeOptions={pageSizeOptions} />}
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
