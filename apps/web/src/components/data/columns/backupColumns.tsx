import type { MouseEvent } from 'react';
import { Download, RotateCcw, Trash2 } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { IconButton } from '@/components/shared/IconButton';
import { formatDate, formatDateTime } from '../../../lib/date';

interface BackupFile {
  fileName: string;
  type: string;
  date: string;
  sizeBytes: number;
  modifiedAt: string;
}

interface BackupColumnHandlers {
  onDownload?: (row: BackupFile) => void;
  onDelete?: (row: BackupFile) => void;
  onRestore?: (row: BackupFile) => void;
  canDelete?: boolean;
  canRestore?: boolean;
}

export const getBackupColumns = ({
  onDownload,
  onDelete,
  onRestore,
  canDelete,
  canRestore,
}: BackupColumnHandlers) => [
  { header: 'Filename', accessor: 'fileName' },
  {
    header: 'Type',
    accessor: 'type',
    width: '130px',
    render: (row: BackupFile) => (
      <StatusBadge variant={row.type === 'scheduled' ? 'neutral' : 'warning'}>
        {row.type.toUpperCase()}
      </StatusBadge>
    ),
  },
  {
    header: 'Date',
    accessor: 'date',
    width: '130px',
    render: (row: BackupFile) => formatDate(row.date),
  },
  {
    header: 'Size',
    accessor: 'sizeBytes',
    width: '120px',
    render: (row: BackupFile) => `${(row.sizeBytes / 1024 / 1024).toFixed(2)} MB`,
  },
  {
    header: 'Modified',
    accessor: 'modifiedAt',
    width: '190px',
    render: (row: BackupFile) => formatDateTime(row.modifiedAt),
  },
  {
    header: '',
    accessor: 'actions',
    width: '160px',
    render: (row: BackupFile) => (
      <div className="flex justify-end gap-2">
        <IconButton
          label="Download"
          icon={<Download className="size-4" />}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            onDownload?.(row);
          }}
        />
        <IconButton
          label="Restore"
          icon={<RotateCcw className="size-4" />}
          intent="primary"
          disabled={!canRestore}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            if (canRestore) onRestore?.(row);
          }}
        />
        <IconButton
          label="Delete"
          icon={<Trash2 className="size-4" />}
          intent="danger"
          disabled={!canDelete}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            if (canDelete) onDelete?.(row);
          }}
        />
      </div>
    ),
  },
];
