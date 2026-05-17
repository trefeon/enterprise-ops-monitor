import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Guard } from '../../components/auth/Guard';
import EmptyState from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/ToastContext';
import Toolbar from '../../components/ui/Toolbar';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ProgressBar from '../../components/ui/ProgressBar';
import { Button } from '@/components/ui/button';
import IconButton from '../../components/ui/IconButton';
import PageShell from '../../components/ui/PageShell';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { SearchBar } from '../../components/shared/SearchBar';
import { DatePicker } from '../../components/shared/DatePicker';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatDate, formatDateTime, formatTime, getWibToday } from '../../lib/date';
import { getFeatureStory } from '../../data/stories';
import { Loader2, Clock, User, Shield, RotateCw, Pause, Play, RefreshCw } from 'lucide-react';
import { hasPermission } from '../../lib/auth/permissions';
import { Card, CardContent } from '@/components/ui/card';

const AUTO_REFRESH_INTERVAL = 30000;

const STATUS_STYLES = {
  done: {
    label: 'Done',
    variant: 'success',
  },
  pending: {
    label: 'Pending',
    variant: 'warning',
  },
  failed: {
    label: 'Failed',
    variant: 'error',
  },
};

const DEFAULT_STATUS = STATUS_STYLES.pending;

const getStatusConfig = (status) => {
  const key = status ? status.toString().toLowerCase() : 'pending';
  return STATUS_STYLES[key] || DEFAULT_STATUS;
};

