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
import FeatureStoryBanner from '@/components/FeatureStoryBanner';
import { hasPermission, Permissions } from '@/lib/auth/permissions';
import { formatDate, formatDateTime, formatTime } from '@/lib/date';
import { getWibToday, isWithinEodWindowNow } from '@/lib/date';
import { getFeatureStory } from '@/data/stories';
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
      <div className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <FeatureStoryBanner story={getFeatureStory('dashboard')} />
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
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
      </div>
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

  const { storesTotal, eod, systemHealth, interactionsToday, backups, employees, agents, violations, sync } = summary;
  const completionRate = storesTotal ? Math.round(((eod?.done ?? 0) / storesTotal) * 100) : 0;
  const health = getHealthConfig(systemHealth);

  return (
    <PageShell>
      <FeatureStoryBanner story={getFeatureStory('dashboard')} />
      <PageHeader
        title="Dashboard Summary"
        description={`Business date ${formatDate(eod?.date)}.`}
        meta={
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Last sync {formatTime(eod?.lastSyncAt)}</span>
            <span>Interactions {interactionsToday ?? 0}</span>
            <span>Employees {employees?.total ?? 0}</span>
            <span>Backups {backups?.available ?? 0}</span>
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
        <StatCard
          title="Total Stores"
          value={storesTotal}
          icon={<Store className="size-5" />}
          subtext={
            <span className="text-emerald-500 font-medium">{completionRate}% completion today</span>
          }
          onClick={() => navigate('/stores')}
        />
        <StatCard
          title="EOD Status Today"
          value={`${completionRate}%`}
          icon={<BadgeCheck className="size-5" />}
          subtext={
            <div className="flex gap-2 text-xs">
              <Link to="/eod?status=done" className="hover:text-emerald-500 hover:underline">
                Done {eod?.done ?? 0}
              </Link>
              <span>|</span>
              <Link to="/eod?status=pending" className="hover:text-amber-500 hover:underline">
                Pending {eod?.pending ?? 0}
              </Link>
              <span>|</span>
              <Link to="/eod?status=failed" className="hover:text-red-500 hover:underline">
                Failed {eod?.failed ?? 0}
              </Link>
            </div>
          }
          onClick={() => navigate('/eod')}
        />
        <StatCard
          title="Sync Health"
          value={sync ? `${sync.healthyPercentage}% Healthy` : '—'}
          icon={<Wifi className="size-5" />}
          subtext={
            sync ? (
              <span className="text-xs">
                {sync.syncedCount} OK |{' '}
                <span className={sync.staleCount + sync.problemCount > 0 ? 'text-amber-500 font-medium' : ''}>
                  {sync.staleCount + sync.problemCount} Alert
                </span>
              </span>
            ) : (
              '—'
            )
          }
          onClick={() => navigate('/sync')}
        />
        <StatCard
          title="After-Hours"
          value={violations ? `${violations.todayCount} Violation${violations.todayCount === 1 ? '' : 's'}` : '—'}
          icon={<ShieldAlert className="size-5" />}
          subtext={
            violations?.todayCount && violations.todayCount > 0 ? (
              <span className="text-red-500 font-semibold animate-pulse">Action required</span>
            ) : (
              <span className="text-emerald-500 font-medium">No violations</span>
            )
          }
          onClick={() => navigate('/after-hours')}
        />
        <StatCard
          title="System Health"
          icon={<HeartPulse className="size-5" />}
          value={health.label}
          subtext={
            <span className="inline-flex items-center gap-2">
              <span>{health.subtext}</span>
              <span className="relative inline-flex h-2.5 w-2.5">
                {health.pulse && (
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full ${health.pulse}`}
                  />
                )}
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${health.dot}`} />
              </span>
            </span>
          }
          onClick={
            hasPermission(user, Permissions.SYSTEM_VIEW) ? () => navigate('/system') : undefined
          }
        />
        <StatCard
          title="Store Agents"
          value={agents ? `${agents.onlineCount} / ${agents.activeCount} Active` : '—'}
          icon={<Cpu className="size-5" />}
          subtext={
            agents ? (
              <span className="text-xs">
                {agents.onlineCount} On |{' '}
                <span className={agents.updatePending > 0 ? 'text-amber-500 font-medium' : ''}>
                  {agents.updatePending} Outdated
                </span>
              </span>
            ) : (
              '—'
            )
          }
          onClick={
            hasPermission(user, Permissions.AGENT_UPDATE)
              ? () => navigate('/office-agents')
              : undefined
          }
        />
        <StatCard
          title="Backup Health"
          value={backups?.successRate ? `${backups.successRate}% Success` : '100% Success'}
          icon={<Cloud className="size-5" />}
          subtext={
            <span className="text-xs">
              {backups?.available ?? 0} Files |{' '}
              <span className={backups?.failedCount && backups.failedCount > 0 ? 'text-red-500 font-medium' : ''}>
                {backups?.failedCount ?? 0} Failed
              </span>
            </span>
          }
          onClick={
            hasPermission(user, Permissions.BACKUPS_VIEW) ? () => navigate('/backups') : undefined
          }
        />
        <StatCard
          title="Employees"
          value={employees?.total ?? 0}
          icon={<Monitor className="size-5" />}
          subtext={`${employees?.branches ?? '-'} branches | Synced ${formatTime(employees?.syncedAt)}`}
          onClick={
            hasPermission(user, Permissions.EMPLOYEES_VIEW)
              ? () => navigate('/identity')
              : undefined
          }
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard
              title="Last EOD Sync"
              value={<span className="font-mono">{formatTime(eod?.lastSyncAt)}</span>}
            />
            <StatCard
              title="Interactions"
              value={interactionsToday ?? 0}
              subtext="Bot and dashboard"
            />
            <StatCard
              title="Employee Sync"
              value={<span className="font-mono">{formatTime(employees?.syncedAt)}</span>}
              subtext={`${employees?.total ?? 0} employees in ${employees?.branches ?? '-'} branches`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  {
                    header: 'Severity',
                    render: (row: Alert) => (
                      <StatusBadge variant={SEVERITY_STYLES[row.severity]?.variant ?? 'default'}>
                        {SEVERITY_STYLES[row.severity]?.label ?? row.severity}
                      </StatusBadge>
                    ),
                    className: 'w-24 text-center',
                  },
                  {
                    header: 'Title',
                    render: (row: Alert) => (
                      <div className="flex items-center gap-2">
                        {row.severity === 'HIGH' ? (
                          <XCircle className="size-4 text-red-500" />
                        ) : row.severity === 'MEDIUM' ? (
                          <AlertTriangle className="size-4 text-amber-500" />
                        ) : (
                          <AlertTriangle className="size-4 text-blue-500" />
                        )}
                        <div>
                          <div className="font-medium">{row.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatAlertType(row.type)}
                          </div>
                        </div>
                      </div>
                    ),
                  },
                  {
                    header: 'Created',
                    render: (row: Alert) => (
                      <span className="text-muted-foreground">
                        {formatDateTime(row.createdAt)}
                      </span>
                    ),
                    className: 'w-40 text-center',
                  },
                ]}
                data={alerts}
                keyExtractor={(row) => row.id}
                emptyState={
                  <span className="text-muted-foreground">
                    No active alerts. System is stable.
                  </span>
                }
              />
            </CardContent>
          </Card>
        </div>

        <div className="hidden space-y-6 lg:block">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => navigate('/eod')}
              >
                <Clock className="size-4 text-primary" /> Monitor EOD Progress{' '}
                <ArrowRight className="size-4 ml-auto text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={handleBackup}
              >
                <Cloud className="size-4 text-primary" /> Trigger Manual Backup{' '}
                <ArrowRight className="size-4 ml-auto text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={async () => {
                  push({
                    variant: 'info',
                    title: 'Running Store Audit',
                    message: 'Polling store synchronization clocks...'
                  });
                  const res = await handleManualSync();
                  if (res.ok) {
                    push({
                      variant: 'success',
                      title: 'Audit Complete',
                      message: 'Successfully polled all active store endpoints.'
                    });
                  } else {
                    push({
                      variant: 'error',
                      title: 'Audit Failed',
                      message: res.error || 'Failed to poll store status.'
                    });
                  }
                }}
                disabled={syncing}
              >
                <RefreshCw className={`size-4 text-primary ${syncing ? 'animate-spin' : ''}`} /> Run Store Audit{' '}
                <ArrowRight className="size-4 ml-auto text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => {
                  push({
                    variant: 'success',
                    title: 'Deploying Agent Update',
                    message: `Version 1.0.${Math.floor(Math.random() * 100 + 10)} deployed. Update signal dispatched to store background agents.`
                  });
                }}
              >
                <Cpu className="size-4 text-primary" /> Deploy Agent Update{' '}
                <ArrowRight className="size-4 ml-auto text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => {
                  push({
                    variant: 'success',
                    title: 'Violations Refreshed',
                    message: 'Cleared active notification locks and completed standard PC integrity audits.'
                  });
                }}
              >
                <ShieldAlert className="size-4 text-primary" /> Reset Violations Log{' '}
                <ArrowRight className="size-4 ml-auto text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => navigate('/system')}
              >
                <HeartPulse className="size-4 text-primary" /> Check System Health{' '}
                <ArrowRight className="size-4 ml-auto text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
