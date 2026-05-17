import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Guard } from '../../components/auth/Guard';
import { useToast } from '../../components/ui/ToastContext';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import IconButton from '../../components/ui/IconButton';
import StatusBadge from '../../components/ui/StatusBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatDate, formatDateTime, formatTime } from '../../lib/date';
import { getFeatureStory } from '../../data/stories';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const formatBytes = (value) => {
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

const cronToDailyTime = (cron) => {
  // Expected format: "<minute> <hour> * * *".
  const match = String(cron || '')
    .trim()
    .match(/^(\d{1,2})\s+(\d{1,2})\s+\*\s+\*\s+\*$/);
  if (!match) return null;

  const minute = Number(match[1]);
  const hour = Number(match[2]);
  if (Number.isNaN(minute) || Number.isNaN(hour)) return null;
  if (minute < 0 || minute > 59 || hour < 0 || hour > 23) return null;

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const getBackupType = (value) => {
  const key = String(value || '').toLowerCase();
  if (key === 'manual') {
    return { label: 'Manual Backup', icon: 'database' };
  }
  if (key === 'scheduled') {
    return { label: 'Automated', icon: 'description' };
  }
  return { label: 'Unknown', icon: 'description' };
};

const getStorageStatus = (percent) => {
  if (!Number.isFinite(percent)) return { label: 'Unknown', variant: 'neutral' };
  if (percent >= 90) return { label: 'Critical', variant: 'error' };
  if (percent >= 75) return { label: 'High', variant: 'warning' };
  return { label: 'Healthy', variant: 'success' };
};

const Backups = () => {
  const { api, user } = useAuth();
  const { push } = useToast();

  const isDemoUser = user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo';
  const [summary, setSummary] = useState(null);
  const [files, setFiles] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0 });
  const [manualLoading, setManualLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoreConfirm, setRestoreConfirm] = useState('');

  const refreshSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const res = await api.get('/backups/summary');
      if (!res.ok) throw new Error(res.error?.message || 'Failed to load summary');
      setSummary(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load backup summary');
    } finally {
      setLoadingSummary(false);
    }
  }, [api]);

  const refreshFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const res = await api.get('/backups/files', {
        params: { page: pagination.page, pageSize: pagination.pageSize },
      });
      if (!res.ok) throw new Error(res.error?.message || 'Failed to load files');
      setFiles(res.data || []);
      if (res.meta?.pagination) setPagination(res.meta.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load backup files');
    } finally {
      setLoadingFiles(false);
    }
  }, [api, pagination.page, pagination.pageSize]);

  const refreshAll = useCallback(async () => {
    setError(null);
    await Promise.all([refreshSummary(), refreshFiles()]);
  }, [refreshSummary, refreshFiles]);

  const handleRefresh = useCallback(() => {
    if (isDemoUser) {
      push({
        variant: 'warning',
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
      return;
    }
    refreshAll();
  }, [isDemoUser, push, refreshAll]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const runManualBackup = async () => {
    if (isDemoUser) {
      push({
        variant: 'warning',
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
      return;
    }
    setManualLoading(true);
    try {
      const res = await api.post('/backups/run', { type: 'manual' });
      if (!res.ok) throw new Error(res.error?.message || 'Failed to run backup');
      push({
        variant: 'success',
        title: 'Backup queued',
        message: `${res.data.fileName} created.`,
      });
      refreshAll();
    } catch (err) {
      push({ variant: 'error', title: 'Backup failed', message: err.message });
    } finally {
      setManualLoading(false);
    }
  };

  const handleDelete = useCallback(async () => {
    if (isDemoUser) {
      push({
        variant: 'warning',
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
      return;
    }
    if (!deleteTarget) return;
    try {
      const res = await api.delete(`/backups/files/${encodeURIComponent(deleteTarget.fileName)}`, {
        data: { confirm: deleteConfirm },
      });
      if (!res.ok) throw new Error(res.error?.message || 'Delete failed');
      push({ variant: 'success', title: 'Backup deleted', message: deleteTarget.fileName });
      setDeleteTarget(null);
      setDeleteConfirm('');
      refreshAll();
    } catch (err) {
      push({ variant: 'error', title: 'Delete failed', message: err.message });
    }
  }, [api, deleteConfirm, deleteTarget, push, refreshAll]);

  const handleRestore = useCallback(async () => {
    if (isDemoUser) {
      push({
        variant: 'warning',
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
      return;
    }
    if (!restoreTarget) return;
    try {
      const res = await api.post('/backups/restore', {
        fileName: restoreTarget.fileName,
        confirmText: restoreConfirm,
      });
      if (!res.ok) throw new Error(res.error?.message || 'Restore failed');
      push({ variant: 'warning', title: 'Restore queued', message: restoreTarget.fileName });
      setRestoreTarget(null);
      setRestoreConfirm('');
    } catch (err) {
      push({ variant: 'error', title: 'Restore failed', message: err.message });
    }
  }, [api, push, restoreConfirm, restoreTarget]);

  const handleDownload = useCallback(
    async (row) => {
      if (isDemoUser) {
        push({
          variant: 'warning',
          title: 'Demo Account',
          message: 'This action is not available in the demo account.',
        });
        return;
      }
      try {
        const res = await api.get(`/backups/files/${encodeURIComponent(row.fileName)}/download`);
        if (!res.ok) throw new Error(res.error?.message || 'Download failed');
        const { contentBase64, contentType, fileName } = res.data;
        if (!contentBase64) throw new Error('Backup content unavailable');

        const binary = atob(contentBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: contentType || 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || row.fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        push({ variant: 'error', title: 'Download failed', message: err.message });
      }
    },
    [api, push]
  );

  const disk = summary?.disk;
  const diskUsed = Number.isFinite(disk?.usedBytes) ? disk.usedBytes : null;
  const diskTotal = Number.isFinite(disk?.totalBytes) ? disk.totalBytes : null;
  const diskFree = Number.isFinite(disk?.freeBytes) ? disk.freeBytes : null;
  const diskPercent = Number.isFinite(disk?.usedPercent) ? disk.usedPercent : null;
  const storageStatus = getStorageStatus(diskPercent);
  const backupCount = summary?.count;
  const scheduleEnabled = summary?.schedule?.enabled;
  const scheduleStatusLabel =
    scheduleEnabled == null ? 'Unknown' : scheduleEnabled ? 'Active' : 'Paused';
  const scheduleStatusIcon =
    scheduleEnabled == null ? 'help' : scheduleEnabled ? 'check_circle' : 'pause_circle';
  const scheduleStatusText =
    scheduleEnabled == null
      ? 'Schedule status unavailable'
      : scheduleEnabled
        ? 'Scheduler ready'
        : 'Scheduler paused';
  const scheduleStatusVariant =
    scheduleEnabled == null ? 'neutral' : scheduleEnabled ? 'success' : 'warning';

  const scheduleCron = summary?.schedule?.cron;
  const scheduleTime = cronToDailyTime(scheduleCron);
  const scheduleTz = summary?.schedule?.tz || 'Asia/Jakarta';

  const totalItems = pagination.total || files.length || 0;
  const rangeStart = totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const rangeEnd = Math.min(pagination.page * pagination.pageSize, totalItems);

  const isLoading = loadingSummary || loadingFiles;
  const hasNoData = !summary && files.length === 0;

  const filesWithMeta = useMemo(
    () =>
      files.map((file) => {
        const type = getBackupType(file.type);
        return { ...file, typeLabel: type.label, typeIcon: type.icon };
      }),
    [files]
  );

  if (error && !isLoading && hasNoData) {
    return (
      <EmptyState
        title="Failed to load backups"
        description={error}
        icon="error"
        action={{ label: 'Retry', icon: 'refresh', onClick: handleRefresh }}
      />
    );
  }

  return (
    <div className="page-container">
      <FeatureStoryBanner story={getFeatureStory('backups')} />
      <header className="flex flex-col gap-4">
        <div className="page-header">
          <div className="space-y-1">
            <h1 className="page-title">Backups Management</h1>
            <p className="page-subtitle">
              Manage database snapshots, schedule automated tasks, and restore points.
            </p>
            <div className="page-meta">Latest backup {formatDateTime(summary?.latestBackupAt)}</div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              <span className="material-symbols-outlined mr-2">refresh</span>
              Refresh
            </Button>
            <Guard user={user} permission="BACKUPS_RUN">
              <Button onClick={runManualBackup} className="w-full sm:w-auto">
                {manualLoading && <Loader2 className="animate-spin mr-2" />}
                <span className="material-symbols-outlined mr-2">play_arrow</span>
                Run Backup Now
              </Button>
            </Guard>
          </div>
        </div>
      </header>
      {error && !hasNoData && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card className="flex flex-col justify-between gap-4">
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-foreground">
                <span className="material-symbols-outlined text-xl text-muted-foreground">
                  hard_drive
                </span>
                <h3 className="text-sm font-semibold">Storage Usage</h3>
              </div>
              <StatusBadge variant={storageStatus.variant}>{storageStatus.label}</StatusBadge>
            </div>
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-foreground">
                  {diskUsed != null ? formatBytes(diskUsed) : '-'}{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    / {diskTotal != null ? formatBytes(diskTotal) : '-'}
                  </span>
                </span>
                <span className="text-sm font-medium text-foreground">
                  {diskPercent != null ? `${diskPercent.toFixed(0)}%` : '-'}
                </span>
              </div>
              <ProgressBar
                value={diskPercent != null ? Math.min(diskPercent, 100) : 0}
                trackClassName="bg-muted border border-border"
                barClassName="bg-primary"
              />
              <p className="text-xs text-muted-foreground">
                {diskFree != null
                  ? `${formatBytes(diskFree)} free space remaining`
                  : 'Disk usage data unavailable'}
                {summary?.storagePath && (
                  <>
                    {' '}
                    on{' '}
                    <code className="relative rounded bg-muted border border-border px-1 py-0.5 font-mono text-sm font-semibold text-foreground">
                      {summary.storagePath}
                    </code>
                  </>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Total backups size {formatBytes(summary?.totalSizeBytes)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between gap-4">
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-foreground">
                <span className="material-symbols-outlined text-xl text-muted-foreground">
                  schedule
                </span>
                <h3 className="text-sm font-semibold">Backup Schedule</h3>
              </div>
              <StatusBadge variant={scheduleStatusVariant}>{scheduleStatusLabel}</StatusBadge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Schedule
                </span>
                <span className="text-base font-medium text-foreground">
                  {scheduleTime
                    ? `Daily ${scheduleTime} WIB`
                    : scheduleCron
                      ? 'Custom schedule'
                      : '-'}
                </span>
                <span className="text-xs text-muted-foreground">TZ: {scheduleTz}</span>
              </div>
              <div className="flex flex-col gap-1 border-l border-border pl-4">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Latest Backup
                </span>
                <span className="text-base font-medium text-foreground">
                  {formatDateTime(summary?.latestBackupAt)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {summary?.latestFileName || '-'}
                </span>
                <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-muted-foreground">
                    {scheduleStatusIcon}
                  </span>
                  {scheduleStatusText}
                </span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Total snapshots {backupCount != null ? backupCount : '-'}
            </div>
          </CardContent>
        </Card>
      </section>
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Recent Snapshots</h2>
          <IconButton icon="refresh" label="Refresh" onClick={handleRefresh} disabled={isLoading} />
        </div>
        <Card className="p-0 overflow-hidden">
          <CardContent className="p-0">
            <Table className="table-fixed">
              <TableHeader><TableRow>
                  <TableHead className="w-2/5">
                    File Name
                  </TableHead>
                  <TableHead className="w-1/5 text-right">
                    Size
                  </TableHead>
                  <TableHead className="w-1/5 text-center">
                    Date Created
                  </TableHead>
                  <TableHead className="w-1/5 text-center">
                    Actions
                  </TableHead>
                </TableRow></TableHeader>
              <TableBody>
                {loadingFiles && files.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Loading backups...</TableCell></TableRow>
                ) : filesWithMeta.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No backup files available.</TableCell></TableRow>
                ) : (
                  filesWithMeta.map((file) => (
                    <TableRow key={file.fileName} className="group">
                      <TableCell className="truncate">
                        <div className="flex items-center gap-3 truncate">
                          <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-md bg-muted text-foreground border border-border">
                            <span className="material-symbols-outlined text-xl">
                              {file.typeIcon}
                            </span>
                          </div>
                          <div className="flex flex-col truncate">
                            <span
                              className="font-medium text-foreground truncate"
                              title={file.fileName}
                            >
                              {file.fileName}
                            </span>
                            <span className="text-xs text-muted-foreground">{file.typeLabel}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {formatBytes(file.sizeBytes)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-center">
                        <div className="flex flex-col">
                          <span>{formatDate(file.modifiedAt)}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(file.modifiedAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Guard user={user} permission="BACKUPS_RESTORE">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setRestoreConfirm('');
                                setRestoreTarget(file);
                              }}
                            >
                              Restore
                            </Button>
                          </Guard>
                          <IconButton
                            icon="download"
                            label="Download"
                            onClick={() => handleDownload(file)}
                          />
                          <Guard user={user} permission="BACKUPS_DELETE">
                            <IconButton
                              icon="delete"
                              label="Delete backup"
                              intent="danger"
                              onClick={() => {
                                setDeleteConfirm('');
                                setDeleteTarget(file);
                              }}
                            />
                          </Guard>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{rangeStart}</span> to{' '}
                <span className="font-medium text-foreground">{rangeEnd}</span> of{' '}
                <span className="font-medium text-foreground">{totalItems}</span> results
              </p>
              <div className="flex w-full gap-2 sm:w-auto">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: Math.max(prev.page - 1, 1) }))
                  }
                  className="flex-1 sm:flex-none"
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pagination.page * pagination.pageSize >= totalItems}
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: prev.page * prev.pageSize < totalItems ? prev.page + 1 : prev.page,
                    }))
                  }
                  className="flex-1 sm:flex-none"
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete backup file"
        desc={`Type the filename to confirm deletion: ${deleteTarget?.fileName}`}
        confirmText="Delete"
        danger
        confirmExpected={deleteTarget?.fileName || ''}
        confirmValue={deleteConfirm}
        onConfirmValueChange={setDeleteConfirm}
        onConfirm={handleDelete}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteConfirm('');
        }}
        confirmLabel="Filename confirmation"
      />
      <ConfirmDialog
        open={Boolean(restoreTarget)}
        title="Restore database"
        desc="This will queue a database restore. Type RESTORE to continue."
        confirmText="Queue Restore"
        danger
        confirmExpected="RESTORE"
        confirmValue={restoreConfirm}
        onConfirmValueChange={setRestoreConfirm}
        onConfirm={handleRestore}
        onClose={() => {
          setRestoreTarget(null);
          setRestoreConfirm('');
        }}
        confirmLabel="Type RESTORE"
      />
    </div>
  );
};

export default Backups;
