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
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

interface DataTableProps<T> {
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
}: DataTableProps<T>) {
  const content = (
    <div className={cn('relative overflow-x-auto rounded-lg border border-border bg-card', className)}>
      <Table className={tableFixed ? 'table-fixed' : ''}>
        <TableHeader>
          <TableRow>
            {columns.map((col, idx) => (
              <TableHead key={idx} className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-32 text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading data...
                </div>
              </TableCell>
            </TableRow>
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
                className={onRowClick ? 'cursor-pointer' : ''}
              >
                {columns.map((col, idx) => (
                  <TableCell key={idx} className={col.className}>
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

      {pagination && (
        <div
          className={cn(
            'flex flex-col gap-3 border-t bg-card px-4 py-3 font-mono text-xs sm:flex-row sm:items-center sm:justify-between',
            noCard && 'rounded-b-lg'
          )}
        >
          <div className="text-muted-foreground">
            {pagination.total > 0 ? (
              <>
                Showing{' '}
                <span className="font-medium text-foreground">
                  {(pagination.page - 1) * pagination.pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium text-foreground">
                  {Math.min(pagination.page * pagination.pageSize, pagination.total)}
                </span>{' '}
                of <span className="font-medium text-foreground">{pagination.total}</span> records
              </>
            ) : (
              'No records to show'
            )}
          </div>
          <div className="flex w-full justify-end gap-1 sm:w-auto">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
            >
              <ChevronLeft className="size-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              disabled={pagination.page * pagination.pageSize >= pagination.total}
              onClick={() => onPageChange?.(pagination.page + 1)}
            >
              Next
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (noCard) return content;

  return (
    <Card className="flex flex-col overflow-hidden p-0">
      <CardContent className="p-0">{content}</CardContent>
    </Card>
  );
}
