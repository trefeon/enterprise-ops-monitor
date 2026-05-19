import React from 'react';
import { ArrowRight } from 'lucide-react';
import StatusBadge from '../../ui/StatusBadge';
import IconButton from '../../ui/IconButton';

export const getStoreColumns = ({ onView }) => [
  { header: 'Code', accessor: 'storeCode', width: '110px' },
  { header: 'Store Name', accessor: 'storeName' },
  { header: 'Area', accessor: 'areaName', width: '180px', render: (r) => r.areaName || r.areaId },
  {
    header: 'Status',
    accessor: 'status',
    width: '120px',
    render: (r) => (
      <StatusBadge variant={r.status === 'active' ? 'success' : 'neutral'}>
        {r.status.toUpperCase()}
      </StatusBadge>
    ),
  },
  {
    header: '',
    accessor: 'actions',
    width: '90px',
    render: (r) => (
      <div className="flex justify-end">
        <IconButton
          label="View"
          icon={<ArrowRight className="size-4" />}
          onClick={(e) => {
            e.stopPropagation();
            onView && onView(r);
          }}
        />
      </div>
    ),
  },
];
