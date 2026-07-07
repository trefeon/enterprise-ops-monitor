import type { SimpleColumn, SimplePagination, SimpleDataTableProps } from "./DataTable";

export {
  RawDataTable,
  SimpleDataTable,
  type RawDataTableProps,
  type SimpleColumn,
  type SimplePagination,
  type SimpleDataTableProps,
} from "./DataTable";

// Backward compat type aliases (pre-consolidation names)
export type {
  SimpleColumn as Column,
  SimplePagination as Pagination,
  SimpleDataTableProps as DataTableProps,
};

// Backward compat value aliases
export { RawDataTable as BaseDataTable } from "./DataTable";
export { SimpleDataTable as DataTable } from "./DataTable";
export type { RawDataTableProps as BaseDataTableProps } from "./DataTable";

export { DataTableColumnHeader, type DataTableColumnHeaderProps } from "./DataTableColumnHeader";
export { DataTablePagination, type DataTablePaginationProps } from "./DataTablePagination";
export { DataTableToolbar, type DataTableToolbarProps } from "./DataTableToolbar";
export { EmptyState, type EmptyStateProps } from "./EmptyState";
export { LoadingState, type LoadingStateProps } from "./LoadingState";
export { ErrorState, type ErrorStateProps } from "./ErrorState";
