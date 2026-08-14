import { Download, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/shared/IconButton';
import { formatDate, formatTime } from '@/lib/date';
import { Guard } from '@/components/auth/Guard';
import type { SimpleColumn } from '@/components/ui/data-table';
import type { BackupFileRow } from './types';

const formatBytes = (value: number) => {
  if (!Number.isFinite(value)) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const precision = size >= 10 || unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
};

interface ColumnActions {
  onRestore: (row: BackupFileRow) => void;
  onDownload: (row: BackupFileRow) => void;
  onDelete: (row: BackupFileRow) => void;
  user: Record<string, unknown>;
}

export const getBackupColumns = ({
  onRestore,
  onDownload,
  onDelete,
  user,
}: ColumnActions): SimpleColumn<BackupFileRow>[] => [
  {
    header: 'File Name',
    render: (file) => (
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50 text-foreground border border-border/60">
          <RotateCcw className="size-5" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-foreground text-sm break-all" title={file.fileName}>
            {file.fileName}
          </span>
          <span className="text-3xs text-muted-foreground uppercase font-medium tracking-widest">
            {file.typeLabel}
          </span>
        </div>
      </div>
    ),
    className: 'w-[350px]',
  },
  {
    header: 'Size',
    render: (file) => (
      <span className="text-muted-foreground tabular-nums font-medium">
        {formatBytes(file.sizeBytes)}
      </span>
    ),
    className: 'w-[120px]',
  },
  {
    header: 'Date Created',
    render: (file) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-foreground/90">{formatDate(file.modifiedAt)}</span>
        <span className="text-3xs uppercase font-medium">{formatTime(file.modifiedAt)}</span>
      </div>
    ),
    className: 'w-[160px]',
  },
  {
    header: '',
    render: (file) => (
      <div className="flex items-center justify-end gap-2">
        <Guard user={user} permission="BACKUPS_RESTORE">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 rounded-lg"
            onClick={() => onRestore(file)}
          >
            Restore
          </Button>
        </Guard>
        <IconButton
          icon={<Download />}
          label="Download"
          onClick={() => onDownload(file)}
          className="size-8"
        />
        <Guard user={user} permission="BACKUPS_DELETE">
          <IconButton
            icon={<Trash2 />}
            label="Delete backup"
            intent="danger"
            onClick={() => onDelete(file)}
            className="size-8"
          />
        </Guard>
      </div>
    ),
    className: 'w-[200px]',
  },
];
