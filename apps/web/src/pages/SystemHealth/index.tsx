import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Guard } from '../../components/auth/Guard';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DashboardLayout } from '@/components/base/dashboard-layout';
import { PageTemplate, KpiRow, SectionHeading, TableCard } from '@/components/template';
import { DataTable } from '@/components/ui/data-table';
import { formatDateTime, formatTime } from '../../lib/date';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getFeatureStory } from '../../data/stories';
import { AlertTriangle, RefreshCw } from 'lucide-react';
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
  Copy,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { demoBlocked } from '@/components/base/demo-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OverviewData {
  platform?: string;
  hostname?: string;
  uptimeSeconds?: number;
  cpuUsage?: number;
  cpuCount?: number;
  loadavg?: number[];
  memory?: {
    totalBytes?: number;
    freeBytes?: number;
  };
  disk?: {
    usedPercent?: number;
    freeBytes?: number;
    totalBytes?: number;
  };
  generatedAt?: string;
}

interface ServiceData {
  name: string;
  status: string;
  lastSeenAt?: string;
  lastCheckedAt?: string;
}

interface LogData {
  id: string | number;
  createdAt: string;
  level: string;
  component?: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEVEL_OPTIONS = ['ALL', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'] as const;

const SERVICE_ICONS: Record<string, typeof Database> = {
  Database: Database,
  API: Globe,
  'Bot Service': Bot,
  Scheduler: Clock,
  'Backup Service': Cloud,
};

const getServiceIcon = (name: string) => {
  return SERVICE_ICONS[name] || Settings;
};

const STATUS_STYLES: Record<string, { label: string; variant: string; dot: string }> = {
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
    variant: 'secondary',
    dot: 'bg-muted-foreground',
  },
};

const LEVEL_STYLES: Record<string, string> = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'error',
};
const SYSTEM_LOG_EXPORT_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatBytes = (value: number | undefined | null) => {
  if (!Number.isFinite(value)) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
  let size = value as number;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const precision = size >= 10 || unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
};

