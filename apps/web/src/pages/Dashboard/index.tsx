import { useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Store,
  BadgeCheck,
  Cloud,
  HeartPulse,
  Monitor,
  Clock,
  ArrowRight,
  Cpu,
  ShieldAlert,
  Wifi,
  History,
  FileSpreadsheet,
  Activity,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataTable } from '@/components/shared/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import PageShell from '@/components/ui/PageShell';
import { Guard } from '@/components/auth/Guard';
import FeatureStoryBanner from '@/components/FeatureStoryBanner';
import { hasPermission, Permissions } from '@/lib/auth/permissions';
import { formatDate, formatDateTime, formatTime } from '@/lib/date';
import { getWibToday, isWithinEodWindowNow } from '@/lib/date';
import { getFeatureStory } from '@/data/stories';
import { cn } from '@/lib/utils';
import type { DashboardSummary, Alert } from './types';
import { useDashboard } from './hooks/useDashboard';

const SEVERITY_STYLES: Record<
  string,
  { label: string; variant: 'destructive' | 'warning' | 'success' | 'default' }
> = {
  HIGH: { label: 'High', variant: 'destructive' },
  MEDIUM: { label: 'Medium', variant: 'warning' },
  LOW: { label: 'Info', variant: 'default' },
};

function formatAlertType(value: string) {
  if (!value) return '-';
  return value
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getHealthConfig(systemHealth: string) {
  switch (systemHealth) {
    case 'OK':
      return {
        label: 'Operational',
        dot: 'bg-emerald-500',
        pulse: 'bg-emerald-500/70',
        subtext: 'All systems normal',
      };
    case 'WARNING':
      return {
        label: 'Degraded',
        dot: 'bg-amber-500',
        pulse: null,
        subtext: 'Some services degraded',
      };
    case 'CRITICAL':
      return {
        label: 'Critical',
        dot: 'bg-red-500',
        pulse: null,
        subtext: 'Immediate attention needed',
      };
    default:
      return {
        label: systemHealth || 'Unknown',
        dot: 'bg-muted-foreground',
        pulse: null,
        subtext: 'Status unavailable',
      };
  }
}

export default function DashboardPage() {
  const { api, user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const {
    summary,
    alerts,
    loading,
    error,
    syncing,
    fetchData,
    handleManualSync,
    autoSyncAttempted,
  } = useDashboard(api);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh during EOD window
  useEffect(() => {
    if (!summary) return;
    if (!isWithinEodWindowNow()) return;
    const interval = setInterval(() => fetchData({ silent: true }), 60_000);
    return () => clearInterval(interval);
  }, [fetchData, summary]);

  // Midnight refresh
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const scheduleMidnightRefresh = () => {
      const today = getWibToday();
      const todayStart = new Date(`${today}T00:00:00+07:00`);
      if (isNaN(todayStart.getTime())) return;
      const nextMidnightMs = todayStart.getTime() + 24 * 60 * 60 * 1000;
      const delayMs = Math.max(0, nextMidnightMs - Date.now()) + 1500;
      timeoutId = setTimeout(async () => {
        await fetchData({ silent: true });
        scheduleMidnightRefresh();
      }, delayMs);
    };
    scheduleMidnightRefresh();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchData]);

  // Auto-sync on empty data
  useEffect(() => {
    if (!summary || autoSyncAttempted.current) return;
    const { storesTotal, eod } = summary;
    if (storesTotal !== 0 || (eod?.done ?? 0) > 0) return;
    autoSyncAttempted.current = true;
    handleManualSync().then((res) => {
      if (res.ok) {
        push({
          variant: 'info' as const,
          title: 'No data detected',
          message: 'Fetching latest data from API...',
        });
      }
    });
  }, [summary, autoSyncAttempted, handleManualSync, push]);

  const handleBackup = useCallback(async () => {
    if (user?.isDemo) {
      push({
        variant: 'warning' as const,
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
      return;
    }
    try {
      const res = await api.post('/backups/run', { type: 'manual' });
      if (!res.ok) throw new Error(res.error?.message || 'Backup failed');
      push({
        variant: 'success' as const,
        title: 'Backup queued',
        message: (res.data as { fileName?: string }).fileName,
      });
    } catch (err) {
      push({
        variant: 'error' as const,
        title: 'Backup failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [api, push, user]);

  if (loading) {
    return (
      <PageShell>
        <FeatureStoryBanner story={getFeatureStory('dashboard')} />
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <FeatureStoryBanner story={getFeatureStory('dashboard')} />
        <EmptyState
          title="Failed to load dashboard"
          description={error}
          icon={<AlertTriangle className="size-8" />}
          action={
            <Button onClick={() => fetchData()}>
              <RefreshCw /> Retry
            </Button>
          }
        />
      </PageShell>
    );
  }

  if (!summary) {
    return (
      <PageShell>
        <FeatureStoryBanner story={getFeatureStory('dashboard')} />
        <EmptyState
          title="No summary data"
          description="Dashboard data is unavailable."
          icon={<Monitor className="size-8" />}
        />
      </PageShell>
    );
  }

  const {
    storesTotal,
    eod,
    systemHealth,
    interactionsToday,
    backups,
    employees,
    agents,
    violations,
    sync,
  } = summary;
  const completionRate = storesTotal ? Math.round(((eod?.done ?? 0) / storesTotal) * 100) : 0;
  const health = getHealthConfig(systemHealth);

  return (
    <PageShell>
      <FeatureStoryBanner story={getFeatureStory('dashboard')} />

      <PageHeader
        title="Operations Hub"
        description={`Business date ${formatDate(getWibToday())}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData()}
              disabled={loading || syncing}
              title="Manual Refresh"
            >
              {syncing ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              <span className="hidden sm:inline ml-2">Refresh</span>
            </Button>
            <Guard permission={Permissions.EOD_SYNC as any}>
              <Button
                size="sm"
                onClick={handleManualSync}
                disabled={syncing}
                className="bg-primary hover:bg-primary/90"
              >
                <Wifi className="size-4 mr-2" />
                Trigger Sync
              </Button>
            </Guard>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Column: Main Monitor */}
        <div className="xl:col-span-3 space-y-6">
          {/* Top KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Global Health"
              value={health.label}
              icon={<HeartPulse className="size-5" />}
              accent={health.dot.replace('bg-', 'text-')}
              subtext={health.subtext}
              onClick={() => navigate('/system')}
            />
            <StatCard
              title="Sync Status"
              value={sync ? `${sync.healthyPercentage}%` : '--'}
              icon={<Wifi className="size-5" />}
              accent={
                (sync?.staleCount || 0) + (sync?.problemCount || 0) > 0
                  ? 'text-status-warning'
                  : 'text-status-success'
              }
              subtext={`${(sync?.staleCount || 0) + (sync?.problemCount || 0)} active alerts`}
              onClick={() => navigate('/sync')}
            />
            <StatCard
              title="EOD Completion"
              value={`${completionRate}%`}
              icon={<BadgeCheck className="size-5" />}
              accent={completionRate === 100 ? 'text-status-success' : 'text-primary'}
              subtext={`${eod?.done ?? 0} of ${storesTotal ?? 0} stores`}
              onClick={() => navigate('/eod')}
            />
            <StatCard
              title="Active Nodes"
              value={`${agents?.onlineCount ?? 0}/${agents?.activeCount ?? 0}`}
              icon={<Monitor className="size-5" />}
              subtext={`${agents?.updatePending ?? 0} need update`}
              onClick={() => navigate('/office-agents')}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Status Consolidated */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Operational Pulse
                  </CardTitle>
                  <StatusBadge variant={health.label === 'Operational' ? 'success' : 'warning'}>
                    LIVE
                  </StatusBadge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-background border">
                      <Clock className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Last EOD Sync</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-tight">
                        Across 8 regions
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-mono font-bold text-foreground">
                    {eod?.lastSyncAt ? formatTime(eod.lastSyncAt) : '--:--:--'}
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-background border">
                      <Cloud className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Backup Status</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-tight">
                        Database & Media
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        'text-sm font-bold',
                        (backups?.failedCount ?? 0) > 0
                          ? 'text-status-error'
                          : 'text-status-success'
                      )}
                    >
                      {(backups?.failedCount ?? 0) > 0 ? 'DEGRADED' : 'SUCCESS'}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase">
                      {backups?.failedCount ?? 0} Failed
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-background border">
                      <Zap className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Worker Interactions</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-tight">
                        Active sessions today
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-mono font-bold text-foreground">
                    {interactionsToday ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Recent Alerts
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] font-bold"
                    onClick={() => navigate('/sync')}
                  >
                    VIEW ALL <ArrowRight className="ml-1 size-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                    <CheckCircle2 className="size-8 text-status-success/40 mb-2" />
                    <p className="text-xs text-muted-foreground">All clear. No active alerts.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {alerts.slice(0, 4).map((alert) => (
                      <div key={alert.id} className="p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start gap-3">
                          <ShieldAlert
                            className={cn(
                              'size-4 shrink-0 mt-0.5',
                              alert.severity === 'HIGH'
                                ? 'text-status-error'
                                : 'text-status-warning'
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground leading-none mb-1">
                              {alert.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase truncate">
                              {formatAlertType(alert.type)} • {formatDateTime(alert.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Quick Actions & Links */}
        <div className="space-y-6">
          <Card className="bg-primary/[0.03] border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2">
              <ActionButton
                icon={<Monitor className="size-4" />}
                label="Monitor EOD"
                onClick={() => navigate('/eod')}
              />
              <ActionButton
                icon={<Cloud className="size-4" />}
                label="Trigger Backup"
                onClick={handleBackup}
                disabled={user?.isDemo}
              />
              <ActionButton
                icon={<RefreshCw className="size-4" />}
                label="Run Audit"
                onClick={async () => {
                  if (user?.isDemo) {
                    push({
                      variant: 'warning',
                      title: 'Demo Account',
                      message: 'This action is not available in the demo account.',
                    });
                    return;
                  }
                  push({
                    variant: 'info',
                    title: 'Running Store Audit',
                    message: 'Polling store synchronization clocks...',
                  });
                  const res = await handleManualSync();
                  if (res.ok) {
                    push({
                      variant: 'success',
                      title: 'Audit Complete',
                      message: 'Successfully polled all active store endpoints.',
                    });
                  } else {
                    push({
                      variant: 'error',
                      title: 'Audit Failed',
                      message: res.error || 'Failed to poll store status.',
                    });
                  }
                }}
              />
              <ActionButton
                icon={<Zap className="size-4" />}
                label="Deploy Agents"
                onClick={() => navigate('/office-agents')}
                disabled={user?.isDemo}
              />
              <ActionButton
                icon={<Activity className="size-4" />}
                label="Check System"
                onClick={() => navigate('/system')}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <Link
                to="/about"
                className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors text-xs font-medium text-foreground/80"
              >
                Portfolio Story <ArrowRight className="size-3" />
              </Link>
              <a
                href="https://github.com/trefeon/enterprise-ops-monitor"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors text-xs font-medium text-foreground/80"
              >
                GitHub Repo <ArrowRight className="size-3" />
              </a>
              <Link
                to="/profile"
                className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors text-xs font-medium text-foreground/80"
              >
                System Profile <ArrowRight className="size-3" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      className={cn(
        'group w-full justify-start h-10 px-3 text-xs font-semibold border border-transparent hover:border-border hover:bg-background transition-all',
        disabled && 'opacity-50 grayscale pointer-events-none'
      )}
      onClick={onClick}
    >
      <span className="mr-3 text-muted-foreground">{icon}</span>
      {label}
      <ArrowRight className="ml-auto size-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
    </Button>
  );
}
