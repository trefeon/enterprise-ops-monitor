import type { ReactNode } from "react";
import type { Table } from "@tanstack/react-table";
import { BaseToolbar } from "./base-toolbar";
import { BaseDataTableViewOptions } from "./base-data-table-view-options";

export interface BaseDataTableToolbarProps<TData> {
  table: Table<TData>;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  bulkActions?: ReactNode;
  className?: string;
}

export function BaseDataTableToolbar<TData>({
  table,
  searchPlaceholder = "Search...",
  filters,
  actions,
  bulkActions,
  className,
}: BaseDataTableToolbarProps<TData>) {
  return (
    <BaseToolbar
      className={className}
      searchValue={(table.getState().globalFilter as string) ?? ""}
      searchPlaceholder={searchPlaceholder}
      onSearchChange={(value) => table.setGlobalFilter(value)}
      filters={filters}
      bulkActions={bulkActions}
      viewOptions={
        <div className="flex items-center gap-2">
          {actions}
          <BaseDataTableViewOptions table={table} />
        </div>
      }
      activeFilterCount={table.getState().columnFilters.length}
      onClearFilters={() => {
        table.resetColumnFilters();
        table.setGlobalFilter("");
      }}
    />
  );
}
