import { useCallback } from 'react';
import { RefreshCw, Play, Loader2, Database, Clock, HardDrive, AlertCircle, CheckCircle2, PauseCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/shared/PageShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/ui/data-table/DataTable';
import { StatCard } from '@/components/shared/StatCard';
import { SectionCard } from '@/components/shared/SectionCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Guard } from '@/components/auth/Guard';
import FeatureStoryBanner from '@/components/FeatureStoryBanner';
import { getFeatureStory } from '@/data/stories';
import { formatDate, formatDateTime, formatTime } from '@/lib/date';
import { useAuth } from '@/context/AuthContext';
import { useBackups } from './hooks/useBackups';
import { getBackupColumns } from './columns';
import type { BackupFileRow } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

const getStorageStatus = (percent: number): { label: string; variant: 'success' | 'warning' | 'destructive' | 'outline' } => {
  if (!Number.isFinite(percent)) return { label: 'Unknown', variant: 'outline' };
  if (percent >= 90) return { label: 'Critical', variant: 'destructive' };
  if (percent >= 75) return { label: 'High', variant: 'warning' };
  return { label: 'Healthy', variant: 'success' };
};

const formatBackupSchedule = (schedule: { cron?: string }) => {
  const cron = String(schedule?.cron || '').trim();
  const parts = cron.split(/\s+/);
  if (parts.length >= 5 && parts[2] === '*' && parts[3] === '*' && parts[4] === '*') {
    const minute = parts[0].padStart(2, '0');
    const hour = parts[1].padStart(2, '0');
    return `Daily ${hour}:${minute} WIB`;
  }
  return cron || 'Daily 00:05 WIB';
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function Backups() {
  const { api, user } = useAuth();
  const isDemoUser = !!(user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo');
  const b = useBackups(api, isDemoUser);

  const disk = b.summary?.disk;
  const diskPercent = Number.isFinite(disk?.usedPercent) ? disk!.usedPercent : null;
  const diskUsed = Number.isFinite(disk?.usedBytes) ? disk!.usedBytes : null;
  const diskTotal = Number.isFinite(disk?.totalBytes) ? disk!.totalBytes : null;
  const diskFree = Number.isFinite(disk?.freeBytes) ? disk!.freeBytes : null;
  const storageStatus = getStorageStatus(diskPercent ?? 0);
  const backupSchedule = (b.summary?.schedule || {}) as { cron?: string; tz?: string; enabled?: boolean };
  const scheduleEnabled = backupSchedule.enabled !== false;
  const snapshotCount = Number.isFinite(b.summary?.count) ? b.summary!.count : b.files.length;

  const handleDeleteTarget = useCallback(
    (row: BackupFileRow) => {
      b.setDeleteConfirm('');
      b.setDeleteTarget(row);
    },
    [b],
  );

  const handleRestoreTarget = useCallback(
    (row: BackupFileRow) => {
      b.setRestoreConfirm('');
      b.setRestoreTarget(row);
    },
    [b],
  );

  const columns = getBackupColumns({
    onRestore: handleRestoreTarget,
    onDownload: b.handleDownload,
    onDelete: handleDeleteTarget,
    user: user as Record<string, unknown>,
  });

  // -----------------------------------------------------------------------
  // Error state – no data at all
  // -----------------------------------------------------------------------

  if (b.error && !b.isLoading && b.hasNoData) {
    return (
      <PageShell>
        <EmptyState
          title="Failed to load backups"
          description={b.error}
          icon={<AlertCircle className="size-8" />}
          action={
            <Button variant="outline" onClick={b.handleRefresh}>
              <RefreshCw className="mr-2 size-4" />
              Retry
            </Button>
          }
        />
      </PageShell>
    );
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <PageShell>
      <FeatureStoryBanner story={getFeatureStory('backups')} />

      <PageHeader
        title="Backups Management"
        description="Manage database snapshots, schedule automated tasks, and restore points."
        meta={
          b.summary?.latestBackupAt ? (
            <span className="text-xs text-muted-foreground">
              Latest backup {formatDateTime(b.summary.latestBackupAt)}
            </span>
          ) : undefined
        }
        actions={
          <>
            <Button variant="outline" onClick={b.handleRefresh} disabled={b.isLoading}>
              <RefreshCw className={`mr-2 size-4 ${b.isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Guard user={user} permission="BACKUPS_RUN">
              <Button onClick={b.runManualBackup} disabled={b.manualLoading}>
                {b.manualLoading ? (
                  <Loader2 className="animate-spin mr-2 size-4" />
                ) : (
                  <Play className="mr-2 size-4" />
                )}
                Run Backup Now
              </Button>
            </Guard>
          </>
        }
      />

      {/* Inline error banner when data partially loaded */}
      {b.error && !b.hasNoData && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="size-4" />
          {b.error}
        </div>
      )}

      {/* Stats grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard
          title={
            <div className="flex items-center gap-2">
              <HardDrive className="size-5 text-muted-foreground" />
              <span className="text-sm font-bold uppercase tracking-wider">Storage Usage</span>
            </div>
          }
          right={<StatusBadge variant={storageStatus.variant}>{storageStatus.label}</StatusBadge>}
        >
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black tabular-nums text-foreground">
                {diskUsed != null ? formatBytes(diskUsed) : '-'}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  / {diskTotal != null ? formatBytes(diskTotal) : '-'}
                </span>
              </span>
              <span className="text-sm font-bold text-foreground">
                {diskPercent != null ? `${diskPercent.toFixed(0)}%` : '-'}
              </span>
            </div>
            <ProgressBar
              value={diskPercent != null ? Math.min(diskPercent, 100) : 0}
              trackClassName="bg-muted border border-border/20 h-2"
              barClassName="bg-primary"
            />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {diskFree != null
                  ? `${formatBytes(diskFree)} free space remaining`
                  : 'Disk usage data unavailable'}
              </p>
              {b.summary?.storagePath && (
                <p className="text-3xs text-muted-foreground uppercase font-medium">
                  Path:{' '}
                  <code className="text-foreground lowercase font-mono break-all">{b.summary.storagePath}</code>
                </p>
              )}
              <p className="text-3xs font-bold text-primary uppercase tracking-widest pt-1">
                Snapshot volume: {formatBytes(b.summary?.totalSizeBytes ?? 0)}
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title={
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-muted-foreground" />
              <span className="text-sm font-bold uppercase tracking-wider">Backup Schedule</span>
            </div>
          }
          right={
            <StatusBadge variant={scheduleEnabled ? 'success' : 'outline'}>
              {scheduleEnabled ? 'Active' : 'Paused'}
            </StatusBadge>
          }
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Schedule</p>
                  <p className="mt-1 text-2xl font-black text-foreground">
                    {formatBackupSchedule(backupSchedule)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">TZ: {backupSchedule.tz || 'Asia/Jakarta'}</p>
                </div>
                {scheduleEnabled ? (
                  <CheckCircle2 className="size-6 shrink-0 text-status-success" />
                ) : (
                  <PauseCircle className="size-6 shrink-0 text-muted-foreground" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-card/60 p-3">
                <p className="text-3xs font-bold uppercase tracking-widest text-muted-foreground">
                  Latest Backup
                </p>
                <p className="mt-1 text-sm font-bold text-foreground">
                  {formatDateTime(b.summary?.latestBackupAt)}
                </p>
                <p className="mt-1 truncate text-xs font-medium text-muted-foreground" title={b.summary?.latestFileName || undefined}>
                  {b.summary?.latestFileName || 'No backup yet'}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/60 p-3">
                <p className="text-3xs font-bold uppercase tracking-widest text-muted-foreground">Scheduler</p>
                <div className="mt-2 flex items-center gap-2 text-sm font-bold text-foreground">
                  {scheduleEnabled ? (
                    <CheckCircle2 className="size-4 text-status-success" />
                  ) : (
                    <AlertCircle className="size-4 text-muted-foreground" />
                  )}
                  {scheduleEnabled ? 'Scheduler ready' : 'Scheduler unavailable'}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Total snapshots <span className="font-bold text-foreground">{snapshotCount}</span>
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      </section>

      {/* Snapshots table */}
      <section className="pt-2">
        <SectionCard title={<span className="text-lg font-bold tracking-tight uppercase">Recent Snapshots</span>}>
          <DataTable
            columns={columns}
            data={b.files}
            loading={b.loadingFiles && b.files.length === 0}
            serverSide
            pageIndex={b.pagination.page - 1}
            totalRows={b.pagination.total}
            pageSize={b.pagination.pageSize}
            onPageChange={(pageIndex) => b.setPagination((prev) => ({ ...prev, page: pageIndex + 1 }))}
            onPageSizeChange={(size) => b.setPagination((prev) => ({ ...prev, pageSize: size, page: 1 }))}
            keyExtractor={(row) => row.fileName}
            noCard
          />
        </SectionCard>
      </section>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(b.deleteTarget)}
        title="Delete backup file"
        desc={`Type the filename to confirm deletion: ${b.deleteTarget?.fileName}`}
        confirmText="Delete"
        danger
        confirmExpected={b.deleteTarget?.fileName || ''}
        confirmValue={b.deleteConfirm}
        onConfirmValueChange={b.setDeleteConfirm}
        onConfirm={b.handleDelete}
        onClose={() => {
          b.setDeleteTarget(null);
          b.setDeleteConfirm('');
        }}
        confirmLabel="Filename confirmation"
      />

      {/* Restore confirmation */}
      <ConfirmDialog
        open={Boolean(b.restoreTarget)}
        title="Restore database"
        desc="This will queue a database restore. Type RESTORE to continue."
        confirmText="Queue Restore"
        danger
        confirmExpected="RESTORE"
        confirmValue={b.restoreConfirm}
        onConfirmValueChange={(v) => {
          if (v !== 'RESTORE') b.setRestoreConfirm(v);
        }}
        onConfirm={b.handleRestore}
        onClose={() => {
          b.setRestoreTarget(null);
          b.setRestoreConfirm('');
        }}
        confirmLabel="Type RESTORE"
      />
    </PageShell>
  );
}
