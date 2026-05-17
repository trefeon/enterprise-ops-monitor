import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Guard } from '../components/auth/Guard';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/ui/ToastContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import ProgressBar from '../components/ui/ProgressBar';
import PageShell from '../components/ui/PageShell';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import FeatureStoryBanner from '../components/FeatureStoryBanner';
import { Table, Thead, Trow, Tcell, TableEmpty, TableFooter } from '../components/ui/Table';
import { formatDateTime, formatTime } from '../lib/date';
import StatusBadge from '../components/ui/StatusBadge';
import { getFeatureStory } from '../data/stories';

const LEVEL_OPTIONS = ['ALL', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];

const SERVICE_ICONS = {
  Database: 'database',
  API: 'api',
  'Bot Service': 'smart_toy',
  Scheduler: 'schedule',
  'Backup Service': 'backup',
};

const STATUS_STYLES = {
  ONLINE: {
    label: 'Online',
    variant: 'success',
    dot: 'bg-status-success',
  },
  DEGRADED: {
    label: 'Degraded',
    variant: 'warning',
    dot: 'bg-status-warning',
  },
  UNKNOWN: {
    label: 'Unknown',
    variant: 'neutral',
    dot: 'bg-muted-foreground',
  },
};

const LEVEL_STYLES = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'error',
};
const SYSTEM_LOG_EXPORT_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

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

