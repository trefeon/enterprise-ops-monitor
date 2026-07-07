import type { ComponentType, ReactNode } from "react";
import type { Table } from "@tanstack/react-table";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { BaseDataTableViewOptions } from "./base-data-table-view-options";

export interface BaseDataTableToolbarProps<TData> {
  table: Table<TData>;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  bulkActions?: ReactNode;
  className?: string;
}

interface ToolbarAction {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  disabled?: boolean;
}

function ToolbarButton({ action }: { action: ToolbarAction }) {
  const Icon = action.icon;
  return (
    <Button
      type="button"
      variant={action.variant ?? "outline"}
      size="sm"
      onClick={action.onClick}
      disabled={action.disabled}
    >
      {Icon && <Icon data-icon="inline-start" />}
      {action.label}
    </Button>
  );
}

export function BaseDataTableToolbar<TData>({
  table,
  searchPlaceholder = "Search...",
  filters,
  actions,
  bulkActions,
  className,
}: BaseDataTableToolbarProps<TData>) {
  const searchValue = (table.getState().globalFilter as string) ?? "";
  const onSearchChange = (value: string) => table.setGlobalFilter(value);
  const activeFilterCount = table.getState().columnFilters.length;
  const onClearFilters = () => {
    table.resetColumnFilters();
    table.setGlobalFilter("");
  };

  return (
    <div className={cn("flex flex-col gap-3 rounded-lg border border-border bg-card p-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-0 sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 pl-8"
              aria-label={searchPlaceholder}
            />
          </div>
          {filters}
          {activeFilterCount > 0 && (
            <Badge variant="secondary">{activeFilterCount} active</Badge>
          )}
          {activeFilterCount > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={onClearFilters}>
              <X data-icon="inline-start" />
              Clear
            </Button>
          )}
        </div>
        {(bulkActions || actions) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {bulkActions}
            {bulkActions && actions && <Separator orientation="vertical" className="hidden h-6 sm:block" />}
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
                <BaseDataTableViewOptions table={table} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
