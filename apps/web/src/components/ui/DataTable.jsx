import React from 'react';
import { Skeleton } from './Skeleton';
import Button from './Button';
import Card from './Card';
import { Table, Thead, Trow, Tcell, TableEmpty, TableFooter } from './Table';

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
        <Skeleton className="h-6 w-1/4 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
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
    <Card variant="table" className="flex flex-col">
      <Table className={tableFixed ? 'table-fixed' : ''}>
        <Thead>
          {columns.map((col, idx) => (
            <Tcell key={idx} as="th" className={col.className || ''}>
              {col.header}
            </Tcell>
          ))}
        </Thead>
        <tbody>
          {hasData ? (
            data.map((row, rowIdx) => (
              <Trow key={rowIdx} onClick={onRowClick ? () => onRowClick(row) : null}>
                {columns.map((col, colIdx) => (
                  <Tcell key={colIdx} className={col.className || ''}>
                    {col.render ? col.render(row) : row[col.accessor]}
                  </Tcell>
                ))}
              </Trow>
            ))
          ) : (
            <TableEmpty colSpan={columns.length}>{emptyState || 'No records found.'}</TableEmpty>
          )}
        </tbody>
      </Table>

      {pagination && (
        <TableFooter>
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
        </TableFooter>
      )}
    </Card>
  );
};

export default DataTable;
