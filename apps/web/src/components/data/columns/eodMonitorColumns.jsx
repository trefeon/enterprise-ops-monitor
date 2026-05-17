import React from 'react';
import StatusBadge from '../../ui/StatusBadge';
import IconButton from '../../ui/IconButton';
import { formatDateTime, formatTime } from '../../../lib/date';

export const getEodMonitorColumns = ({ onView, onRetry, canRetry }) => [
  { header: 'Store', accessor: 'storeCode', width: '110px' },
  { header: 'Name', accessor: 'storeName' },
  { header: 'Area', accessor: 'areaName', width: '180px' },
  {
    header: 'Status',
    accessor: 'status',
    width: '120px',
    render: (r) => {
      const variant = r.status === 'done' ? 'success' : r.status === 'failed' ? 'error' : 'warning';
      return <StatusBadge variant={variant}>{r.status.toUpperCase()}</StatusBadge>;
    },
  },
  {
    header: 'Last EOD',
    accessor: 'lastEodAt',
    width: '180px',
    render: (r) => formatDateTime(r.lastEodAt),
  },
  {
    header: 'Last Sync',
    accessor: 'lastSyncAt',
    width: '160px',
    render: (r) => formatTime(r.lastSyncAt),
  },
  {
    header: '',
    accessor: 'actions',
    width: '120px',
    render: (r) => (
      <div className="flex justify-end gap-2">
        <IconButton
          label="Detail"
          icon="info"
          onClick={(e) => {
            e.stopPropagation();
            onView && onView(r);
          }}
        />
        <IconButton
          label="Retry"
          icon="refresh"
          intent="primary"
          disabled={!canRetry}
          onClick={(e) => {
            e.stopPropagation();
            if (canRetry && onRetry) onRetry(r);
          }}
        />
      </div>
    ),
  },
];
