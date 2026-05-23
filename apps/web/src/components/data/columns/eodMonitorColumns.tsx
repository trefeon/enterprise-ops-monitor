import type { MouseEvent } from 'react';
import { Info, RefreshCw } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { IconButton } from '@/components/shared/IconButton';
import { formatDateTime, formatTime } from '../../../lib/date';

interface EodRow {
  storeCode: string;
  storeName: string;
  areaName: string;
  status: string;
  lastEodAt: string;
  lastSyncAt: string;
}

interface EodColumnHandlers {
  onView?: (row: EodRow) => void;
  onRetry?: (row: EodRow) => void;
  canRetry?: boolean;
}

export const getEodMonitorColumns = ({ onView, onRetry, canRetry }: EodColumnHandlers) => [
  { header: 'Store', accessor: 'storeCode', width: '110px' },
  { header: 'Name', accessor: 'storeName' },
  { header: 'Area', accessor: 'areaName', width: '180px' },
  {
    header: 'Status',
    accessor: 'status',
    width: '120px',
    render: (row: EodRow) => {
      const variant =
        row.status === 'done' ? 'success' : row.status === 'failed' ? 'error' : 'warning';
      return <StatusBadge variant={variant}>{row.status.toUpperCase()}</StatusBadge>;
    },
  },
  {
    header: 'Last EOD',
    accessor: 'lastEodAt',
    width: '180px',
    render: (row: EodRow) => formatDateTime(row.lastEodAt),
  },
  {
    header: 'Last Sync',
    accessor: 'lastSyncAt',
    width: '160px',
    render: (row: EodRow) => formatTime(row.lastSyncAt),
  },
  {
    header: '',
    accessor: 'actions',
    width: '120px',
    render: (row: EodRow) => (
      <div className="flex justify-end gap-2">
        <IconButton
          label="Detail"
          icon={<Info className="size-4" />}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            onView?.(row);
          }}
        />
        <IconButton
          label="Retry"
          icon={<RefreshCw className="size-4" />}
          intent="primary"
          disabled={!canRetry}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            if (canRetry) onRetry?.(row);
          }}
        />
      </div>
    ),
  },
];
