import type { Table } from "@tanstack/react-table";
import { ListFilter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  bulkActions?: ReactNode;
}

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder = "Search…",
  filters,
  actions,
  bulkActions,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().globalFilter !== "";
  const hasSelection = table.getFilteredSelectedRowModel().rows.length > 0;

  return (
    <div className={cn("flex flex-wrap items-center gap-2 px-card py-3")}>
      {hasSelection && bulkActions ? (
        <div className="flex items-center gap-2">{bulkActions}</div>
      ) : (
        <>
          <div className="relative flex-1 min-w-48">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              value={table.getState().globalFilter ?? ""}
              onChange={(e) => table.setGlobalFilter(e.target.value)}
              className="h-9 pl-8 pr-8 text-sm"
            />
            {isFiltered && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Clear search filter"
                className="absolute right-1 top-1/2 size-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => table.setGlobalFilter("")}
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>
          {filters}
        </>
      )}
      <div className="flex items-center gap-2">
        {actions}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button type="button" variant="outline" size="sm">
                <ListFilter data-icon="inline-start" />
                Columns
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table.getAllColumns().filter((c) => c.getCanHide()).map((column) => {
                const label = typeof column.columnDef.header === "string" ? column.columnDef.header : column.id;
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(checked) => column.toggleVisibility(Boolean(checked))}
                  >
                    {label}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
