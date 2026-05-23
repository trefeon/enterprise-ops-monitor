import type { MouseEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { IconButton } from '@/components/shared/IconButton';

interface StoreRow {
  storeCode: string;
  storeName: string;
  areaName?: string;
  areaId?: string;
  status: string;
}

interface StoreColumnHandlers {
  onView?: (row: StoreRow) => void;
}

export const getStoreColumns = ({ onView }: StoreColumnHandlers) => [
  { header: 'Code', accessor: 'storeCode', width: '110px' },
  { header: 'Store Name', accessor: 'storeName' },
  {
    header: 'Area',
    accessor: 'areaName',
    width: '180px',
    render: (row: StoreRow) => row.areaName || row.areaId,
  },
  {
    header: 'Status',
    accessor: 'status',
    width: '120px',
    render: (row: StoreRow) => (
      <StatusBadge variant={row.status === 'active' ? 'success' : 'neutral'}>
        {row.status.toUpperCase()}
      </StatusBadge>
    ),
  },
  {
    header: '',
    accessor: 'actions',
    width: '90px',
    render: (row: StoreRow) => (
      <div className="flex justify-end">
        <IconButton
          label="View"
          icon={<ArrowRight className="size-4" />}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            onView?.(row);
          }}
        />
      </div>
    ),
  },
];
