import { useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  Store, BadgeCheck, Cloud, HeartPulse, Monitor,
  Clock, ArrowRight, Cpu, ShieldAlert, Wifi,
  History, FileSpreadsheet, Activity, Zap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataTable } from '@/components/ui/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Guard } from '@/components/auth/Guard';
import FeatureStoryBanner from '@/components/FeatureStoryBanner';
import { hasPermission, Permissions } from '@/lib/auth/permissions';
import { formatDate, formatDateTime, formatTime } from '@/lib/date';
import { getWibToday, isWithinEodWindowNow } from '@/lib/date';
import { getFeatureStory } from '@/data/stories';
import { cn } from '@/lib/utils';
import {
  DashboardLayout,
  DashboardSection,
  DashboardWelcome,
  DashboardPageHeader,
} from '@/components/base/dashboard-layout';
import { StatCard } from '@/components/ui/cards/StatCard';
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
      return { label: 'Healthy', dot: 'bg-status-success', pulse: 'bg-status-success/70 animate-status-online', subtext: 'All systems normal' };
    case 'WARNING':
      return { label: 'Warning', dot: 'bg-status-warning', pulse: 'bg-status-warning/70 animate-pulse-fast', subtext: 'Some services degraded' };
    case 'CRITICAL':
      return { label: 'Critical', dot: 'bg-status-error', pulse: 'bg-status-error/70 animate-pulse-alert', subtext: 'Services down' };
    default:
      return { label: systemHealth || 'Bad', dot: 'bg-muted-foreground', pulse: null, subtext: 'Status unavailable' };
  }
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-[var(--rounded-sm)] border border-border bg-surface-hover px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-hover hover:bg-surface-active disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

