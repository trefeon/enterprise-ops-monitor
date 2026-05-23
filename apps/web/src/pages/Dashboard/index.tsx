import { useEffect, useCallback, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  CheckCircle2,
  BadgeCheck,
  Cloud,
  HeartPulse,
  Monitor,
  Clock,
  ArrowRight,
  ShieldAlert,
  Wifi,
  Activity,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import PageShell from '@/components/shared/PageShell';
import { Guard } from '@/components/auth/Guard';
import FeatureStoryBanner from '@/components/FeatureStoryBanner';
import { Permissions } from '@/lib/auth/permissions';
import { formatDate, formatDateTime, formatTime } from '@/lib/date';
import { getWibToday, isWithinEodWindowNow } from '@/lib/date';
import { getFeatureStory } from '@/data/stories';
import { cn } from '@/lib/utils';
import { useDashboard } from './hooks/useDashboard';

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
        label: 'Healthy',
        dot: 'bg-status-success',
        pulse: 'bg-status-success/70',
        subtext: 'All systems normal',
      };
    case 'WARNING':
      return {
        label: 'Warning',
        dot: 'bg-status-warning',
        pulse: null,
        subtext: 'Some services degraded',
      };
    case 'CRITICAL':
      return {
        label: 'Error',
        dot: 'bg-status-error',
        pulse: null,
        subtext: 'Immediate attention needed',
      };
    default:
      return {
        label: systemHealth || 'Bad',
        dot: 'bg-muted-foreground',
        pulse: null,
        subtext: 'Status unavailable',
      };
  }
}

