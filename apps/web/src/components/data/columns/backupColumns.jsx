import React from 'react';
import { Download, RotateCcw, Trash2 } from 'lucide-react';
import StatusBadge from '../../ui/StatusBadge';
import IconButton from '../../ui/IconButton';
import { formatDate, formatDateTime } from '../../../lib/date';

export const getBackupColumns = ({ onDownload, onDelete, onRestore, canDelete, canRestore }) => [
  { header: 'Filename', accessor: 'fileName' },
  {
    header: 'Type',
    accessor: 'type',
    width: '130px',
    render: (r) => (
      <StatusBadge variant={r.type === 'scheduled' ? 'neutral' : 'warning'}>
        {r.type.toUpperCase()}
      </StatusBadge>
    ),
  },
  { header: 'Date', accessor: 'date', width: '130px', render: (r) => formatDate(r.date) },
  {
    header: 'Size',
    accessor: 'sizeBytes',
    width: '120px',
    render: (r) => `${(r.sizeBytes / 1024 / 1024).toFixed(2)} MB`,
  },
  {
    header: 'Modified',
    accessor: 'modifiedAt',
    width: '190px',
    render: (r) => formatDateTime(r.modifiedAt),
  },
  {
    header: '',
    accessor: 'actions',
    width: '160px',
    render: (r) => (
      <div className="flex justify-end gap-2">
        <IconButton
          label="Download"
          icon={<Download className="size-4" />}
          onClick={(e) => {
            e.stopPropagation();
            onDownload && onDownload(r);
          }}
        />
        <IconButton
          label="Restore"
          icon={<RotateCcw className="size-4" />}
          intent="primary"
          disabled={!canRestore}
          onClick={(e) => {
            e.stopPropagation();
            if (canRestore && onRestore) onRestore(r);
          }}
        />
        <IconButton
          label="Delete"
          icon={<Trash2 className="size-4" />}
          intent="danger"
          disabled={!canDelete}
          onClick={(e) => {
            e.stopPropagation();
            if (canDelete && onDelete) onDelete(r);
          }}
        />
      </div>
    ),
  },
];