const formatUptime = (value) => {
  if (!Number.isFinite(value)) return '-';
  const totalSeconds = Math.max(0, Math.floor(value));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

function base64ToBlob(base64, contentType) {
  const binary = atob(String(base64 || ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: contentType });
}

function normalizeSystemLogsExportFileName(fileName, contentType) {
  const fallbackName = `system_logs_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const rawName = String(fileName || '').trim() || fallbackName;
  const isWorkbook = String(contentType || '').includes('spreadsheetml.sheet');

  if (!isWorkbook) return rawName;
  if (rawName.toLowerCase().endsWith('.xlsx')) return rawName;
  if (rawName.toLowerCase().endsWith('.xls')) return `${rawName.slice(0, -4)}.xlsx`;
  return `${rawName}.xlsx`;
}

const getServiceIcon = (name) => {
  return SERVICE_ICONS[name] || 'settings_suggest';
};

const SystemHealth = () => {
  const { api, user } = useAuth();
  const { push } = useToast();

  const isDemoUser = user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo';
  const [overview, setOverview] = useState(null);
  const [services, setServices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [error, setError] = useState(null);
  const [logQuery, setLogQuery] = useState('');
  const [logLevel, setLogLevel] = useState('ALL');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0 });
  const [restartTarget, setRestartTarget] = useState(null);
  const [restartConfirm, setRestartConfirm] = useState('');
  const [restartLoading, setRestartLoading] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);

  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    setError(null);
    try {
      const res = await api.get('/system/overview');
      if (!res.ok) throw new Error(res.error?.message || 'Failed to load system overview');
      setOverview(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load system overview');
    } finally {
      setLoadingOverview(false);
    }
  }, [api]);

  const fetchServices = useCallback(async () => {
    setLoadingServices(true);
    setError(null);
    try {
      const res = await api.get('/system/services');
      if (!res.ok) throw new Error(res.error?.message || 'Failed to load services');
      setServices(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load services');
    } finally {
      setLoadingServices(false);
    }
  }, [api]);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    setError(null);
    try {
      const res = await api.get('/system/logs', {
        params: { page: pagination.page, pageSize: pagination.pageSize },
      });
      if (!res.ok) throw new Error(res.error?.message || 'Failed to load logs');
      setLogs(res.data || []);
      if (res.meta?.pagination) {
        setPagination((prev) => ({ ...prev, ...res.meta.pagination }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load logs');
    } finally {
      setLoadingLogs(false);
    }
  }, [api, pagination.page, pagination.pageSize]);

  const refreshAll = useCallback(async () => {
    if (isDemoUser) {
      push({ variant: 'warning', title: 'Demo Account', message: 'This action is not available in the demo account.' });
      return;
    }
    setError(null);
    await Promise.all([fetchOverview(), fetchServices(), fetchLogs()]);
  }, [fetchLogs, fetchOverview, fetchServices]);

  useEffect(() => {
    fetchOverview();
    fetchServices();
  }, [fetchOverview, fetchServices]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleHealthCheck = async () => {
    if (isDemoUser) {
      push({ variant: 'warning', title: 'Demo Account', message: 'This action is not available in the demo account.' });
      return;
    }
    setHealthLoading(true);
    try {
      const res = await api.post('/system/healthcheck');
      if (!res.ok) throw new Error(res.error?.message || 'Health check failed');
      const result = res.data || {};
      const summary = [
        `DB ${result.database || '-'}`,
        `API ${result.api || '-'}`,
        `Scheduler ${result.scheduler || '-'}`,
        `Backup ${result.backup || '-'}`,
      ].join(' | ');
      push({ variant: 'success', title: 'Health check complete', message: summary });
      fetchServices();
      fetchLogs();
    } catch (err) {
      push({ variant: 'error', title: 'Health check failed', message: err.message });
    } finally {
      setHealthLoading(false);
    }
  };

  const handleRestart = async () => {
    if (!restartTarget) return;
    setRestartLoading(true);
    try {
      const res = await api.post(
        `/system/services/${encodeURIComponent(restartTarget.name)}/restart`,
        { confirm: true }
      );
      if (!res.ok) throw new Error(res.error?.message || 'Restart failed');
      push({
        variant: 'warning',
        title: 'Restart requested',
        message: `${restartTarget.name} is restarting.`,
      });
      setRestartTarget(null);
      setRestartConfirm('');
      fetchLogs();
    } catch (err) {
      push({ variant: 'error', title: 'Restart failed', message: err.message });
    } finally {
      setRestartLoading(false);
    }
  };

  const handleCopyLog = async (log) => {
    const payload = `${log.createdAt} [${log.level}] ${log.component}: ${log.message}`;
    try {
      await navigator.clipboard.writeText(payload);
      push({ variant: 'success', title: 'Copied', message: 'Log entry copied.' });
    } catch (err) {
      push({
        variant: 'error',
        title: 'Copy failed',
        message: err?.message || 'Clipboard unavailable.',
      });
    }
  };

  const filteredLogs = useMemo(() => {
    const query = logQuery.trim().toLowerCase();
    return logs.filter((log) => {
      const level = (log?.level || '').toUpperCase();
      if (logLevel !== 'ALL' && level !== logLevel) return false;
      if (!query) return true;
      const haystack = `${log.component || ''} ${log.message || ''} ${level}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [logs, logLevel, logQuery]);

  const handleExportLogs = async () => {
    if (isDemoUser) {
      push({ variant: 'warning', title: 'Demo Account', message: 'This action is not available in the demo account.' });
      return;
    }
    try {
      const res = await api.get('/system/logs/export', {
        params: {
          q: logQuery.trim() || undefined,
          level: logLevel === 'ALL' ? undefined : logLevel,
        },
      });
      if (!res.ok) throw new Error(res.error?.message || 'Export failed');

      const exportData = res.data || {};
      const contentType = exportData.contentType || SYSTEM_LOG_EXPORT_MIME;
      const contentBase64 = String(exportData.contentBase64 || exportData.content || '');
      if (!contentBase64) throw new Error('Export content unavailable');

      const blob = base64ToBlob(contentBase64, contentType);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = normalizeSystemLogsExportFileName(exportData.fileName, contentType);
      a.click();
      window.URL.revokeObjectURL(url);

      push({ variant: 'success', title: 'Export ready', message: 'Logs Excel downloaded.' });
    } catch (err) {
      push({ variant: 'error', title: 'Export failed', message: err.message });
    }
  };

  const loadValues = overview?.loadavg || [];
  const load1 = Number.isFinite(loadValues[0]) ? loadValues[0] : null;

  const memoryTotal = overview?.memory?.totalBytes;
  const memoryFree = overview?.memory?.freeBytes;
  const memoryUsed =
    Number.isFinite(memoryTotal) && Number.isFinite(memoryFree)
      ? Math.max(memoryTotal - memoryFree, 0)
      : null;
  const memoryUsedPercent =
    memoryUsed != null && memoryTotal > 0 ? (memoryUsed / memoryTotal) * 100 : null;
  const memoryStatus =
    memoryUsedPercent == null
      ? 'Unknown'
      : memoryUsedPercent >= 90
        ? 'Critical'
        : memoryUsedPercent >= 75
          ? 'High'
          : 'Healthy';

  const disk = overview?.disk;
  const diskUsedPercent = Number.isFinite(disk?.usedPercent) ? disk.usedPercent : null;
  const totalLogs = pagination.total || logs.length || 0;
  const rangeStart = totalLogs === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const rangeEnd = Math.min(pagination.page * pagination.pageSize, totalLogs);

  if (
    error &&
    !loadingOverview &&
    !loadingServices &&
    !loadingLogs &&
    !overview &&
    services.length === 0 &&
    logs.length === 0
  ) {
    return (
      <PageShell>
        <EmptyState
          title="Failed to load system health"
          description={error}
          icon="error"
          action={{ label: 'Retry', icon: 'refresh', onClick: refreshAll }}
        />
      </PageShell>
    );
  }

  return (
    <div className="animate-in">
      <PageShell>
        <FeatureStoryBanner story={getFeatureStory('system')} />

        <div className="flex flex-col gap-4">
          <PageHeader
            title="System Health"
            subtitle="Real-time server performance metrics and application logs."
            meta={`Updated ${formatDateTime(overview?.generatedAt)}`}
            actions={
              <>
                <Button
                  variant="secondary"
                  icon="refresh"
                  onClick={refreshAll}
                  disabled={loadingOverview || loadingServices || loadingLogs}
                >
                  Refresh
                </Button>
                <Guard user={user} permission="SYSTEM_HEALTHCHECK">
                  <Button
                    variant="secondary"
                    icon="monitoring"
                    onClick={handleHealthCheck}
                    loading={healthLoading}
                  >
                    {healthLoading ? 'Checking...' : 'Run Health Check'}
                  </Button>
                </Guard>
                <Button variant="primary" icon="download" onClick={handleExportLogs}>
                  Export Logs
                </Button>
              </>
            }
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-section">
          <Card className="flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">Operating System</p>
                <h3 className="text-foreground text-xl font-bold">{overview?.platform || '-'}</h3>
              </div>
              <span className="material-symbols-outlined text-foreground text-4xl">computer</span>
            </div>
            <div className="text-xs text-muted-foreground">Host {overview?.hostname || '-'}</div>
          </Card>

          <Card className="flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">System Uptime</p>
                <h3 className="text-foreground text-xl font-bold">
                  {formatUptime(overview?.uptimeSeconds)}
                </h3>
              </div>
              <span className="material-symbols-outlined text-foreground text-4xl">timer</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Updated {formatTime(overview?.generatedAt)}
            </div>
          </Card>

          <Card className="flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">CPU Usage</p>
                <h3 className="text-foreground text-xl font-bold">
                  {overview?.cpuUsage != null ? `${overview.cpuUsage.toFixed(1)}%` : '-'}
                </h3>
              </div>
              <span className="material-symbols-outlined text-foreground text-4xl">memory</span>
            </div>
            <ProgressBar
              value={overview?.cpuUsage || 0}
              className="mb-2"
              trackClassName="bg-secondary border border-border h-1.5"
              barClassName="bg-foreground h-1.5"
            />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Load avg (1m): {load1 != null ? load1.toFixed(2) : '-'}
              </span>
              <span className="text-foreground font-medium">
                {overview?.cpuCount ? `${overview.cpuCount} Cores` : ''}
              </span>
            </div>
          </Card>

          <Card className="flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">Memory Usage</p>
                <h3 className="text-foreground text-xl font-bold">
                  {memoryUsedPercent != null ? `${memoryUsedPercent.toFixed(1)}%` : '-'}
                </h3>
              </div>
              <span className="material-symbols-outlined text-foreground text-4xl">storage</span>
            </div>
            <ProgressBar
              value={memoryUsedPercent != null ? Math.min(memoryUsedPercent, 100) : 0}
              className="mb-2"
              trackClassName="bg-secondary border border-border h-1.5"
              barClassName="bg-foreground h-1.5"
            />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {memoryUsed != null && memoryTotal != null
                  ? `${formatBytes(memoryUsed)} / ${formatBytes(memoryTotal)}`
                  : '-'}
              </span>
              <span className="text-foreground font-medium">{memoryStatus}</span>
            </div>
          </Card>
        </div>

        {disk && (
          <Card>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Disk Usage</p>
                <p className="text-lg font-semibold text-foreground">
                  {diskUsedPercent != null ? `${diskUsedPercent.toFixed(1)}%` : '-'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {disk?.freeBytes != null && disk?.totalBytes != null
                    ? `${formatBytes(disk.freeBytes)} free of ${formatBytes(disk.totalBytes)}`
                    : '-'}
                </p>
              </div>
              <div className="w-full md:max-w-md">
                <ProgressBar
                  value={diskUsedPercent != null ? Math.min(diskUsedPercent, 100) : 0}
                  trackClassName="bg-secondary border border-border"
                  barClassName="bg-foreground"
                />
              </div>
            </div>
          </Card>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="section-title">Services Status</h3>
            {loadingServices && <span className="text-xs text-muted-foreground">Loading...</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-section">
            {services.length === 0 && !loadingServices ? (
              <div className="col-span-full text-sm text-muted-foreground">
                No services available.
              </div>
            ) : (
              services.map((service) => {
                const status = STATUS_STYLES[service.status] || STATUS_STYLES.UNKNOWN;
                const hasLastSeenAt = Boolean(service.lastSeenAt);
                const timestampLabel = hasLastSeenAt ? 'Last seen' : 'Checked';
                const timestampValue = service.lastSeenAt || service.lastCheckedAt;
                return (
                  <Card
                    key={service.name}
                    variant="compact"
                    className="flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-3xl text-foreground">
                        {getServiceIcon(service.name)}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-foreground font-medium text-sm">{service.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {timestampLabel} {formatTime(timestampValue)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
                      <div className={`h-2 w-2 rounded-full ${status.dot}`} />
                      <Guard user={user} permission="SYSTEM_RESTART">
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setRestartTarget(service);
                            setRestartConfirm('');
                          }}
                          aria-label={`Restart ${service.name}`}
                        >
                          <span className="material-symbols-outlined text-lg">restart_alt</span>
                        </button>
                      </Guard>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="section-title">System Logs</h3>
            <div className="flex flex-wrap gap-3">
              <div className="relative group">
                <Input
                  icon="search"
                  placeholder="Filter logs..."
                  type="text"
                  value={logQuery}
                  onChange={(event) => setLogQuery(event.target.value)}
                  className="w-52 md:w-72"
                />
              </div>
              <Select
                value={logLevel}
                onChange={(event) => setLogLevel(event.target.value)}
                className="w-auto cursor-pointer"
              >
                {LEVEL_OPTIONS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <Card variant="table" className="flex flex-col">
            <Table>
              <Thead>
                <Tcell as="th" className="w-48 font-mono">
                  Timestamp
                </Tcell>
                <Tcell as="th" className="w-28 text-center">
                  Level
                </Tcell>
                <Tcell as="th" className="w-40 text-center">
                  Source
                </Tcell>
                <Tcell as="th">Message</Tcell>
                <Tcell as="th" className="w-16 text-center"></Tcell>
              </Thead>
              <tbody>
                {loadingLogs && logs.length === 0 ? (
                  <TableEmpty colSpan={5}>Loading logs...</TableEmpty>
                ) : filteredLogs.length === 0 ? (
                  <TableEmpty colSpan={5}>No logs match the current filters.</TableEmpty>
                ) : (
                  filteredLogs.map((log) => (
                    <Trow key={log.id} className="group">
                      <Tcell className="text-muted-foreground font-mono text-xs">
                        {formatDateTime(log.createdAt)}
                      </Tcell>
                      <Tcell className="text-center">
                        <StatusBadge variant={LEVEL_STYLES[log.level] || 'neutral'}>
                          {log.level}
                        </StatusBadge>
                      </Tcell>
                      <Tcell className="text-foreground text-center">{log.component || '-'}</Tcell>
                      <Tcell className="text-foreground font-mono text-xs">{log.message}</Tcell>
                      <Tcell className="text-center">
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleCopyLog(log)}
                        >
                          <span className="material-symbols-outlined text-base">content_copy</span>
                        </button>
                      </Tcell>
                    </Trow>
                  ))
                )}
              </tbody>
            </Table>
            <TableFooter>
              <span className="text-xs text-muted-foreground">
                Showing {rangeStart} to {rangeEnd} of {totalLogs} logs
              </span>
              <div className="flex gap-2">
                <button
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 border border-transparent hover:border-border transition-all"
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: Math.max(prev.page - 1, 1) }))
                  }
                  disabled={pagination.page <= 1}
                >
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                <button
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 border border-transparent hover:border-border transition-all"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: prev.page * prev.pageSize < totalLogs ? prev.page + 1 : prev.page,
                    }))
                  }
                  disabled={pagination.page * pagination.pageSize >= totalLogs}
                >
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>
            </TableFooter>
          </Card>
        </div>
      </PageShell>

      <ConfirmDialog
        open={Boolean(restartTarget)}
        title={restartTarget ? `Restart ${restartTarget.name}` : 'Restart Service'}
        desc="This will request a service restart and add an entry to system logs."
        confirmText={restartLoading ? 'Restarting...' : 'Restart Service'}
        danger
        onConfirm={handleRestart}
        onClose={() => {
          setRestartTarget(null);
          setRestartConfirm('');
        }}
        confirmValue={restartConfirm}
        confirmExpected={restartTarget?.name || null}
        onConfirmValueChange={setRestartConfirm}
        confirmLabel="Type service name to confirm"
        confirmPlaceholder={restartTarget?.name || ''}
        confirmHint="Restart requests are logged for audit."
        confirmDisabled={restartLoading}
      />
    </div>
  );
};

export default SystemHealth;
