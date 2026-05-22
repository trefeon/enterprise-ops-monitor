import type { LucideIcon } from 'lucide-react';

export interface BackupDisk {
  usedBytes: number;
  totalBytes: number;
  freeBytes: number;
  usedPercent: number;
}

export interface BackupSchedule {
  cron: string;
  tz: string;
  enabled: boolean;
}

export interface BackupSummary {
  latestBackupAt: string;
  latestFileName: string;
  count: number;
  totalSizeBytes: number;
  storagePath: string;
  disk: BackupDisk;
  schedule: BackupSchedule;
}

export interface BackupFile {
  fileName: string;
  type: string;
  date: string;
  sizeBytes: number;
  modifiedAt: string;
}

export interface BackupsPagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface BackupFileRow {
  fileName: string;
  type: string;
  date: string;
  sizeBytes: number;
  modifiedAt: string;
  typeLabel: string;
  typeIcon: LucideIcon | null;
  [key: string]: unknown;
}
