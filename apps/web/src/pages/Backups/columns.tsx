import { Download, Trash2, RotateCcw } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/shared/IconButton';
import { formatDate, formatTime } from '@/lib/date';
import { Guard } from '@/components/auth/Guard';
import type { BackupFileRow } from './types';

const formatBytes = (value: number) => {
  if (!Number.isFinite(value)) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
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
}: ColumnActions): ColumnDef<BackupFileRow>[] => [
  {
    id: 'fileName',
    header: 'File Name',
    cell: ({ row }) => {
      const file = row.original;
      return (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 text-foreground border border-border/60">
            <RotateCcw className="size-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-foreground text-sm break-all" title={file.fileName}>
              {file.fileName}
            </span>
            <span className="text-3xs text-muted-foreground uppercase font-black tracking-widest">
              {file.typeLabel}
            </span>
          </div>
        </div>
      );
    },
    size: 350,
  },
  {
    id: 'sizeBytes',
    header: 'Size',
    cell: ({ row }) => (
      <span className="text-right text-muted-foreground tabular-nums font-medium block w-full">
        {formatBytes(row.original.sizeBytes)}
      </span>
    ),
    size: 120,
  },
  {
    id: 'modifiedAt',
    header: 'Date Created',
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-bold text-foreground/90">{formatDate(row.original.modifiedAt)}</span>
        <span className="text-3xs uppercase font-medium">{formatTime(row.original.modifiedAt)}</span>
      </div>
    ),
    size: 160,
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <Guard user={user} permission="BACKUPS_RESTORE">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 rounded-lg"
            onClick={() => onRestore(row.original)}
          >
            Restore
          </Button>
        </Guard>
        <IconButton
          icon={<Download />}
          label="Download"
          onClick={() => onDownload(row.original)}
          className="size-8"
        />
        <Guard user={user} permission="BACKUPS_DELETE">
          <IconButton
            icon={<Trash2 />}
            label="Delete backup"
            intent="danger"
            onClick={() => onDelete(row.original)}
            className="size-8"
          />
        </Guard>
      </div>
    ),
    size: 200,
  },
];