export default function DashboardPage() {
  const { api, user } = useAuth();
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
        toast.info('No data detected', { description: 'Fetching latest data from API...' });
      }
    });
  }, [summary, autoSyncAttempted, handleManualSync]);

  const isDemoUser = user?.isDemo || user?.roleNames?.includes('demo');

  const handleRefresh = useCallback(() => {
    if (isDemoUser) {
      toast.warning('Demo Account', { description: 'This action is not available in the demo account.' });
      return;
    }
    fetchData();
  }, [isDemoUser, fetchData]);

  const handleBackup = useCallback(async () => {
    if (user?.isDemo) {
      toast.warning('Demo Account', { description: 'This action is not available in the demo account.' });
      return;
    }
    try {
      const res = await api.post('/backups/run', { type: 'manual' });
      if (!res.ok) throw new Error(res.error?.message || 'Backup failed');
      toast.success('Backup queued', { description: (res.data as { fileName?: string }).fileName });
    } catch (err) {
      toast.error('Backup failed', { description: err instanceof Error ? err.message : 'Unknown error' });
    }
  }, [api, user]);

  if (loading) {
    return (
      <PageShell>
        <FeatureStoryBanner story={getFeatureStory('dashboard')} />
        <Skeleton className="h-8 w-64" />
        <LoadingState title="Loading dashboard" rows={4} />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <FeatureStoryBanner story={getFeatureStory('dashboard')} />
        <ErrorState
          title="Failed to load dashboard"
          description={error}
          onRetry={() => fetchData()}
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
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
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
                className="min-w-0 bg-primary hover:bg-primary/90"
              >
                <Wifi className="size-4 mr-2" />
                <span className="truncate">Trigger Sync</span>
              </Button>
            </Guard>
          </>
        }
      />

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-4">
        {/* Left Column: Main Monitor */}
        <div className="min-w-0 space-y-6 xl:col-span-3">
          {/* Top KPI Row */}
          <div
            data-e2e="dashboard-kpi-grid"
            className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <StatCard
              className="min-h-32"
              title="Global Health"
              value={health.label}
              icon={<HeartPulse className="size-5" />}
              accent={health.dot.replace('bg-', 'text-')}
              subtext={health.subtext}
              onClick={() => navigate('/system')}
            />
            <StatCard
              className="min-h-32"
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
              className="min-h-32"
              title="EOD Completion"
              value={`${completionRate}%`}
              icon={<BadgeCheck className="size-5" />}
              accent={completionRate === 100 ? 'text-status-success' : 'text-primary'}
              subtext={`${eod?.done ?? 0} of ${storesTotal ?? 0} stores`}
              onClick={() => navigate('/eod')}
            />
            <StatCard
              className="min-h-32"
              title="Active Nodes"
              value={`${agents?.onlineCount ?? 0}/${agents?.activeCount ?? 0}`}
              icon={<Monitor className="size-5" />}
              subtext={`${agents?.updatePending ?? 0} need update`}
              onClick={() => navigate('/office-agents')}
            />
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
            {/* System Status Consolidated */}
            <Card data-e2e="dashboard-operational-pulse">
              <CardHeader className="pb-3">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <CardTitle className="min-w-0 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Operational Pulse
                  </CardTitle>
                  <StatusBadge variant={health.label === 'Healthy' ? 'success' : 'warning'}>
                    LIVE
                  </StatusBadge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border/50 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="shrink-0 rounded border bg-background p-2">
                      <Clock className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">Last EOD Sync</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-tight">
                        Across 8 regions
                      </p>
                    </div>
                  </div>
                  <p className="min-w-0 text-left font-mono text-sm font-bold text-foreground sm:text-right">
                    {eod?.lastSyncAt ? formatTime(eod.lastSyncAt) : '--:--:--'}
                  </p>
                </div>

                <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border/50 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="shrink-0 rounded border bg-background p-2">
                      <Cloud className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">Backup Status</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-tight">
                        Database & Media
                      </p>
                    </div>
                  </div>
                  <div className="min-w-0 text-left sm:text-right">
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
                    <p className="text-[10px] uppercase text-muted-foreground">
                      {backups?.failedCount ?? 0} Failed
                    </p>
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border/50 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="shrink-0 rounded border bg-background p-2">
                      <Zap className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">
                        Worker Interactions
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-tight">
                        Active sessions today
                      </p>
                    </div>
                  </div>
                  <p className="min-w-0 text-left font-mono text-sm font-bold text-foreground sm:text-right">
                    {interactionsToday ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card data-e2e="dashboard-alerts" className="flex min-w-0 flex-col">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <CardTitle className="min-w-0 text-sm font-bold uppercase tracking-wider text-muted-foreground">
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
                            <p className="text-xs font-bold text-foreground leading-none mb-1 break-words">
                              {alert.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase break-words">
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
        <div className="min-w-0 space-y-6">
          <Card data-e2e="dashboard-actions" className="border-primary/20 bg-primary/[0.03]">
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
                    toast.warning('Demo Account', { description: 'This action is not available in the demo account.' });
                    return;
                  }
                  toast.info('Running Store Audit', { description: 'Polling store synchronization clocks...' });
                  const res = await handleManualSync();
                  if (res.ok) {
                    toast.success('Audit Complete', { description: 'Successfully polled all active store endpoints.' });
                  } else {
                    toast.error('Audit Failed', { description: res.error || 'Failed to poll store status.' });
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
                className="flex min-w-0 items-center justify-between gap-3 rounded p-2 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted"
              >
                <span className="truncate">Portfolio Story</span>
                <ArrowRight className="size-3 shrink-0" />
              </Link>
              <a
                href="https://github.com/trefeon/enterprise-ops-monitor"
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center justify-between gap-3 rounded p-2 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted"
              >
                <span className="truncate">GitHub Repo</span>
                <ArrowRight className="size-3 shrink-0" />
              </a>
              <Link
                to="/profile"
                className="flex min-w-0 items-center justify-between gap-3 rounded p-2 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted"
              >
                <span className="truncate">System Profile</span>
                <ArrowRight className="size-3 shrink-0" />
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
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      className={cn(
        'group h-10 w-full min-w-0 justify-start border border-transparent px-3 text-xs font-semibold transition-all hover:border-border hover:bg-background',
        disabled && 'opacity-50 grayscale pointer-events-none'
      )}
      onClick={onClick}
    >
      <span className="mr-3 shrink-0 text-muted-foreground">{icon}</span>
      <span className="min-w-0 truncate">{label}</span>
      <ArrowRight className="ml-auto size-3 shrink-0 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
    </Button>
  );
}
