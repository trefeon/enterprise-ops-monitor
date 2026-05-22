import { useMemo } from 'react';
import type { Table } from '@tanstack/react-table';
import { ListFilter, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  className?: string;
}

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder = 'Search...',
  filters,
  className,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  // Column visibility toggle state
  const allColumns = useMemo(
    () => table.getAllColumns().filter((col) => col.getCanHide()),
    [table]
  );

  const hiddenCount = useMemo(
    () => allColumns.filter((col) => !col.getIsVisible()).length,
    [allColumns]
  );

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 px-4 py-3',
        className
      )}
    >
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {/* Global search */}
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={(table.getState().globalFilter as string) ?? ''}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>

        {/* Custom filters */}
        {filters}

        {/* Clear filters */}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => {
              table.resetColumnFilters();
              table.setGlobalFilter('');
            }}
          >
            <X className="mr-1 size-3.5" />
            Reset
          </Button>
        )}
      </div>

      {/* Column visibility toggle */}
      {allColumns.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" className="ml-auto h-8 text-xs">
                <ListFilter className="mr-1.5 size-3.5" />
                Columns
                {hiddenCount > 0 && (
                  <span className="ml-1.5 rounded-sm bg-muted-foreground/20 px-1 text-[10px] font-medium">
                    {hiddenCount} hidden
                  </span>
                )}
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider">
              Toggle columns
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {allColumns.map((column) => {
              const headerText =
                typeof column.columnDef.header === 'string'
                  ? column.columnDef.header
                  : column.id;

              return (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(checked) => column.toggleVisibility(checked)}
                >
                  {headerText}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
