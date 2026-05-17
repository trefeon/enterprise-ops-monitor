import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/ui/ToastContext';
import ProgressBar from '../components/ui/ProgressBar';
import PageShell from '../components/ui/PageShell';
import PageHeader from '../components/ui/PageHeader';
import { Guard } from '../components/auth/Guard';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import Divider from '../components/ui/Divider';
import FeatureStoryBanner from '../components/FeatureStoryBanner';
import { Table, Thead, Trow, Tcell, TableEmpty } from '../components/ui/Table';
import {
  formatDate,
  formatDateTime,
  formatTime,
  getWibToday,
  isWithinEodWindowNow,
} from '../lib/date';
import { hasPermission, Permissions } from '../lib/auth/permissions';
import { hasNoDashboardData } from '../lib/dashboard/noData';
import { getFeatureStory } from '../data/stories';

const Dashboard = () => {
  const { api, user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const isDemoUser = user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo';
  const alertsRef = useRef(null);
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [autoSyncAttempted, setAutoSyncAttempted] = useState(false);

  const fetchData = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      if (!silent) setError(null);
      try {
        const [summaryRes, alertsRes] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/alerts', { params: { limit: 10 } }),
        ]);
        if (!summaryRes.ok) throw new Error(summaryRes.error?.message || 'Failed to load summary');
        if (!alertsRes.ok) throw new Error(alertsRes.error?.message || 'Failed to load alerts');
        setSummary(summaryRes.data);
        setAlerts(alertsRes.data || []);
      } catch (err) {
        if (!silent) setError(err.message || 'Failed to load dashboard');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [api]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Ensure the dashboard reflects the new calendar day after 00:00 WIB even when auto-refresh is paused.
  useEffect(() => {
    let timeoutId = null;

    const scheduleMidnightRefresh = () => {
      const today = getWibToday();
      const todayStart = new Date(`${today}T00:00:00+07:00`);
      if (Number.isNaN(todayStart.getTime())) return;

      const nextMidnightMs = todayStart.getTime() + 24 * 60 * 60 * 1000;
      const delayMs = Math.max(0, nextMidnightMs - Date.now()) + 1500; // buffer for clock drift
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

  // If everything is empty (fresh DB / no upstream sync yet), try a one-time sync.
  useEffect(() => {
    if (!summary) return;
    if (autoSyncAttempted) return;
    if (!hasNoDashboardData(summary)) return;

    setAutoSyncAttempted(true);
    (async () => {
      setSyncing(true);
      try {
        const [syncRes, alertsRes] = await Promise.all([
          api.post('/dashboard/sync'),
          api.get('/dashboard/alerts', { params: { limit: 10 } }),
        ]);
        if (!syncRes.ok) throw new Error(syncRes.error?.message || 'Sync failed');
        if (!alertsRes.ok) throw new Error(alertsRes.error?.message || 'Failed to refresh alerts');

        setSummary(syncRes.data);
        setAlerts(alertsRes.data || []);
        push({
          variant: 'info',
          title: 'No data detected',
          message: 'Fetching latest data from API...',
        });
      } catch (err) {
        push({
          variant: 'warning',
          title: 'No data yet',
          message: err.message || 'Dashboard data is not available yet.',
        });
      } finally {
        setSyncing(false);
      }
    })();
  }, [api, autoSyncAttempted, push, summary]);

  // During EOD window, keep the dashboard fresh automatically.
  useEffect(() => {
    if (!summary) return;
    if (!isWithinEodWindowNow()) return;

    const interval = setInterval(() => {
      fetchData({ silent: true });
    }, 60_000);

    return () => clearInterval(interval);
  }, [fetchData, summary]);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const [syncRes, alertsRes] = await Promise.all([
        api.post('/dashboard/sync'),
        api.get('/dashboard/alerts', { params: { limit: 10 } }),
      ]);

      if (!syncRes.ok) throw new Error(syncRes.error?.message || 'Manual sync failed');
      if (!alertsRes.ok) throw new Error(alertsRes.error?.message || 'Failed to refresh alerts');

      setSummary(syncRes.data);
      setAlerts(alertsRes.data || []);
      push({ variant: 'success', title: 'Synced', message: 'Fetched latest internal data.' });
    } catch (err) {
      push({ variant: 'error', title: 'Sync failed', message: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleManualBackup = async () => {
    if (isDemoUser) {
      push({ variant: 'warning', title: 'Demo Account', message: 'This action is not available in the demo account.' });
      return;
    }
    try {
      const res = await api.post('/backups/run', { type: 'manual' });
      if (!res.ok) throw new Error(res.error?.message || 'Backup failed');
      push({ variant: 'success', title: 'Backup queued', message: res.data.fileName });
    } catch (err) {
      push({ variant: 'error', title: 'Backup failed', message: err.message });
    }
  };

  const formatAlertType = (value) => {
    if (!value) return '-';
    return String(value)
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <PageShell>
        <div className="text-sm text-muted-foreground">Loading dashboard...</div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <EmptyState
          title="Failed to load dashboard"
          description={error}
          icon="error"
          action={{ label: 'Retry', icon: 'refresh', onClick: fetchData }}
        />
      </PageShell>
    );
  }

  if (!summary) {
    return (
      <PageShell>
        <EmptyState
          title="No summary data"
          description="Dashboard data is unavailable."
          icon="inbox"
        />
      </PageShell>
    );
  }

  const { storesTotal, eod, systemHealth, interactionsToday, backups, employees } = summary;
  const storesCount = storesTotal ?? 0;
  const eodDone = eod?.done ?? 0;
  const eodPending = eod?.pending ?? 0;
  const eodFailed = eod?.failed ?? 0;
  const completionRate = storesCount ? Math.round((eodDone / storesCount) * 100) : 0;
  const progressRate = Math.min(Math.max(completionRate, 0), 100);
  const employeesTotal = employees?.total ?? 0;
  const employeesBranches = employees?.branches ?? 0;
  const noDashboardData = hasNoDashboardData(summary);

  const healthStyles = {
    OK: {
      label: 'Operational',
      dot: 'bg-status-success',
      pulse: 'bg-status-success/70',
      subtext: 'All systems normal',
    },
    WARNING: {
      label: 'Degraded',
      dot: 'bg-status-warning',
      pulse: null,
      subtext: 'Some services degraded',
    },
    CRITICAL: {
      label: 'Critical',
      dot: 'bg-status-error',
      pulse: null,
      subtext: 'Immediate attention needed',
    },
  };

  const health = healthStyles[systemHealth] || {
    label: systemHealth || 'Unknown',
    dot: 'bg-muted-foreground',
    pulse: null,
    subtext: 'Status unavailable',
  };

  const severityStyles = {
    HIGH: {
      label: 'High',
      variant: 'error',
      icon: 'error',
      iconColor: 'text-status-error',
    },
    MEDIUM: {
      label: 'Medium',
      variant: 'warning',
      icon: 'warning',
      iconColor: 'text-status-warning',
    },
    LOW: {
      label: 'Info',
      variant: 'info',
      icon: 'info',
      iconColor: 'text-status-info',
    },
  };

  return (
    <PageShell>
      <FeatureStoryBanner story={getFeatureStory('dashboard')} />

      <PageHeader
        title="Dashboard Summary"
        subtitle={`Business date ${formatDate(eod?.date)}.`}
        meta={
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Last sync {formatTime(eod?.lastSyncAt)}</span>
            <span>Interactions {interactionsToday ?? 0}</span>
            <span>Employees {employeesTotal}</span>
            <span>Backups {backups?.available ?? 0}</span>
          </div>
        }
      />

      {noDashboardData && (
        <Card className="mb-section">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-foreground">No data available yet</div>
              <Button variant="secondary" icon="sync" onClick={handleManualSync} disabled={syncing}>
                Fetch now
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              If this is a fresh install, the bot sync may not have populated the DB yet. During EOD
              window (19:30–23:59 WIB) the dashboard will auto-refresh.
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-section md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Total Stores"
          value={storesCount}
          icon="store"
          subtext={
            <span className="flex items-center gap-1">
              <span className="text-status-success font-medium">{completionRate}%</span>
              completion today
            </span>
          }
          onClick={() => navigate('/stores')}
        />
        <StatCard
          title="EOD Status Today"
          value={`${completionRate}%`}
          footer={<ProgressBar value={progressRate} />}
          subtext={
            <div className="flex gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
              <Link to="/eod?status=done" className="hover:text-status-success hover:underline">
                Done {eodDone}
              </Link>
              <span>|</span>
              <Link to="/eod?status=pending" className="hover:text-status-warning hover:underline">
                Pending {eodPending}
              </Link>
              <span>|</span>
              <Link to="/eod?status=failed" className="hover:text-status-error hover:underline">
                Failed {eodFailed}
              </Link>
            </div>
          }
          onClick={() => navigate('/eod')}
        />
        <StatCard
          title="Employees"
          value={employeesTotal}
          icon="badge"
          subtext={`${employeesBranches || '-'} branches | Synced ${formatTime(employees?.syncedAt)}`}
          onClick={
            hasPermission(user, Permissions.EMPLOYEES_VIEW) ? () => navigate('/identity') : null
          }
        />
        <StatCard
          title="Latest Backup"
          value={formatDateTime(backups?.latestAt)}
          icon="cloud_done"
          subtext={`Available: ${backups?.available ?? 0} files`}
          onClick={
            hasPermission(user, Permissions.BACKUPS_VIEW) ? () => navigate('/backups') : null
          }
        />
        <StatCard
          title="System Health"
          icon="monitor_heart"
          value={
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                {health.pulse && (
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full ${health.pulse} opacity-75`}
                  />
                )}
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${health.dot}`} />
              </span>
              <span>{health.label}</span>
            </div>
          }
          subtext={health.subtext}
          onClick={hasPermission(user, Permissions.SYSTEM_VIEW) ? () => navigate('/system') : null}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-section">
        <div className="lg:col-span-2 flex flex-col gap-section">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="section-title">Today's Activity</h3>
              <span className="text-xs text-muted-foreground">
                Last sync {formatTime(eod?.lastSyncAt)}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-section">
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
                subtext={`${employeesTotal} employees in ${employeesBranches || '-'} branches`}
              />
            </div>
          </div>

          <div ref={alertsRef} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="section-title mb-0">Recent Alerts</h3>
                {alerts.length > 0 ? (
                  <StatusBadge variant="error">{alerts.length} active</StatusBadge>
                ) : (
                  <span className="text-xs text-muted-foreground">All systems normal</span>
                )}
              </div>
              <Link to="/system" className="text-sm text-brand hover:text-brand/80 font-medium">
                View all
              </Link>
            </div>
            <Card variant="table">
              <Table>
                <Thead>
                  <Tcell as="th" className="w-28 text-center">
                    Severity
                  </Tcell>
                  <Tcell as="th">Title</Tcell>
                  <Tcell as="th" className="w-40 text-center">
                    Created
                  </Tcell>
                </Thead>
                <tbody>
                  {alerts.length === 0 ? (
                    <TableEmpty colSpan={3}>No active alerts. System is stable.</TableEmpty>
                  ) : (
                    alerts.map((alert) => {
                      const severity = severityStyles[alert.severity] || severityStyles.LOW;
                      return (
                        <Trow key={alert.id}>
                          <Tcell className="text-center">
                            <StatusBadge variant={severity.variant}>{severity.label}</StatusBadge>
                          </Tcell>
                          <Tcell>
                            <div className="flex items-center gap-2">
                              <span
                                className={`material-symbols-outlined text-lg ${severity.iconColor}`}
                              >
                                {severity.icon}
                              </span>
                              <div>
                                <div className="font-medium text-foreground">{alert.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatAlertType(alert.type)}
                                </div>
                              </div>
                            </div>
                          </Tcell>
                          <Tcell className="text-center">
                            <span className="text-muted-foreground">
                              {formatDateTime(alert.createdAt)}
                            </span>
                          </Tcell>
                        </Trow>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </Card>
          </div>
        </div>

        <div className="flex flex-col gap-section">
          <Card>
            <h3 className="section-title">Quick Actions</h3>
            <div className="mt-4 space-y-3">
              <Link to="/eod" className="block">
                <Button variant="secondary" fullWidth icon="schedule" className="justify-start">
                  Monitor EOD Progress
                </Button>
              </Link>
              <Guard user={user} permission="BACKUPS_RUN">
                <Button
                  variant="primary"
                  fullWidth
                  icon="backup"
                  onClick={handleManualBackup}
                  className="justify-start"
                >
                  Trigger Manual Backup
                </Button>
              </Guard>
              <Link to="/system" className="block">
                <Button
                  variant="secondary"
                  fullWidth
                  icon="settings_suggest"
                  className="justify-start"
                >
                  Check System Health
                </Button>
              </Link>
            </div>
            <Divider className="mt-6" />
            <div className="pt-4 text-xs text-muted-foreground text-center flex flex-col gap-1">
              <span className="font-medium text-foreground">Enterprise Operations Monitor</span>
              <span className="opacity-70">Dashboard v2.4.0</span>
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
};

export default Dashboard;
