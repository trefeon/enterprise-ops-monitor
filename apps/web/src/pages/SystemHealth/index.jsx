import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Guard } from '../../components/auth/Guard';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/ToastContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ProgressBar from '../../components/ui/ProgressBar';
import PageShell from '../../components/ui/PageShell';
import PageHeader from '../../components/ui/PageHeader';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDateTime, formatTime } from '../../lib/date';
import StatusBadge from '../../components/ui/StatusBadge';
import { getFeatureStory } from '../../data/stories';
import {
  Loader2,
  Database,
  Globe,
  Bot,
  Clock,
  Cloud,
  Settings,
  RotateCw,
  Monitor,
  Timer,
  Cpu,
  HardDrive,
  Search,
  Activity,
  Download,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const LEVEL_OPTIONS = ['ALL', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];

const SERVICE_ICONS = {
  Database: Database,
  API: Globe,
  'Bot Service': Bot,
  Scheduler: Clock,
  'Backup Service': Cloud,
};

const getServiceIcon = (name) => {
  return SERVICE_ICONS[name] || Settings;
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
      push({
        variant: 'warning',
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
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
      push({
        variant: 'warning',
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
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
      push({
        variant: 'warning',
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
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
    <div>
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
                  onClick={refreshAll}
                  disabled={loadingOverview || loadingServices || loadingLogs}
                >
                  {loadingOverview || loadingServices || loadingLogs ? (
                    <Loader2 className="animate-spin mr-2" />
                  ) : (
                    <RotateCw className="mr-2 size-4" />
                  )}
                  Refresh
                </Button>
                <Guard user={user} permission="SYSTEM_HEALTHCHECK">
                  <Button variant="secondary" onClick={handleHealthCheck}>
                    {healthLoading ? (
                      <Loader2 className="animate-spin mr-2" />
                    ) : (
                      <Activity className="mr-2 size-4" />
                    )}
                    {healthLoading ? 'Checking...' : 'Run Health Check'}
                  </Button>
                </Guard>
                <Button onClick={handleExportLogs}>
                  <Download className="mr-2 size-4" />
                  Export Logs
                </Button>
              </>
            }
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-section">
          <Card className="flex flex-col justify-between">
            <CardContent>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-muted-foreground text-sm font-medium mb-1">Operating System</p>
                  <h3 className="text-foreground text-xl font-bold">{overview?.platform || '-'}</h3>
                </div>
                <Monitor className="size-8 text-muted-foreground" />
              </div>
              <div className="text-xs text-muted-foreground">Host {overview?.hostname || '-'}</div>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between">
            <CardContent>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-muted-foreground text-sm font-medium mb-1">System Uptime</p>
                  <h3 className="text-foreground text-xl font-bold">
                    {formatUptime(overview?.uptimeSeconds)}
                  </h3>
                </div>
                <Timer className="size-8 text-muted-foreground" />
              </div>
              <div className="text-xs text-muted-foreground">
                Updated {formatTime(overview?.generatedAt)}
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between">
            <CardContent>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-muted-foreground text-sm font-medium mb-1">CPU Usage</p>
                  <h3 className="text-foreground text-xl font-bold">
                    {overview?.cpuUsage != null ? `${overview.cpuUsage.toFixed(1)}%` : '-'}
                  </h3>
                </div>
                <Cpu className="size-8 text-muted-foreground" />
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
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between">
            <CardContent>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-muted-foreground text-sm font-medium mb-1">Memory Usage</p>
                  <h3 className="text-foreground text-xl font-bold">
                    {memoryUsedPercent != null ? `${memoryUsedPercent.toFixed(1)}%` : '-'}
                  </h3>
                </div>
                <HardDrive className="size-8 text-muted-foreground" />
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
            </CardContent>
          </Card>
        </div>

        {disk && (
          <Card>
            <CardContent>
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
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="section-title">Services Status</h3>
            {loadingServices && <span className="text-xs text-muted-foreground">Loading...</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {services.length === 0 && !loadingServices ? (
              <div className="col-span-full text-sm text-muted-foreground">
                No services available.
              </div>
            ) : (
              services.map((service) => {
                const status = STATUS_STYLES[service.status] || STATUS_STYLES.UNKNOWN;
                const hasLastSeenAt = Boolean(service.lastSeenAt);
                const timestampLabel = hasLastSeenAt ? 'seen' : 'checked';
                const timestampValue = service.lastSeenAt || service.lastCheckedAt;
                const Icon = getServiceIcon(service.name);

                return (
                  <Card
                    key={service.name}
                    className="group relative overflow-hidden transition-all hover:border-primary/50"
                  >
                    <CardContent className="p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-muted/50 text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <Icon className="size-5" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <StatusBadge
                            variant={status.variant}
                            className="h-5 px-1.5 text-[10px] uppercase font-bold tracking-wider"
                          >
                            {status.label}
                          </StatusBadge>
                          <div className={`size-2 shrink-0 rounded-full ${status.dot}`} />
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-semibold text-foreground tracking-tight">
                          {service.name}
                        </span>
                        <span className="truncate text-[10px] text-muted-foreground uppercase font-medium tracking-wide">
                          {timestampLabel} {formatTime(timestampValue)}
                        </span>
                      </div>

                      <Guard user={user} permission="SYSTEM_RESTART">
                        <button
                          type="button"
                          className="absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100 focus:opacity-100"
                          onClick={() => {
                            setRestartTarget(service);
                            setRestartConfirm('');
                          }}
                          aria-label={`Restart ${service.name}`}
                        >
                          <RotateCw className="size-4" />
                        </button>
                      </Guard>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="section-title">System Logs</h3>
            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              <div className="relative group">
                <div className="relative w-full">
                  <span className="absolute left-3 inset-y-0 flex items-center text-muted-foreground material-symbols-outlined text-xl leading-none pointer-events-none">
                    search
                  </span>
                  <Input
                    placeholder="Filter logs..."
                    type="text"
                    value={logQuery}
                    onChange={(event) => setLogQuery(event.target.value)}
                    className="w-full pl-10 sm:w-72"
                  />
                </div>
              </div>
              <Select
                value={logLevel}
                onValueChange={(val) => {
                  const event = {
                    target: {
                      value: val,
                    },
                  };

                  return setLogLevel(event.target.value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Level: All" />
                </SelectTrigger>
                <SelectContent>
                  {LEVEL_OPTIONS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="p-0 overflow-hidden flex flex-col">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48 tabular-nums">Timestamp</TableHead>
                    <TableHead className="w-28 text-center">Level</TableHead>
                    <TableHead className="w-40 text-center">Source</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-16 text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <tbody>
                  {loadingLogs && logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Loading logs...
                      </TableCell>
                    </TableRow>
                  ) : filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No logs match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id} className="group">
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {formatDateTime(log.createdAt)}
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusBadge variant={LEVEL_STYLES[log.level] || 'neutral'}>
                            {log.level}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-foreground text-center">
                          {log.component || '-'}
                        </TableCell>
                        <TableCell className="min-w-80 max-w-2xl whitespace-normal text-sm leading-5 text-foreground">
                          {log.message}
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleCopyLog(log)}
                          >
                            <span className="material-symbols-outlined text-base">
                              content_copy
                            </span>
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </tbody>
              </Table>
              <div className="flex flex-col gap-3 border-t border-border bg-card px-cell-x py-cell-y text-xs sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-muted-foreground">
                  Showing {rangeStart} to {rangeEnd} of {totalLogs} logs
                </span>
                <div className="flex w-full justify-end gap-2 sm:w-auto">
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
              </div>
            </CardContent>
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
