import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatTime } from '@/lib/date';
import type { Column } from '@/components/shared/DataTable';
import type { EODStore, StatusStyle } from './types';

const STATUS_STYLES: Record<string, StatusStyle> = {
  done: { label: 'Done', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  failed: { label: 'Failed', variant: 'destructive' },
};

const DEFAULT_STATUS: StatusStyle = { label: 'Pending', variant: 'warning' };

export function getStatusConfig(status: unknown): StatusStyle {
  const key = status ? String(status).toLowerCase() : 'pending';
  return STATUS_STYLES[key] || DEFAULT_STATUS;
}

export function formatSourceLabel(source: unknown): string {
  if (!source) return '-';
  const value = String(source).toLowerCase();
  if (value === 'api') return 'API';
  if (value === 'bot') return 'Bot';
  if (value === 'db') return 'DB';
  if (value === 'manual') return 'Manual';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const BRANCH_OPTIONS = [
  { id: '2', label: 'NORTH HUB' },
  { id: '3', label: 'EAST HUB' },
  { id: '4', label: 'CENTRAL HUB' },
  { id: '5', label: 'COASTAL HUB' },
  { id: '6', label: 'HIGHLAND HUB' },
  { id: '7', label: 'WEST HUB' },
  { id: '8', label: 'RIVER HUB' },
  { id: '9', label: 'SOUTH HUB' },
];

export const STATUS_OPTIONS = [
  { value: '', label: 'Status: All' },
  { value: 'done', label: 'Done' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
];

export const mainTableColumns: Column<EODStore>[] = [
  {
    header: 'Store Code',
    accessor: 'storeCode',
    className: 'text-right font-mono font-medium text-foreground w-28',
  },
  {
    header: 'Store Name',
    accessor: 'storeName',
    className: 'font-medium text-foreground min-w-48',
  },
  {
    header: 'Branch',
    accessor: 'areaName',
    render: (row) => row.areaName || row.areaId || '-',
    className: 'text-muted-foreground w-32',
  },
  {
    header: 'Status',
    accessor: 'status',
    render: (row) => {
      const statusConfig = getStatusConfig(row.status);
      return <StatusBadge variant={statusConfig.variant}>{statusConfig.label}</StatusBadge>;
    },
    className: 'text-center w-24',
  },
  {
    header: 'Last EOD',
    accessor: 'lastEodAt',
    render: (row) => formatTime(row.lastEodAt),
    className: 'font-mono text-muted-foreground text-center w-36',
  },
  {
    header: 'Source',
    accessor: 'source',
    render: (row) => formatSourceLabel(row.source),
    className: 'text-muted-foreground text-center w-20',
  },
  {
    header: 'Error Message',
    accessor: 'errorMessage',
    render: (row) => (
      <span
        className={
          row.errorMessage ? 'text-status-error font-medium' : 'text-muted-foreground'
        }
        title={row.errorMessage || '-'}
      >
        {row.errorMessage || '-'}
      </span>
    ),
    className: 'max-w-xs break-words',
  },
];

export const branchStoresColumns: Column<EODStore>[] = [
  {
    header: 'Store Code',
    accessor: 'storeCode',
    className: 'font-mono text-sm text-right w-28',
  },
  {
    header: 'Store Name',
    accessor: 'storeName',
    render: (row) => row.storeName || '-',
    className: 'text-foreground',
  },
  {
    header: 'Status',
    accessor: 'status',
    render: (row) => {
      const statusConfig = getStatusConfig(row.status);
      return <StatusBadge variant={statusConfig.variant}>{statusConfig.label}</StatusBadge>;
    },
    className: 'text-center w-24',
  },
  {
    header: 'Last EOD',
    accessor: 'lastEodAt',
    render: (row) => formatTime(row.lastEodAt),
    className: 'text-muted-foreground text-sm w-36',
  },
  {
    header: 'Error Message',
    accessor: 'errorMessage',
    render: (row) => (
      <span
        className={
          row.errorMessage ? 'text-status-error text-sm' : 'text-muted-foreground text-sm'
        }
      >
        {row.errorMessage || '-'}
      </span>
    ),
  },
];
