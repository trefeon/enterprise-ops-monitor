import type { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (row: T) => ReactNode;
  className?: string;
  hiddenBelow?: 'sm' | 'md' | 'lg';
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

const getResponsiveClass = (hiddenBelow?: 'sm' | 'md' | 'lg') => {
  if (!hiddenBelow) return '';
  if (hiddenBelow === 'sm') return 'hidden sm:table-cell';
  if (hiddenBelow === 'md') return 'hidden md:table-cell';
  if (hiddenBelow === 'lg') return 'hidden lg:table-cell';
  return '';
};

const getHeaderAlignmentClass = (className?: string) => {
  if (!className) return 'justify-start text-left';
  if (className.includes('text-right')) return 'justify-end text-right';
  if (className.includes('text-center')) return 'justify-center text-center';
  return 'justify-start text-left';
};

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
  const handleSort = (col: Column<T>) => {
    if (!col.sortable || !onSort) return;
    const key = col.sortKey || String(col.accessor || '');
    if (!key) return;
    const isDesc = sortBy === key ? !sortDesc : false;
    onSort(key, isDesc);
  };

  const renderSortIcon = (col: Column<T>) => {
    if (!col.sortable) return null;
    const key = col.sortKey || String(col.accessor || '');
    if (sortBy !== key)
      return <ArrowUpDown className="ml-1.5 size-3.5 text-muted-foreground shrink-0" />;
    return sortDesc ? (
      <ArrowDown className="ml-1.5 size-3.5 text-foreground shrink-0" />
    ) : (
      <ArrowUp className="ml-1.5 size-3.5 text-foreground shrink-0" />
    );
  };

  const tableContent = (
    <div
      className={cn(
        'hidden sm:block relative overflow-x-auto border-border bg-card',
        noCard ? 'rounded-lg border' : '',
        className
      )}
    >
      <Table className={tableFixed ? 'table-fixed' : ''}>
        <TableHeader className={stickyHeader ? 'sticky top-0 bg-card z-10 shadow-sm' : ''}>
          <TableRow>
            {columns.map((col, idx) => (
              <TableHead
                key={idx}
                className={cn(
                  col.className,
                  getResponsiveClass(col.hiddenBelow),
                  col.sortable &&
                    'cursor-pointer select-none hover:bg-muted/50 hover:text-foreground'
                )}
                onClick={() => handleSort(col)}
              >
                <div
                  className={cn(
                    'flex items-center font-semibold',
                    getHeaderAlignmentClass(col.className)
                  )}
                >
                  {col.header}
                  {renderSortIcon(col)}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, rIdx) => (
              <TableRow key={rIdx}>
                {columns.map((col, cIdx) => (
                  <TableCell
                    key={cIdx}
                    className={cn(col.className, getResponsiveClass(col.hiddenBelow))}
                  >
                    <Skeleton className="h-4 w-3/4 bg-muted/60" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-32 text-center text-muted-foreground"
              >
                {emptyState ?? 'No records found.'}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow
                key={keyExtractor(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  onRowClick && 'cursor-pointer hover:bg-muted/40 transition-colors',
                  rowClassName?.(row)
                )}
              >
                {columns.map((col, idx) => (
                  <TableCell
                    key={idx}
                    className={cn(col.className, getResponsiveClass(col.hiddenBelow))}
                  >
                    {col.render
                      ? col.render(row)
                      : col.accessor
                        ? String(row[col.accessor] ?? '')
                        : null}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  const cardContent = (
    <div className="block p-4 sm:hidden">
      {loading ? (
        Array.from({ length: 3 }).map((_, rIdx) => (
          <div key={rIdx} className="mb-3 rounded-lg border border-border bg-background/40 p-4 last:mb-0">
            <div className="grid gap-3">
              {columns.map((col, cIdx) => {
                if (col.hiddenBelow) return null;
                return (
                  <div
                    key={cIdx}
                    className="flex flex-col gap-1 border-b border-border/50 pb-2 last:border-0 last:pb-0"
                  >
                    <Skeleton className="h-3.5 w-1/4 bg-muted/60" />
                    <Skeleton className="h-4.5 w-3/4 bg-muted/60" />
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ) : data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {emptyState ?? 'No records found.'}
        </div>
      ) : (
        data.map((row) => (
          <article
            key={keyExtractor(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              'mb-3 rounded-lg border border-border bg-background/40 p-4 last:mb-0',
              onRowClick && 'cursor-pointer transition-colors hover:bg-muted/30 active:bg-muted/40',
              rowClassName?.(row)
            )}
            tabIndex={onRowClick ? 0 : undefined}
            role={onRowClick ? 'button' : undefined}
            onKeyDown={
              onRowClick
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onRowClick(row);
                    }
                  }
                : undefined
            }
          >
            <div className="grid gap-3">
              {columns.map((col, cIdx) => {
                if (col.hiddenBelow) return null;
                return (
                  <div
                    key={cIdx}
                    className="flex flex-col gap-1 border-b border-border/50 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {col.header}
                    </span>
                    <div className="text-sm font-mono break-all text-foreground">
                      {col.render
                        ? col.render(row)
                        : col.accessor
                          ? String(row[col.accessor] ?? '')
                          : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))
      )}
    </div>
  );

  const renderPagination = () => {
    if (!pagination) return null;

    return (
      <div
        className={cn(
          'flex flex-col gap-4 border-t border-border bg-card px-4 py-3 font-mono text-xs sm:flex-row sm:items-center sm:justify-between',
          noCard && 'rounded-b-lg'
        )}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-muted-foreground">
          <div>
            {pagination.total > 0 ? (
              <>
                Showing{' '}
                <span className="font-semibold text-foreground">
                  {(pagination.page - 1) * pagination.pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-foreground">
                  {Math.min(pagination.page * pagination.pageSize, pagination.total)}
                </span>{' '}
                of <span className="font-semibold text-foreground">{pagination.total}</span> records
              </>
            ) : (
              'No records to show'
            )}
          </div>

          {onPageSizeChange && pageSizeOptions.length > 0 && (
            <div className="flex items-center gap-2">
              <span>Show</span>
              <Select
                value={String(pagination.pageSize)}
                onValueChange={(val) => onPageSizeChange(Number(val))}
              >
                <SelectTrigger
                  size="sm"
                  className="h-7 w-[70px] border-border bg-card font-mono text-xs"
                >
                  <SelectValue placeholder={String(pagination.pageSize)} />
                </SelectTrigger>
                <SelectContent align="start">
                  {pageSizeOptions.map((opt) => (
                    <SelectItem key={opt} value={String(opt)}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>per page</span>
            </div>
          )}
        </div>

        <div className="flex w-full justify-end gap-1 sm:w-auto">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 font-semibold"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange?.(pagination.page - 1)}
          >
            <ChevronLeft className="size-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 font-semibold"
            disabled={pagination.page * pagination.pageSize >= pagination.total}
            onClick={() => onPageChange?.(pagination.page + 1)}
          >
            Next
            <ChevronRight className="size-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  };

  if (noCard) {
    return (
      <div className="flex flex-col bg-card rounded-lg border border-border">
        {tableContent}
        {cardContent}
        {renderPagination()}
      </div>
    );
  }

  return (
    <Card className="flex flex-col overflow-hidden p-0 bg-card border-border">
      <CardContent className="p-0 flex flex-col">
        {tableContent}
        {cardContent}
        {renderPagination()}
      </CardContent>
    </Card>
  );
}