const formatUptime = (value: number | undefined | null) => {
  if (!Number.isFinite(value)) return '-';
  const totalSeconds = Math.max(0, Math.floor(value as number));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

function base64ToBlob(base64: string, contentType: string) {
  const binary = atob(String(base64 || ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: contentType });
}

function normalizeSystemLogsExportFileName(fileName: string, contentType: string) {
  const fallbackName = `system_logs_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const rawName = String(fileName || '').trim() || fallbackName;
  const isWorkbook = String(contentType || '').includes('spreadsheetml.sheet');

  if (!isWorkbook) return rawName;
  if (rawName.toLowerCase().endsWith('.xlsx')) return rawName;
  if (rawName.toLowerCase().endsWith('.xls')) return `${rawName.slice(0, -4)}.xlsx`;
  return `${rawName}.xlsx`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SystemHealth = () => {
  const { api, user } = useAuth();

  const isDemoUser: boolean = user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo';
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [logs, setLogs] = useState<LogData[]>([]);
  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);
  const [loadingServices, setLoadingServices] = useState<boolean>(true);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [logQuery, setLogQuery] = useState<string>('');
  const [logLevel, setLogLevel] = useState<string>('ALL');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0 });
  const [restartTarget, setRestartTarget] = useState<ServiceData | null>(null);
  const [restartConfirm, setRestartConfirm] = useState<string>('');
  const [restartLoading, setRestartLoading] = useState<boolean>(false);
  const [healthLoading, setHealthLoading] = useState<boolean>(false);

  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    setError(null);
    try {
      const res = await api.get('/system/overview');
      if (!res.ok) throw new Error(res.error?.message || 'Failed to load system overview');
      setOverview(res.data as OverviewData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load system overview';
      setError(message);
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
      setServices((res.data || []) as ServiceData[]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load services';
      setError(message);
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
      setLogs((res.data || []) as LogData[]);
      if (res.meta?.pagination) {
        setPagination((prev) => ({ ...prev, ...res.meta.pagination }));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load logs';
      setError(message);
    } finally {
      setLoadingLogs(false);
    }
  }, [api, pagination.page, pagination.pageSize]);

  const refreshAll = useCallback(async () => {
    if (isDemoUser) {
      demoBlocked();
      return;
    }
    setError(null);
    await Promise.all([fetchOverview(), fetchServices(), fetchLogs()]);
  }, [fetchLogs, fetchOverview, fetchServices, isDemoUser]);

  useEffect(() => {
    fetchOverview();
    fetchServices();
  }, [fetchOverview, fetchServices]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleHealthCheck = async () => {
    if (isDemoUser) {
      demoBlocked();
      return;
    }
    setHealthLoading(true);
    try {
      const res = await api.post('/system/healthcheck');
      if (!res.ok) throw new Error(res.error?.message || 'Health check failed');
      const result = (res.data || {}) as Record<string, string>;
      const summary = [
        `DB ${result.database || '-'}`,
        `API ${result.api || '-'}`,
        `Scheduler ${result.scheduler || '-'}`,
        `Backup ${result.backup || '-'}`,
      ].join(' | ');
      toast.success('Health check complete', { description: summary });
      fetchServices();
      fetchLogs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Health check failed';
      toast.error('Health check failed', { description: message });
    } finally {
      setHealthLoading(false);
    }
  };

  const handleRestart = async () => {
    if (!restartTarget) return;
    if (isDemoUser) {
      demoBlocked();
      setRestartTarget(null);
      setRestartConfirm('');
      return;
    }
    setRestartLoading(true);
    try {
      const res = await api.post(
        `/system/services/${encodeURIComponent(restartTarget.name)}/restart`,
        { confirm: true }
      );
      if (!res.ok) throw new Error(res.error?.message || 'Restart failed');
      toast.warning('Restart requested', { description: `${restartTarget.name} is restarting.` });
      setRestartTarget(null);
      setRestartConfirm('');
      fetchLogs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Restart failed';
      toast.error('Restart failed', { description: message });
    } finally {
      setRestartLoading(false);
    }
  };

  const handleCopyLog = useCallback(async (log: LogData) => {
    const payload = `${log.createdAt} [${log.level}] ${log.component}: ${log.message}`;
    try {
      await navigator.clipboard.writeText(payload);
      toast.success('Copied', { description: 'Log entry copied.' });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Clipboard unavailable.');
      toast.error('Copy failed', { description: error?.message });
    }
  }, []);

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
      demoBlocked();
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

      const exportData = (res.data || {}) as { contentType?: string; contentBase64?: string; content?: string; fileName?: string };
      const contentType = exportData.contentType || SYSTEM_LOG_EXPORT_MIME;
      const contentBase64 = String(exportData.contentBase64 || exportData.content || '');
      if (!contentBase64) throw new Error('Export content unavailable');

      const blob = base64ToBlob(contentBase64, contentType);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = normalizeSystemLogsExportFileName(exportData.fileName || '', contentType);
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Export ready', { description: 'Logs Excel downloaded.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed';
      toast.error('Export failed', { description: message });
    }
  };

  const loadValues = overview?.loadavg || [];
  const load1 = Number.isFinite(loadValues[0]) ? loadValues[0] : null;

  const memoryTotal = overview?.memory?.totalBytes;
  const memoryFree = overview?.memory?.freeBytes;
  const memoryUsed =
    Number.isFinite(memoryTotal) && Number.isFinite(memoryFree)
      ? Math.max((memoryTotal as number) - (memoryFree as number), 0)
      : null;
  const memoryUsedPercent =
    memoryUsed != null && (memoryTotal as number) > 0 ? (memoryUsed / (memoryTotal as number)) * 100 : null;
  const memoryStatus =
    memoryUsedPercent == null
      ? 'Unknown'
      : memoryUsedPercent >= 90
        ? 'Critical'
        : memoryUsedPercent >= 75
          ? 'High'
          : 'Healthy';

  const disk = overview?.disk;
  const diskUsedPercent = Number.isFinite(disk?.usedPercent) ? disk!.usedPercent : null;

  const logColumns = useMemo(
    () => [
      {
        header: 'Timestamp',
        className: 'w-48 tabular-nums text-xs text-muted-foreground',
        render: (log: LogData) => formatDateTime(log.createdAt),
      },
      {
        header: 'Level',
        className: 'w-28 text-center',
        render: (log: LogData) => (
          <StatusBadge variant={(LEVEL_STYLES[log.level] || 'neutral') as 'info' | 'warning' | 'error' | 'neutral'}>{log.level}</StatusBadge>
        ),
      },
      {
        header: 'Source',
        className: 'w-40 text-center text-foreground',
        render: (log: LogData) => log.component || '-',
      },
      {
        header: 'Message',
        className: 'min-w-80 max-w-2xl whitespace-normal text-sm leading-5 text-foreground',
        render: (log: LogData) => log.message,
      },
      {
        header: '',
        className: 'w-16 text-center',
        render: (log: LogData) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Copy log entry"
            className="size-8 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyLog(log);
            }}
          >
            <Copy className="size-4" aria-hidden="true" />
          </Button>
        ),
      },
    ],
    [handleCopyLog]
  );

  // -----------------------------------------------------------------------
  // Error state – no data at all (bypasses template per spec §2 rule 5)
  // -----------------------------------------------------------------------

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
      <DashboardLayout>
        <EmptyState
          title="Failed to load system health"
          description={error}
          icon={<AlertTriangle className="size-8" aria-hidden="true" />}
          action={
            <Button onClick={refreshAll}>
              <RefreshCw className="mr-2 size-4" aria-hidden="true" /> Retry
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
      story={getFeatureStory('system')}
      title="System Health"
      subtitle="Real-time server performance metrics and application logs."
      actions={
        <>
          <Button
            variant="secondary"
            onClick={refreshAll}
            disabled={loadingOverview || loadingServices || loadingLogs}
          >
            {loadingOverview || loadingServices || loadingLogs ? (
              <Loader2 className="animate-spin mr-2" aria-hidden="true" />
            ) : (
              <RotateCw className="mr-2 size-4" aria-hidden="true" />
            )}
            Refresh
          </Button>
          <Guard user={user} permission="SYSTEM_HEALTHCHECK">
            <Button variant="secondary" onClick={handleHealthCheck}>
              {healthLoading ? (
                <Loader2 className="animate-spin mr-2" aria-hidden="true" />
              ) : (
                <Activity className="mr-2 size-4" aria-hidden="true" />
              )}
              {healthLoading ? 'Checking...' : 'Run Health Check'}
            </Button>
          </Guard>
          <Button onClick={handleExportLogs}>
            <Download className="mr-2 size-4" aria-hidden="true" />
            Export Logs
          </Button>
        </>
      }
    >
      {/* KPI row: OS, Uptime, CPU, Memory */}
      <KpiRow>
        {/* OS Card */}
        <Card className="flex flex-col justify-between">
          <CardContent>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">Operating System</p>
                <h3 className="text-foreground text-xl font-medium break-words">
                  {overview?.platform || '-'}
                </h3>
              </div>
              <Monitor className="size-8 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="text-xs text-muted-foreground break-words">
              Host {overview?.hostname || '-'}
            </div>
          </CardContent>
        </Card>

        {/* Uptime Card */}
        <Card className="flex flex-col justify-between">
          <CardContent>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">System Uptime</p>
                <h3 className="text-foreground text-xl font-medium">
                  {formatUptime(overview?.uptimeSeconds)}
                </h3>
              </div>
              <Timer className="size-8 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="text-xs text-muted-foreground">
              Updated {formatTime(overview?.generatedAt)}
            </div>
          </CardContent>
        </Card>

        {/* CPU Card */}
        <Card className="flex flex-col justify-between">
          <CardContent>
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">CPU Usage</p>
                <h3 className="text-foreground text-xl font-medium tabular-nums">
                  {overview?.cpuUsage != null ? `${overview.cpuUsage.toFixed(1)}%` : '-'}
                </h3>
              </div>
              <Cpu className="size-8 text-muted-foreground" aria-hidden="true" />
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

        {/* Memory Card */}
        <Card className="flex flex-col justify-between">
          <CardContent>
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">Memory Usage</p>
                <h3 className="text-foreground text-xl font-medium tabular-nums">
                  {memoryUsedPercent != null ? `${memoryUsedPercent.toFixed(1)}%` : '-'}
                </h3>
              </div>
              <HardDrive className="size-8 text-muted-foreground" aria-hidden="true" />
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
      </KpiRow>

      {/* Disk Usage (conditional) */}
      {disk && (
        <Card>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Disk Usage</p>
                <p className="text-lg font-medium text-foreground tabular-nums">
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

      {/* Services Status */}
      <SectionHeading
        title="Services Status"
        actions={
          loadingServices ? <span className="text-xs text-muted-foreground">Loading...</span> : undefined
        }
      />
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
                className="group relative overflow-hidden transition-[border-color,transform] duration-150 hover:border-primary/50"
              >
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted/50 text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge
                        variant={status.variant as 'success' | 'warning' | 'secondary' | 'outline'}
                        className="h-4 px-1.5 live-text-3xs uppercase font-medium tracking-wider"
                      >
                        {status.label}
                      </StatusBadge>
                      <div className={`size-2 shrink-0 rounded-full ${status.dot}`} />
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-col">
                    <span className="break-words text-sm font-medium text-foreground tracking-tight">
                      {service.name}
                    </span>
                    <span className="break-words live-text-3xs text-muted-foreground uppercase font-medium tracking-wide">
                      {timestampLabel} {formatTime(timestampValue)}
                    </span>
                  </div>

                  <Guard user={user} permission="SYSTEM_RESTART">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute bottom-2 right-2 size-8 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100 focus:opacity-100"
                      onClick={() => {
                        setRestartTarget(service);
                        setRestartConfirm('');
                      }}
                      aria-label={`Restart ${service.name}`}
                    >
                      <RotateCw className="size-4" aria-hidden="true" />
                    </Button>
                  </Guard>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* System Logs */}
      <TableCard
        title="System Logs"
        toolbar={
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
            <div className="relative group">
              <div className="relative w-full">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                  <Search className="size-4" aria-hidden="true" />
                </span>
                <Input
                  aria-label="Filter logs"
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
              onValueChange={(val) => setLogLevel(val ?? 'ALL')}
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
        }
      >
        <DataTable
          columns={logColumns}
          data={filteredLogs}
          loading={loadingLogs && logs.length === 0}
          pagination={{
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total || logs.length || 0,
          }}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          onPageSizeChange={(pageSize) =>
            setPagination((prev) => ({ ...prev, pageSize, page: 1 }))
          }
          keyExtractor={(row) => row.id}
        />
      </TableCard>

      {/* Restart confirmation */}
      <div className="overscroll-contain">
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
          confirmExpected={restartTarget?.name ?? null}
          onConfirmValueChange={(v) => setRestartConfirm(v)}
          confirmLabel="Type service name to confirm"
          confirmPlaceholder={restartTarget?.name || ''}
          confirmHint="Restart requests are logged for audit."
          confirmDisabled={restartLoading}
        />
      </div>
    </PageTemplate>
  );
};

export default SystemHealth;
