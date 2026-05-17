import React from 'react';
import { Skeleton } from './skeleton';
import { Button } from './button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './table';
import { Card, CardContent } from '@/components/ui/card';

const DataTable = ({
  columns,
  data,
  loading = false,
  pagination = null,
  onPageChange = null,
  onRowClick = null,
  emptyState = null,
  tableFixed = false,
}) => {
  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="pt-4">
          <Skeleton className="h-6 w-1/4 mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData = Array.isArray(data) && data.length > 0;
  const total = pagination?.total ?? 0;
  const rangeStart = pagination
    ? total === 0
      ? 0
      : (pagination.page - 1) * pagination.pageSize + 1
    : 0;
  const rangeEnd = pagination
    ? total === 0
      ? 0
      : Math.min(pagination.page * pagination.pageSize, total)
    : 0;

  return (
    <Card className="p-0 overflow-hidden flex flex-col">
      <CardContent className="p-0">
        <Table className={tableFixed ? 'table-fixed' : ''}>
          <TableHeader>
            <TableRow>
              {columns.map((col, idx) => (
                <TableHead key={idx} className={col.className || ''}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasData ? (
              data.map((row, rowIdx) => (
                <TableRow key={rowIdx} onClick={onRowClick ? () => onRowClick(row) : null}>
                  {columns.map((col, colIdx) => (
                    <TableCell key={colIdx} className={col.className || ''}>
                      {col.render ? col.render(row) : row[col.accessor]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-muted-foreground py-8"
                >
                  {emptyState || 'No records found.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {pagination && (
          <div className="border-t border-border bg-card px-cell-x py-cell-y flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
            <div className="text-muted-foreground">
              Showing <span className="font-medium text-foreground">{rangeStart}</span> to{' '}
              <span className="font-medium text-foreground">{rangeEnd}</span> of{' '}
              <span className="font-medium text-foreground">{total}</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={pagination.page <= 1}
                onClick={() => onPageChange?.(pagination.page - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={pagination.page * pagination.pageSize >= pagination.total}
                onClick={() => onPageChange?.(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DataTable;
