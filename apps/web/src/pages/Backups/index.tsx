import { useCallback } from 'react';
import { RefreshCw, Play, Loader2, Database, Clock, HardDrive, AlertCircle, CheckCircle2, PauseCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/base/dashboard-layout';
import { PageTemplate, KpiRow, SectionCard, TableCard } from '@/components/template';
import { DataTable } from '@/components/ui/data-table';
import { StatCard } from '@/components/ui/cards';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Guard } from '@/components/auth/Guard';
import { getFeatureStory } from '@/data/stories';
import { formatDateTime } from '@/lib/date';
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

const storageStatusToStatStatus = (variant: 'success' | 'warning' | 'destructive' | 'outline') => {
  switch (variant) {
    case 'success': return 'success' as const;
    case 'warning': return 'warning' as const;
    case 'destructive': return 'error' as const;
    default: return 'default' as const;
  }
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
      <DashboardLayout>
        <EmptyState
          title="Failed to load backups"
          description={b.error}
          icon={<AlertCircle className="size-8" />}
          action={
            <Button variant="outline" onClick={b.handleRefresh}>
              <RefreshCw aria-hidden="true" className="mr-2 size-4" />
              Retry
            </Button>
          }
        />
      </DashboardLayout>
    );
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <PageTemplate
      story={getFeatureStory('backups')}
      title="Backups Management"
      subtitle="Manage database snapshots, schedule automated tasks, and restore points."
      actions={
        <>
          <Button variant="outline" onClick={b.handleRefresh} disabled={b.isLoading}>
            <RefreshCw aria-hidden="true" className={`mr-2 size-4 ${b.isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Guard user={user} permission="BACKUPS_RUN">
            <Button onClick={b.runManualBackup} disabled={b.manualLoading}>
              {b.manualLoading ? (
                <Loader2 aria-hidden="true" className="animate-spin mr-2 size-4" />
              ) : (
                <Play aria-hidden="true" className="mr-2 size-4" />
              )}
              Run Backup Now
            </Button>
          </Guard>
        </>
      }
    >
      {/* Inline error banner when data partially loaded */}
      {b.error && !b.hasNoData && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="size-4" />
          {b.error}
        </div>
      )}

      {/* KPI row */}
      <KpiRow>
        <StatCard
          title="Storage Used"
          value={diskUsed != null ? formatBytes(diskUsed) : '-'}
          icon={<HardDrive aria-hidden="true" />}
          subtext={
            diskTotal != null
              ? `${formatBytes(diskTotal)} total · ${diskPercent != null ? `${diskPercent.toFixed(0)}% used` : '-'}`
              : 'Disk usage data unavailable'
          }
          status={storageStatusToStatStatus(storageStatus.variant)}
        />
        <StatCard
          title="Snapshots"
          value={snapshotCount}
          icon={<Database aria-hidden="true" />}
          subtext="total backup files"
        />
        <StatCard
          title="Schedule"
          value={formatBackupSchedule(backupSchedule)}
          icon={<Clock aria-hidden="true" />}
          subtext={scheduleEnabled ? 'Active' : 'Paused'}
          status={scheduleEnabled ? 'success' : 'default'}
        />
        <StatCard
          title="Latest Backup"
          value={
            <span className="whitespace-nowrap">
              {b.summary?.latestBackupAt ? formatDateTime(b.summary.latestBackupAt) : 'Never'}
            </span>
          }
          icon={b.summary?.latestBackupAt ? <CheckCircle2 aria-hidden="true" /> : <PauseCircle aria-hidden="true" />}
          subtext={
            <span className="block truncate font-mono" title={b.summary?.latestFileName || undefined}>
              {b.summary?.latestFileName || 'No backup yet'}
            </span>
          }
          status={b.summary?.latestBackupAt ? 'success' : 'default'}
        />
      </KpiRow>

      {/* Storage Usage section */}
      <SectionCard
        title={
          <div className="flex items-center gap-2">
            <HardDrive className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium uppercase tracking-wider">Storage Usage</span>
          </div>
        }
        actions={<StatusBadge variant={storageStatus.variant}>{storageStatus.label}</StatusBadge>}
      >
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <span className="text-3xl font-medium tabular-nums text-foreground">
              {diskUsed != null ? formatBytes(diskUsed) : '-'}{' '}
              <span className="text-sm font-normal text-muted-foreground">
                / {diskTotal != null ? formatBytes(diskTotal) : '-'}
              </span>
            </span>
            <span className="tabular-nums text-sm font-medium text-foreground">
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
            <p className="text-3xs font-medium text-primary uppercase tracking-widest pt-1">
              Snapshot volume: <span className="tabular-nums">{formatBytes(b.summary?.totalSizeBytes ?? 0)}</span>
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Backup Schedule section */}
      <SectionCard
        title={
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium uppercase tracking-wider">Backup Schedule</span>
          </div>
        }
        actions={
          <StatusBadge variant={scheduleEnabled ? 'success' : 'outline'}>
            {scheduleEnabled ? 'Active' : 'Paused'}
          </StatusBadge>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Schedule</p>
                <p className="mt-1 text-2xl font-medium text-foreground">
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
            <div className="rounded-lg border border-border/60 bg-card/60 p-3">
              <p className="text-3xs font-medium uppercase tracking-widest text-muted-foreground">
                Latest Backup
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {formatDateTime(b.summary?.latestBackupAt)}
              </p>
              <p className="mt-1 truncate text-xs font-medium text-muted-foreground" title={b.summary?.latestFileName || undefined}>
                {b.summary?.latestFileName || 'No backup yet'}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/60 p-3">
              <p className="text-3xs font-medium uppercase tracking-widest text-muted-foreground">Scheduler</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
                {scheduleEnabled ? (
                  <CheckCircle2 className="size-4 text-status-success" />
                ) : (
                  <AlertCircle className="size-4 text-muted-foreground" />
                )}
                {scheduleEnabled ? 'Scheduler ready' : 'Scheduler unavailable'}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Total snapshots <span className="font-medium text-foreground">{snapshotCount}</span>
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Snapshots table */}
      <TableCard title="Recent Snapshots">
        <DataTable
          columns={columns}
          data={b.files}
          loading={b.loadingFiles && b.files.length === 0}
          pagination={{
            page: b.pagination.page,
            pageSize: b.pagination.pageSize,
            total: b.pagination.total,
          }}
          onPageChange={(page) =>
            b.setPagination((prev) => ({ ...prev, page }))
          }
          onPageSizeChange={(pageSize) =>
            b.setPagination((prev) => ({ ...prev, pageSize, page: 1 }))
          }
          keyExtractor={(row) => row.fileName}
        />
      </TableCard>

      {/* Delete confirmation */}
      <div className="overscroll-contain">
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
      </div>

      {/* Restore confirmation */}
      <div className="overscroll-contain">
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
      </div>
    </PageTemplate>
  );
}