const formatSourceLabel = (source) => {
  if (!source) return '-';
  const value = source.toString().toLowerCase();
  if (value === 'api') return 'API';
  if (value === 'bot') return 'Bot';
  if (value === 'db') return 'DB';
  if (value === 'manual') return 'Manual';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const normalizeAreaKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

function base64ToBlob(base64, contentType) {
  const binary = atob(String(base64 || ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: contentType });
}

function normalizeEodExportFileName(fileName, contentType, date) {
  const fallbackName = `eod_monitor_${date}.xlsx`;
  const rawName = String(fileName || '').trim() || fallbackName;
  const isWorkbook = String(contentType || '').includes('spreadsheetml.sheet');

  if (!isWorkbook) return rawName;

  if (rawName.toLowerCase().endsWith('.xlsx')) return rawName;
  if (rawName.toLowerCase().endsWith('.xls')) return `${rawName.slice(0, -4)}.xlsx`;
  return `${rawName}.xlsx`;
}

const EODMonitor = () => {
  const { api, user } = useAuth();
  const { push } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const isDemoUser = user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo';
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({
    areaId: searchParams.get('areaId') || '',
    status: searchParams.get('status') || '',
    date: searchParams.get('date') || getWibToday(),
    q: '',
  });
  const [hasManualDate, setHasManualDate] = useState(() => Boolean(searchParams.get('date')));
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [retryTarget, setRetryTarget] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const [stats, setStats] = useState({ total: 0, done: 0, pending: 0, failed: 0 });
  const [branches, setBranches] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Branch detail modal state
  const [branchModal, setBranchModal] = useState(null);
  const [branchStores, setBranchStores] = useState([]);
  const [branchStoresLoading, setBranchStoresLoading] = useState(false);
  const [branchStoresPagination, setBranchStoresPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dateParam = hasManualDate ? filters.date : undefined;
      const res = await api.get('/eod/stores', {
        params: {
          date: dateParam,
          page: pagination.page,
          pageSize: pagination.pageSize,
          areaId: filters.areaId || undefined,
          status: filters.status || undefined,
          q: filters.q || undefined,
        },
      });
      if (!res.ok) throw new Error(res.error?.message || 'Failed to load EOD data');
      setData(res.data || []);
      if (res.meta?.pagination) {
        setPagination(res.meta.pagination);
      }
      if (!hasManualDate && res.meta?.date) {
        setFilters((prev) =>
          prev.date === res.meta.date ? prev : { ...prev, date: res.meta.date }
        );
      }
      setLastUpdatedAt(new Date().toISOString());
    } catch (err) {
      setError(err.message || 'Failed to load EOD data');
    } finally {
      setLoading(false);
    }
  }, [api, filters, hasManualDate, pagination.page, pagination.pageSize]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const dateParam = hasManualDate ? filters.date : undefined;
      const res = await api.get('/eod/areas', { params: { date: dateParam } });
      if (!res.ok) throw new Error(res.error?.message || 'Failed to load summary');
      const rows = res.data || [];

      // Store all branches for the cards
      setBranches(rows);

      const areaKey = normalizeAreaKey(filters.areaId);
      const scopedRows = areaKey
        ? rows.filter((row) => {
            const rowKey = normalizeAreaKey(row.areaId || row.areaName);
            return rowKey === areaKey;
          })
        : rows;

      const totals = scopedRows.reduce(
        (acc, row) => {
          acc.total += Number(row.storesTotal) || 0;
          acc.done += Number(row.done) || 0;
          acc.pending += Number(row.pending) || 0;
          acc.failed += Number(row.failed) || 0;
          return acc;
        },
        { total: 0, done: 0, pending: 0, failed: 0 }
      );

      setStats(totals);
      if (!hasManualDate && res.meta?.date) {
        setFilters((prev) =>
          prev.date === res.meta.date ? prev : { ...prev, date: res.meta.date }
        );
      }
    } catch (err) {
      setStatsError(err.message || 'Failed to load summary');
      setStats({ total: 0, done: 0, pending: 0, failed: 0 });
      setBranches([]);
    } finally {
      setStatsLoading(false);
    }
  }, [api, filters.date, filters.areaId, hasManualDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const areaId = searchParams.get('areaId') || '';
    const status = searchParams.get('status') || '';
    const date = searchParams.get('date') || getWibToday();
    const q = searchParams.get('q') || '';
    setHasManualDate(Boolean(searchParams.get('date')));
    setFilters((prev) => {
      if (prev.areaId === areaId && prev.status === status && prev.date === date && prev.q === q)
        return prev;
      return { ...prev, areaId, status, date, q };
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [searchParams]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = setInterval(() => {
      fetchData();
      fetchStats();
    }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData, fetchStats]);

  const handleRefresh = useCallback(() => {
    if (isDemoUser) {
      push({
        variant: 'warning',
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
      return;
    }
    fetchData();
    fetchStats();
  }, [fetchData, fetchStats, isDemoUser, push]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(name, value);
    } else {
      newParams.delete(name);
    }
    setSearchParams(newParams);
  };

  const handleResetFilters = () => {
    setSearchParams({});
  };

  const handlePageSizeChange = (event) => {
    const value = Number(event.target.value) || 20;
    setPagination((prev) => ({ ...prev, page: 1, pageSize: value }));
  };

  const handleSync = useCallback(async () => {
    if (isDemoUser) {
      push({
        variant: 'warning',
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
      setSyncOpen(false);
      return;
    }
    try {
      const res = await api.post('/eod/sync', { date: filters.date, scope: 'all' });
      if (!res.ok) throw new Error(res.error?.message || 'Sync failed');
      push({
        variant: 'success',
        title: 'Sync queued',
        message: 'EOD sync requested for all stores.',
      });
      fetchData();
      fetchStats();
    } catch (err) {
      push({ variant: 'error', title: 'Sync failed', message: err.message });
    } finally {
      setSyncOpen(false);
    }
  }, [api, fetchData, fetchStats, filters.date, isDemoUser, push]);

  const handleRetry = useCallback(async () => {
    if (!retryTarget) return;
    if (isDemoUser) {
      push({
        variant: 'warning',
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
      setRetryTarget(null);
      return;
    }
    try {
      const res = await api.post('/eod/retry', {
        storeCode: retryTarget.storeCode,
        date: filters.date,
      });
      if (!res.ok) throw new Error(res.error?.message || 'Retry failed');
      push({
        variant: 'success',
        title: 'Retry queued',
        message: `Retry requested for ${retryTarget.storeCode}.`,
      });
      fetchData();
      fetchStats();
    } catch (err) {
      push({ variant: 'error', title: 'Retry failed', message: err.message });
    } finally {
      setRetryTarget(null);
    }
  }, [api, fetchData, fetchStats, filters.date, isDemoUser, push, retryTarget]);

  const handleExport = useCallback(async () => {
    if (isDemoUser) {
      push({
        variant: 'warning',
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
      return;
    }
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('date', filters.date);
      if (filters.areaId) params.set('areaId', filters.areaId);
      if (filters.status) params.set('status', filters.status);
      if (filters.q.trim()) params.set('q', filters.q.trim());

      const res = await api.get(`/eod/export?${params}`);
      if (!res.ok) throw new Error(res.error?.message || 'Failed to export report');

      const exportData = res.data || {};
      const contentBase64 = String(exportData.contentBase64 || exportData.content || '');
      if (!contentBase64) throw new Error('Export content unavailable');

      const blob = base64ToBlob(
        contentBase64,
        exportData.contentType ||
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      const downloadFileName = normalizeEodExportFileName(
        exportData.fileName,
        exportData.contentType,
        filters.date
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFileName;
      a.click();
      window.URL.revokeObjectURL(url);

      push({
        variant: 'success',
        title: 'Export ready',
        message: `EOD Excel exported for ${formatDate(filters.date)}`,
      });
    } catch (error) {
      push({
        variant: 'error',
        title: 'Export failed',
        message: error?.message || 'Failed to export report',
      });
    } finally {
      setExporting(false);
    }
  }, [api, filters.areaId, filters.date, filters.q, filters.status, isDemoUser, push]);

  const openDetail = useCallback(
    async (row) => {
      setDetail({
        store: {
          storeCode: row.storeCode,
          storeName: row.storeName,
          areaName: row.areaName,
          region: row.region,
          picName: row.picName,
          phone: row.phone,
        },
        eod: {
          status: row.status,
          lastEodAt: row.lastEodAt,
          lastSyncAt: row.lastSyncAt,
          source: row.source,
          errorMessage: row.errorMessage,
        },
      });
      setDetailLoading(true);
      setDetailError(null);
      try {
        const res = await api.get(`/eod/stores/${row.storeCode}`, {
          params: { date: filters.date },
        });
        if (!res.ok) throw new Error(res.error?.message || 'Failed to load detail');
        setDetail(res.data);
      } catch (err) {
        setDetailError(err.message || 'Failed to load detail');
      } finally {
        setDetailLoading(false);
      }
    },
    [api, filters.date]
  );

  const fetchBranchStores = useCallback(
    async (branch, page = 1) => {
      setBranchStoresLoading(true);
      try {
        const dateParam = hasManualDate ? filters.date : undefined;
        const res = await api.get('/eod/stores', {
          params: {
            date: dateParam,
            areaId: branch.areaId || branch.areaName,
            page,
            pageSize: branchStoresPagination.pageSize,
          },
        });
        if (!res.ok) throw new Error(res.error?.message || 'Failed to load stores');

        // Sort: failed first, then pending, then done
        const sorted = [...(res.data || [])].sort((a, b) => {
          const order = { failed: 0, pending: 1, done: 2 };
          const aOrder = order[a.status?.toLowerCase()] ?? 3;
          const bOrder = order[b.status?.toLowerCase()] ?? 3;
          return aOrder - bOrder;
        });

        setBranchStores(sorted);
        if (res.meta?.pagination) {
          setBranchStoresPagination(res.meta.pagination);
        }
      } catch {
        setBranchStores([]);
      } finally {
        setBranchStoresLoading(false);
      }
    },
    [api, filters.date, hasManualDate, branchStoresPagination.pageSize]
  );

  const openBranchModal = useCallback(
    (branch) => {
      setBranchModal(branch);
      setBranchStoresPagination((prev) => ({ ...prev, page: 1 }));
      fetchBranchStores(branch, 1);
    },
    [fetchBranchStores]
  );

  const closeBranchModal = useCallback(() => {
    setBranchModal(null);
    setBranchStores([]);
  }, []);

  const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const pendingRate = stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0;

  const total = pagination.total || 0;
  const rangeStart = total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(pagination.page * pagination.pageSize, total);

  const lastUpdatedLabel = lastUpdatedAt ? formatTime(lastUpdatedAt) : '--';
  const autoRefreshSeconds = Math.round(AUTO_REFRESH_INTERVAL / 1000);
  const exportButtonLabel = formatDate(filters.date)
    ? `Export ${formatDate(filters.date)}`
    : 'Export Excel';

  return (
    <PageShell>
      <FeatureStoryBanner story={getFeatureStory('eod-monitor')} />
      <PageHeader
        title="EOD Monitor"
        subtitle="Real-time EOD status by store."
        meta={
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 py-1 px-3 text-xs text-muted-foreground font-medium transition-colors hover:bg-muted/50">
              <Clock className="size-3.5 text-muted-foreground/75" />
              <span>Last updated: {lastUpdatedLabel}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 py-1 px-3 text-xs text-muted-foreground font-medium transition-colors hover:bg-muted/50">
              <User className="size-3.5 text-muted-foreground/75" />
              <span>User: {user?.username || 'Admin User'}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 py-1 px-3 text-xs text-muted-foreground font-medium transition-colors hover:bg-muted/50">
              <Shield className="size-3.5 text-muted-foreground/75" />
              <span>Role: {user?.role ? user.role.replace(/_/g, ' ') : 'IT Operations'}</span>
            </span>
          </div>
        }
        actions={
          <>
            <Button
              variant={autoRefresh ? 'default' : 'secondary'}
              onClick={() => setAutoRefresh((prev) => !prev)}
            >
              {autoRefresh ? (
                <RefreshCw className="mr-2 size-4 animate-spin" />
              ) : (
                <Pause className="mr-2 size-4" />
              )}
              {autoRefresh ? `Auto-refresh: On (${autoRefreshSeconds}s)` : 'Auto-refresh: Off'}
            </Button>
            <Button variant="secondary" onClick={handleRefresh}>
              <RotateCw className="mr-2 size-4" />
              Refresh
            </Button>
            {(hasPermission(user, 'EOD_SYNC') || isDemoUser) && (
              <Button
                variant="default"
                className={isDemoUser ? 'opacity-60 cursor-not-allowed' : ''}
                onClick={() => {
                  if (isDemoUser) {
                    push({
                      variant: 'warning',
                      title: 'Demo Account',
                      message: 'This action is not available in the demo account.',
                    });
                    return;
                  }
                  setSyncOpen(true);
                }}
              >
                <RefreshCw className="mr-2 size-4" />
                Sync All
              </Button>
            )}
          </>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-section">
        <StatCard
          title="Total Stores"
          value={statsLoading || statsError ? '-' : stats.total}
          icon="storefront"
          subtext="Active locations"
          onClick={() => {
            const newParams = new URLSearchParams(searchParams);
            newParams.set('status', '');
            newParams.delete('status'); // Clean URL
            setSearchParams(newParams);
          }}
        />
        <StatCard
          title="EOD Completed"
          value={statsLoading || statsError ? '-' : stats.done}
          icon="check_circle"
          status="success"
          footer={
            <ProgressBar
              value={completionRate}
              trackClassName="bg-muted"
              barClassName="bg-status-success"
            />
          }
          onClick={() => {
            const newParams = new URLSearchParams(searchParams);
            newParams.set('status', 'done');
            setSearchParams(newParams);
          }}
        />
        <StatCard
          title="Pending"
          value={statsLoading || statsError ? '-' : stats.pending}
          icon="pending"
          status="warning"
          footer={
            <ProgressBar
              value={pendingRate}
              trackClassName="bg-muted"
              barClassName="bg-status-warning"
            />
          }
          onClick={() => {
            const newParams = new URLSearchParams(searchParams);
            newParams.set('status', 'pending');
            setSearchParams(newParams);
          }}
        />
        <StatCard
          title="Failed"
          value={statsLoading || statsError ? '-' : stats.failed}
          icon="error"
          status="error"
          subtext="Needs attention"
          onClick={() => {
            const newParams = new URLSearchParams(searchParams);
            newParams.set('status', 'failed');
            setSearchParams(newParams);
          }}
        />
      </div>
      {/* Branch Health Cards */}
      {!statsLoading && branches.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="section-title">Branch Network Health</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-section">
            {branches.map((branch) => {
              const done = branch.done || 0;
              const pending = branch.pending || 0;
              const failed = branch.failed || 0;

              const hasFailed = failed > 0;

              const completionPercent =
                branch.storesTotal > 0 ? Math.round((branch.done / branch.storesTotal) * 100) : 0;
              const barClassName =
                completionPercent >= 95
                  ? 'bg-status-success'
                  : completionPercent >= 80
                    ? 'bg-status-warning'
                    : 'bg-status-error';

              return (
                <button
                  key={branch.areaId || branch.areaName}
                  type="button"
                  className="block w-full text-left border-0 bg-transparent p-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  onClick={() => openBranchModal(branch)}
                >
                  <Card className="transition-all hover:shadow-md hover:ring-1 hover:ring-ring cursor-pointer min-h-36 justify-between border border-border/50">
                    <CardContent className="p-4 flex flex-col gap-3.5 h-full justify-between">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-foreground tracking-tight">
                          {branch.areaName}
                        </div>
                        <div
                          className={`px-2 py-0.5 rounded live-text-3xs uppercase tracking-wider font-semibold ${
                            hasFailed
                              ? 'bg-status-error/10 text-status-error border border-status-error/20'
                              : 'bg-secondary text-muted-foreground border border-border/30'
                          }`}
                        >
                          {failed > 0 ? `${failed} failed` : '0 failed'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <ProgressBar
                          value={completionPercent}
                          trackClassName="bg-secondary border border-border/20 h-2"
                          barClassName={`h-2 transition-all ${barClassName}`}
                        />
                        <div className="flex items-center justify-between live-text-2xs text-muted-foreground/80 font-medium">
                          <span>Progress</span>
                          <span>{completionPercent}%</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground font-medium">
                        <span>{done} done</span>
                        <span className="text-muted-foreground/30">•</span>
                        <span>{pending} pending</span>
                        <span className="text-muted-foreground/30">•</span>
                        <span className={failed > 0 ? 'text-status-error font-semibold' : ''}>
                          {failed} failed
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <Toolbar
        left={
          <>
            <SearchBar
              placeholder="Search Store Code or Name"
              name="q"
              value={filters.q}
              onChange={handleFilterChange}
              className="w-full md:max-w-sm"
            />
            <Select
              value={filters.areaId}
              onValueChange={(val) =>
                handleFilterChange({
                  target: {
                    value: val,
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Branch: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Branch: All</SelectItem>
                <SelectItem value="2">NORTH HUB</SelectItem>
                <SelectItem value="3">EAST HUB</SelectItem>
                <SelectItem value="4">CENTRAL HUB</SelectItem>
                <SelectItem value="5">COASTAL HUB</SelectItem>
                <SelectItem value="6">HIGHLAND HUB</SelectItem>
                <SelectItem value="7">WEST HUB</SelectItem>
                <SelectItem value="8">RIVER HUB</SelectItem>
                <SelectItem value="9">SOUTH HUB</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.status}
              onValueChange={(val) =>
                handleFilterChange({
                  target: {
                    value: val,
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Status: All</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <DatePicker
              name="date"
              value={filters.date}
              onChange={handleFilterChange}
              className="w-full shrink-0 md:w-auto"
            />
          </>
        }
        right={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              title={`Export Excel for ${formatDate(filters.date)}`}
            >
              {exporting && <Loader2 className="animate-spin mr-2" />}
              <span className="material-symbols-outlined mr-2">download</span>
              {exportButtonLabel}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              <span className="material-symbols-outlined mr-2 text-base">restart_alt</span>
              Reset
            </Button>
          </div>
        }
      />
      <Card className="p-0 overflow-hidden flex min-h-80 flex-col">
        <CardContent className="p-0">
          {error ? (
            <div className="p-card">
              <EmptyState
                title="Failed to load EOD data"
                description={error}
                icon="error"
                action={{ label: 'Retry', icon: 'refresh', onClick: fetchData }}
              />
            </div>
          ) : (
            <>
              <Table wrapperClassName="flex-1 overflow-auto">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28 text-right">Store Code</TableHead>
                    <TableHead className="min-w-48">Store Name</TableHead>
                    <TableHead className="w-32">Branch</TableHead>
                    <TableHead className="w-24 text-center">Status</TableHead>
                    <TableHead className="w-36 text-center">Last EOD</TableHead>
                    <TableHead className="w-20 text-center">Source</TableHead>
                    <TableHead className="w-56">Error Message</TableHead>
                  </TableRow>
                </TableHeader>
                <tbody>
                  {loading &&
                    Array.from({ length: 6 }).map((_, idx) => (
                      <TableRow key={`skeleton-${idx}`} className="animate-pulse">
                        <TableCell>
                          <div className="h-4 w-20 rounded bg-muted"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-40 rounded bg-muted"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-24 rounded bg-muted"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-20 rounded bg-muted"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-24 rounded bg-muted"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-24 rounded bg-muted"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-48 rounded bg-muted"></div>
                        </TableCell>
                      </TableRow>
                    ))}
                  {!loading && data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No EOD results found. Adjust filters or try again.
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading &&
                    data.length > 0 &&
                    data.map((row) => {
                      const statusConfig = getStatusConfig(row.status);
                      return (
                        <TableRow
                          key={row.storeId}
                          onClick={() => openDetail(row)}
                          className="group"
                        >
                          <TableCell className="whitespace-nowrap font-mono font-medium text-foreground text-right">
                            {row.storeCode}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-medium text-foreground">
                            {row.storeName}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {row.areaName || row.areaId || '-'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-center">
                            <StatusBadge variant={statusConfig.variant}>
                              {statusConfig.label}
                            </StatusBadge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-mono text-muted-foreground text-center">
                            {formatTime(row.lastEodAt)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground text-center">
                            {formatSourceLabel(row.source)}
                          </TableCell>
                          <TableCell
                            className={`max-w-xs truncate ${
                              row.errorMessage
                                ? 'text-status-error font-medium'
                                : 'text-muted-foreground'
                            }`}
                            title={row.errorMessage || '-'}
                          >
                            {row.errorMessage || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </tbody>
              </Table>
              <div className="border-t border-border bg-card px-cell-x py-cell-y flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
                <div className="text-muted-foreground">
                  Showing <span className="font-medium text-foreground">{rangeStart}</span> to{' '}
                  <span className="font-medium text-foreground">{rangeEnd}</span> of{' '}
                  <span className="font-medium text-foreground">{total}</span> results
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={pagination.pageSize.toString()}
                    onValueChange={(val) =>
                      handlePageSizeChange({
                        target: {
                          value: parseInt(val, 10),
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="10 rows" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 rows</SelectItem>
                      <SelectItem value="20">20 rows</SelectItem>
                      <SelectItem value="50">50 rows</SelectItem>
                      <SelectItem value="100">100 rows</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1">
                    <IconButton
                      icon="chevron_left"
                      label="Previous page"
                      disabled={pagination.page <= 1}
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, page: Math.max(prev.page - 1, 1) }))
                      }
                    />
                    <IconButton
                      icon="chevron_right"
                      label="Next page"
                      disabled={pagination.page * pagination.pageSize >= pagination.total}
                      onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {detail && (
        <Modal
          open={!!detail}
          onClose={() => setDetail(null)}
          title={`Store ${detail.store.storeCode}`}
          maxWidth="max-w-2xl"
        >
          {detailLoading ? (
            <div className="text-sm text-muted-foreground">Loading details...</div>
          ) : detailError ? (
            <div className="text-sm text-status-error">{detailError}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-section text-sm">
              <div className="space-y-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Store Information
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="text-foreground">{detail.store.storeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Branch</span>
                  <span className="text-foreground">{detail.store.areaName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Regional Head</span>
                  <span className="text-foreground">{detail.store.region || '-'}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  EOD Detail
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge variant={getStatusConfig(detail.eod.status).variant}>
                    {getStatusConfig(detail.eod.status).label}
                  </StatusBadge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last EOD</span>
                  <span className="text-foreground">{formatDateTime(detail.eod.lastEodAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Sync</span>
                  <span className="text-foreground">{formatTime(detail.eod.lastSyncAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span className="text-foreground">{formatSourceLabel(detail.eod.source)}</span>
                </div>
                {detail.eod.errorMessage && (
                  <div className="text-xs text-status-error">{detail.eod.errorMessage}</div>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
      <ConfirmDialog
        open={syncOpen}
        title="Sync all stores"
        desc="This will queue an EOD sync for every active store."
        confirmText="Queue Sync"
        onConfirm={handleSync}
        onClose={() => setSyncOpen(false)}
      />
      <ConfirmDialog
        open={Boolean(retryTarget)}
        title="Retry EOD"
        desc={retryTarget ? `Retry EOD for ${retryTarget.storeCode}?` : ''}
        confirmText="Retry"
        onConfirm={handleRetry}
        onClose={() => setRetryTarget(null)}
      />
      <Modal
        open={Boolean(branchModal)}
        onClose={closeBranchModal}
        title={branchModal?.areaName || 'Branch Detail'}
        maxWidth="max-w-4xl"
      >
        {branchModal && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {branchModal.storesTotal || 0} stores • {branchModal.done || 0} done •{' '}
              {branchModal.pending || 0} pending •
              <span
                className={(branchModal.failed || 0) > 0 ? ' text-status-error font-semibold' : ''}
              >
                {' '}
                {branchModal.failed || 0} failed
              </span>
            </p>
            <div className="modal-scroll-65 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28 text-right">Store Code</TableHead>
                    <TableHead>Store Name</TableHead>
                    <TableHead className="w-24 text-center">Status</TableHead>
                    <TableHead className="w-36">Last EOD</TableHead>
                    <TableHead>Error Message</TableHead>
                  </TableRow>
                </TableHeader>
                <tbody>
                  {branchStoresLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Loading stores...
                      </TableCell>
                    </TableRow>
                  )}
                  {!branchStoresLoading && branchStores.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No stores found for this branch.
                      </TableCell>
                    </TableRow>
                  )}
                  {!branchStoresLoading &&
                    branchStores.map((store) => {
                      const statusConfig = getStatusConfig(store.status);
                      return (
                        <TableRow
                          key={store.storeCode}
                          className={store.status === 'failed' ? 'bg-status-error/10' : ''}
                        >
                          <TableCell className="font-mono text-sm text-right">
                            {store.storeCode}
                          </TableCell>
                          <TableCell className="text-foreground">
                            {store.storeName || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <StatusBadge variant={statusConfig.variant}>
                              {statusConfig.label}
                            </StatusBadge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatTime(store.lastEodAt)}
                          </TableCell>
                          <TableCell
                            className={
                              store.errorMessage
                                ? 'text-status-error text-sm'
                                : 'text-muted-foreground text-sm'
                            }
                          >
                            {store.errorMessage || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </tbody>
              </Table>
            </div>
            {branchStoresPagination.total > branchStoresPagination.pageSize && (
              <div className="flex items-center justify-between p-4 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Page {branchStoresPagination.page} of{' '}
                  {Math.ceil(branchStoresPagination.total / branchStoresPagination.pageSize)}
                </span>
                <div className="flex gap-2">
                  <IconButton
                    icon="chevron_left"
                    label="Previous branch stores page"
                    onClick={() => {
                      const newPage = Math.max(branchStoresPagination.page - 1, 1);
                      setBranchStoresPagination((prev) => ({ ...prev, page: newPage }));
                      fetchBranchStores(branchModal, newPage);
                    }}
                    disabled={branchStoresPagination.page <= 1}
                  />
                  <IconButton
                    icon="chevron_right"
                    label="Next branch stores page"
                    onClick={() => {
                      const totalPages = Math.ceil(
                        branchStoresPagination.total / branchStoresPagination.pageSize
                      );
                      const newPage = Math.min(branchStoresPagination.page + 1, totalPages);
                      setBranchStoresPagination((prev) => ({ ...prev, page: newPage }));
                      fetchBranchStores(branchModal, newPage);
                    }}
                    disabled={
                      branchStoresPagination.page >=
                      Math.ceil(branchStoresPagination.total / branchStoresPagination.pageSize)
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageShell>
  );
};

export default EODMonitor;