export default function DashboardPage() {
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const {
    summary, alerts, loading, error, syncing,
    fetchData, handleManualSync, autoSyncAttempted,
  } = useDashboard(api);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!summary) return;
    if (!isWithinEodWindowNow()) return;
    const interval = setInterval(() => fetchData({ silent: true }), 60_000);
    return () => clearInterval(interval);
  }, [fetchData, summary]);

  useEffect(() => {
    if (!summary || autoSyncAttempted.current) return;
    const { storesTotal, eod } = summary;
    if (storesTotal !== 0 || (eod?.done ?? 0) > 0) return;
    autoSyncAttempted.current = true;
    handleManualSync().then((res) => {
      if (res.ok) toast.info('No data detected', { description: 'Fetching latest data from API...' });
    });
  }, [summary, autoSyncAttempted, handleManualSync]);

  const isDemoUser = user?.isDemo || user?.roleNames?.includes('demo');

  const handleRefresh = useCallback(() => {
    if (isDemoUser) { toast.warning('Demo Account', { description: 'Action not available in demo.' }); return; }
    fetchData();
  }, [isDemoUser, fetchData]);

  const handleBackup = useCallback(async () => {
    if (user?.isDemo) { toast.warning('Demo Account', { description: 'Action not available in demo.' }); return; }
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
      <DashboardLayout>
        <Skeleton className="h-8 w-64" />
        <DashboardSection columns={4}>
          {Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-28" />))}
        </DashboardSection>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <EmptyState title="Failed to load dashboard" description={error}
          icon={<AlertTriangle aria-hidden="true" className="size-8" />}
          action={<Button onClick={() => fetchData()}><RefreshCw /> Retry</Button>} />
      </DashboardLayout>
    );
  }

  if (!summary) {
    return (
      <DashboardLayout>
        <EmptyState title="No summary data" description="Dashboard data is unavailable."
          icon={<Monitor aria-hidden="true" className="size-8" />} />
      </DashboardLayout>
    );
  }

  const { storesTotal, eod, systemHealth, interactionsToday, backups, employees, agents, violations, sync } = summary;
  const completionRate = storesTotal ? Math.round(((eod?.done ?? 0) / storesTotal) * 100) : 0;
  const health = getHealthConfig(systemHealth);

  return (
    <DashboardLayout>

      {/* ── Unified Hero Banner ── */}
      <FeatureStoryBanner
        title="Ops Starter"
        subtitle={`Business date ${formatDate(getWibToday())}`}
        story={getFeatureStory('dashboard')}
      />

      {/* ── KPI Stats Grid ── */}
      <div
        data-e2e="dashboard-kpi-grid"
        className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          className="min-h-32"
          title="Global Health"
          value={health.label}
          icon={<HeartPulse aria-hidden="true" className="size-5" />}
          accent={health.dot.replace('bg-', 'text-')}
          subtext={health.subtext}
          pulseClass={health.pulse ?? undefined}
          onClick={() => navigate('/app/system')}
        />
        <StatCard
          className="min-h-32"
          title="Sync Status"
          value={sync ? `${sync.healthyPercentage}%` : '--'}
          icon={<Wifi aria-hidden="true" className="size-5" />}
          accent={
            (sync?.staleCount || 0) + (sync?.problemCount || 0) > 0
              ? 'text-status-warning'
              : 'text-status-success'
          }
          subtext={`${(sync?.staleCount || 0) + (sync?.problemCount || 0)} active alerts`}
          onClick={() => navigate('/app/sync')}
        />
        <StatCard
          className="min-h-32"
          title="EOD Completion"
          value={`${completionRate}%`}
          icon={<BadgeCheck aria-hidden="true" className="size-5" />}
          accent={completionRate === 100 ? 'text-status-success' : 'text-primary'}
          subtext={`${eod?.done ?? 0} of ${storesTotal ?? 0} stores`}
          onClick={() => navigate('/app/eod')}
        />
        <StatCard
          className="min-h-32"
          title="Active Nodes"
          value={`${agents?.onlineCount ?? 0}/${agents?.activeCount ?? 0}`}
          icon={<Monitor aria-hidden="true" className="size-5" />}
          subtext={`${agents?.updatePending ?? 0} need update`}
          onClick={() => navigate('/app/office-agents')}
        />
      </div>

      {/* ── Charts + Alerts Row (3-col grid) ── */}
      <DashboardSection columns={3}>
        {/* Operational Pulse — spans 2 cols */}
        <div className="col-span-1 lg:col-span-2">
          <Card data-e2e="dashboard-operational-pulse" className="flex flex-col h-full border-border">
            <CardHeader className="py-3 px-4 sm:px-5 border-b border-border">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Operational Pulse
                </CardTitle>
                <StatusBadge variant={health.label === 'Healthy' ? 'success' : 'warning'}>
                  LIVE
                </StatusBadge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 h-full">
                {[
                  {
                    icon: Clock,
                    label: 'Last EOD Sync',
                    sub: 'Across 8 regions',
                    value: eod?.lastSyncAt ? formatTime(eod.lastSyncAt) : '--:--:--',
                  },
                  {
                    icon: Cloud,
                    label: 'Backup Status',
                    sub: 'Database & Media',
                    value: (backups?.failedCount ?? 0) > 0 ? 'DEGRADED' : 'SUCCESS',
                    error: (backups?.failedCount ?? 0) > 0,
                  },
                  {
                    icon: Zap,
                    label: 'Worker Interactions',
                    sub: 'Active sessions today',
                    value: `${interactionsToday ?? 0}`,
                  },
                  {
                    icon: RefreshCw,
                    label: 'Sync Queue',
                    sub: 'Active monitors',
                    value: `${sync?.healthyPercentage ?? '--'}%`,
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex flex-col justify-between gap-2.5 rounded-lg border border-border bg-surface-muted/60 p-3.5 text-left transition-colors hover:border-primary/30"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-primary">
                        <item.icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-xs font-medium text-foreground text-left">{item.label}</p>
                        <p className="truncate text-3xs font-medium uppercase tracking-wider text-muted-foreground text-left">
                          {item.sub}
                        </p>
                      </div>
                    </div>
                    <p
                      className={cn(
                        'font-mono text-base font-semibold tracking-tight text-left',
                        item.error ? 'text-status-error' : 'text-foreground'
                      )}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Panel */}
        <Card data-e2e="dashboard-alerts" className="flex flex-col h-full border-border">
          <CardHeader className="py-3 px-4 sm:px-5 border-b border-border">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Recent Alerts
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-3xs font-medium uppercase tracking-wider"
                onClick={() => navigate('/app/sync')}
              >
                VIEW ALL <ArrowRight className="ml-1 size-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-48 text-center px-6 py-8">
                <CheckCircle2 className="size-8 text-status-success/40 mb-2" />
                <p className="text-xs text-muted-foreground">All clear. No active alerts.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {alerts.slice(0, 4).map((alert) => (
                  <div key={alert.id} className="p-3.5 px-4 sm:px-5 hover:bg-surface-hover transition-colors">
                    <div className="flex items-start gap-3">
                      <ShieldAlert
                        className={cn(
                          'size-4 shrink-0 mt-0.5',
                          alert.severity === 'HIGH' ? 'text-status-error' : 'text-status-warning'
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground leading-snug mb-1 break-words">
                          {alert.title}
                        </p>
                        <p className="text-3xs text-muted-foreground uppercase tracking-wider break-words">
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
      </DashboardSection>

      {/* ── Quick Actions ── */}
      <DashboardSection gridTemplateColumns="1fr" className="mt-2">
        <Card data-e2e="dashboard-actions" className="border-border">
          <CardHeader className="py-3 px-4 sm:px-5 border-b border-border">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ActionButton icon={<Monitor className="size-4" />} label="Monitor EOD" onClick={() => navigate('/app/eod')} />
              <ActionButton icon={<Cloud className="size-4" />} label="Trigger Backup" onClick={handleBackup} disabled={user?.isDemo} />
              <ActionButton icon={<RefreshCw className="size-4" />} label="Run Audit" onClick={async () => {
                if (user?.isDemo) { toast.warning('Demo Account'); return; }
                toast.info('Running Store Audit', { description: 'Polling store synchronization clocks...' });
                const res = await handleManualSync();
                if (res.ok) toast.success('Audit Complete');
                else toast.error('Audit Failed', { description: res.error || 'Failed' });
              }} />
              <ActionButton icon={<Zap className="size-4" />} label="Deploy Agents" onClick={() => navigate('/app/office-agents')} />
            </div>
          </CardContent>
        </Card>
      </DashboardSection>

    </DashboardLayout>
  );
}
