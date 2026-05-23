import { useMemo } from "react";
import type { ReactNode } from "react";
import type { ColumnDef, OnChangeFn, PaginationState, SortingState } from "@tanstack/react-table";
import {
  BaseDataTable,
  BaseDataTableColumnHeader,
  type BaseDataTableProps,
} from "@/components/base";
import { cn } from "@/lib/utils";

export interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  hiddenBelow?: "sm" | "md" | "lg";
  sortable?: boolean;
  sortKey?: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: Pagination;
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

function responsiveClass(hiddenBelow?: "sm" | "md" | "lg") {
  if (hiddenBelow === "sm") return "hidden sm:table-cell";
  if (hiddenBelow === "md") return "hidden md:table-cell";
  if (hiddenBelow === "lg") return "hidden lg:table-cell";
  return "";
}

export function DataTable<T>({
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
}: DataTableProps<T>) {
  const columnDefs = useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((column, index) => {
        const id = column.sortKey || (column.accessor ? String(column.accessor) : `column_${index}`);
        return {
          id,
          accessorFn: column.accessor ? (row) => row[column.accessor as keyof T] : undefined,
          header: ({ column: tableColumn }) =>
            column.sortable ? (
              <BaseDataTableColumnHeader column={tableColumn} title={column.header} className={column.className} />
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

  const handlePaginationChange: BaseDataTableProps<T>["onPaginationChange"] = (updaterOrValue) => {
    if (!pagination) return;
    const next =
      typeof updaterOrValue === "function" ? updaterOrValue(controlledPagination!) : updaterOrValue;
    if (next.pageIndex !== controlledPagination?.pageIndex) onPageChange?.(next.pageIndex + 1);
    if (next.pageSize !== controlledPagination?.pageSize) onPageSizeChange?.(next.pageSize);
  };

  return (
    <BaseDataTable
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

export default DataTable;
