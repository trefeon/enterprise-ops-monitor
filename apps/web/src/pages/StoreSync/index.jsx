import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
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
import PageShell from '../../components/ui/PageShell';
import { StatCard } from '@/components/shared/StatCard';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import { EmptyState } from '@/components/shared/EmptyState';
import Modal from '../../components/ui/Modal';
import { formatDate, formatDateTime, formatTime, getWibParts, getWibToday } from '../../lib/date';
import { getFeatureStory } from '../../data/stories';
import {
  Loader2,
  Store,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { SearchBar } from '@/components/shared/SearchBar';

const AUTO_REFRESH_INTERVAL = 10000; // stores table refresh: 10 seconds
const STATUS_REFRESH_INTERVAL = 10000; // KPI/status refresh: 10 seconds
const HISTORY_VIEWS = [
  { value: 'recent', label: 'Last 30 minutes' },
  { value: 'bucket-10', label: 'Day view (10 min intervals)' },
  { value: 'bucket-30', label: 'Day view (30 min intervals)' },
  { value: 'bucket-60', label: 'Day view (hourly intervals)' },
];
const HISTORY_BUCKETS = {
  'bucket-10': 10,
  'bucket-30': 30,
  'bucket-60': 60,
};

const formatDuration = (seconds) => {
  if (seconds == null || !Number.isFinite(seconds)) return '-';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400)
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const StoreSync = () => {
  const { api, user } = useAuth();
  const { push } = useToast();

  const isDemoUser = user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo';

  const [summary, setSummary] = useState(null);
  const [summaryMeta, setSummaryMeta] = useState(null);
  const [summaryError, setSummaryError] = useState(null);

  const [status, setStatus] = useState(null);
  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [statusError, setStatusError] = useState(null);
  const [storesError, setStoresError] = useState(null);

  const statusAbortRef = useRef(null);
  const storesAbortRef = useRef(null);
  const storeTableRef = useRef(null);

  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('problem');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0 });
  const [excludeBazar, setExcludeBazar] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(Math.round(AUTO_REFRESH_INTERVAL / 1000));
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const nextRefreshAtRef = useRef(null);
  const nextStatusRefreshAtRef = useRef(null);
  const [lastStoresFetchedAt, setLastStoresFetchedAt] = useState(null);

  // History modal state
  const [historyStore, setHistoryStore] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMode, setHistoryMode] = useState('recent');
  const [historyDate, setHistoryDate] = useState(getWibToday());
  const [historySummary, setHistorySummary] = useState(null);
  const serverNowMs = useCallback(() => Date.now() + serverOffsetMs, [serverOffsetMs]);

  const fetchSummary = useCallback(async () => {
    setSummaryError(null);
    try {
      const params = {};
      if (excludeBazar) params.excludeBazar = '1';
      const res = await api.get('/sync/summary', { params });
      if (!res.ok) throw new Error(res.error?.message || 'Failed to load sync summary');
      setSummary(res.data);
      setSummaryMeta(res.meta || null);
    } catch (err) {
      if (err?.isCanceled) return;
      setSummaryError(err.message);
    }
  }, [api, excludeBazar]);

  const fetchStatus = useCallback(async () => {
    statusAbortRef.current?.abort?.();
    const controller = new AbortController();
    statusAbortRef.current = controller;
    setStatusError(null);
    try {
      const params = {};
      if (excludeBazar) params.excludeBazar = '1';
      const res = await api.get('/sync/status', { params, signal: controller.signal });
      if (!res.ok) throw new Error(res.error?.message || 'Failed to load sync status');
      setStatus(res.data);
    } catch (err) {
      if (err?.isCanceled) return;
      setStatusError(err.message);
    }
  }, [api, excludeBazar]);

  const fetchStores = useCallback(async () => {
    setLoadingStores(true);
    storesAbortRef.current?.abort?.();
    const controller = new AbortController();
    storesAbortRef.current = controller;
    setStoresError(null);
    try {
      const params = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        sort: 'ageDesc',
      };
      if (excludeBazar) params.excludeBazar = '1';
      if (branchFilter) params.branch = branchFilter;
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/sync/stores', { params, signal: controller.signal });
      if (!res.ok) throw new Error(res.error?.message || 'Failed to load stores');
      setStores(res.data || []);
      if (res.meta?.pagination) {
        setPagination((prev) => ({ ...prev, ...res.meta.pagination }));
      }
      setLastStoresFetchedAt(new Date());
    } catch (err) {
      if (err?.isCanceled) return;
      setStoresError(err.message);
    } finally {
      setLoadingStores(false);
    }
  }, [api, branchFilter, statusFilter, search, pagination.page, pagination.pageSize, excludeBazar]);

  const handleRefresh = async () => {
    if (isDemoUser) {
      push({
        variant: 'warning',
        title: 'Demo Account',
        message: 'This action is not available in the demo account.',
      });
      return;
    }
    setRefreshing(true);
    setStatusError(null);
    setStoresError(null);
    try {
      // Express' JSON parser defaults to strict mode and rejects primitive JSON like `null`.
      // Send an object body to avoid 400 "Unexpected token n in JSON".
      const res = await api.post('/sync/refresh', {}, { timeout: 120000 });
      if (!res.ok) throw new Error(res.error?.message || 'Refresh failed');
      push({
        variant: 'success',
        title: 'Sync data refreshed',
        message: `${res.data.total} stores loaded`,
      });
      await Promise.all([fetchSummary(), fetchStatus(), fetchStores()]);
      nextRefreshAtRef.current = getNextRefreshAtMs();
    } catch (err) {
      push({ variant: 'error', title: 'Refresh failed', message: err.message });
    } finally {
      setRefreshing(false);
    }
  };

  const loadHistory = useCallback(
    async ({ mode, storeCode, date }) => {
      setHistoryLoading(true);
      setHistoryRecords([]);
      setHistorySummary(null);
      try {
        if (mode === 'recent') {
          const res = await api.get(`/sync/history/${encodeURIComponent(storeCode)}`, {
            params: { minutes: 30 },
          });
          if (!res.ok) throw new Error(res.error?.message || 'Failed to load history');
          setHistoryRecords(res.data?.records || []);
          return;
        }

        const bucketMinutes = HISTORY_BUCKETS[mode] || 10;
        const dateValue = date || getWibToday();
        const res = await api.get(`/sync/history/${encodeURIComponent(storeCode)}/summary`, {
          params: { date: dateValue, bucketMinutes },
        });
        if (!res.ok) throw new Error(res.error?.message || 'Failed to load history summary');
        setHistoryRecords(res.data?.buckets || []);
        setHistorySummary(res.data?.summary || null);
      } catch (err) {
        push({ variant: 'error', title: 'History load failed', message: err.message });
      } finally {
        setHistoryLoading(false);
      }
    },
    [api, push]
  );

  const openHistory = (storeCode, storeName) => {
    setHistoryStore({ storeCode, storeName });
    setHistoryMode('recent');
    setHistoryDate(getWibToday());
    setHistorySummary(null);
  };

  const scrollToStoreTable = useCallback(() => {
    if (!storeTableRef.current) return;
    storeTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const resetPagination = () => setPagination((p) => ({ ...p, page: 1 }));

  const handleKpiStatusClick = (nextStatus) => {
    resetPagination();
    setStatusFilter((prev) => (prev === nextStatus ? '' : nextStatus));
    scrollToStoreTable();
  };

  const handleTotalStoresClick = () => {
    setBranchFilter('');
    setStatusFilter('');
    setSearch('');
    resetPagination();
    scrollToStoreTable();
  };

  const handleOldestClick = () => {
    setBranchFilter('');
    setStatusFilter('');
    resetPagination();
    scrollToStoreTable();
  };

  useEffect(() => {
    return () => {
      statusAbortRef.current?.abort?.();
      storesAbortRef.current?.abort?.();
    };
  }, []);

  // Initial load - run once on mount (callbacks are stable enough for initial fetch)
  useEffect(() => {
    fetchSummary();
    fetchStatus();
    fetchStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!historyStore) return;
    loadHistory({
      mode: historyMode,
      storeCode: historyStore.storeCode,
      date: historyDate,
    });
  }, [historyStore, historyMode, historyDate, loadHistory]);

  // Branch options from status
  const branchOptions = useMemo(() => {
    if (!status?.branches) return [];
    return status.branches.map((b) => ({ value: b.id, label: b.name }));
  }, [status]);

  const _windowStats = useMemo(() => {
    if (status?.window) return status.window;
    if (status?.windowFast) return status.windowFast;
    return null;
  }, [status?.window, status?.windowFast]);
  const _progressStats = useMemo(() => status?.progress || null, [status?.progress]);

  const syncedMaxLabel = useMemo(() => {
    const sec = summary?.thresholdsSec?.syncedMax;
    if (!Number.isFinite(sec)) return '5m';
    return `${Math.round(sec / 60)}m`;
  }, [summary?.thresholdsSec?.syncedMax]);
  const staleMaxLabel = useMemo(() => {
    const sec = summary?.thresholdsSec?.staleMax;
    if (!Number.isFinite(sec)) return '10m';
    return `${Math.round(sec / 60)}m`;
  }, [summary?.thresholdsSec?.staleMax]);
  const sourceMeta = useMemo(() => {
    const source = status?.source;
    if (!source || !source.errorCount) return '';
    const stateLabel = source.ok ? 'Source degraded' : 'Source unavailable';
    return `${stateLabel} (${source.errorCount}/${source.totalBranches} branches)`;
  }, [status?.source]);

  const sourceErrorBranchIds = useMemo(() => {
    const errors = status?.source?.errors;
    if (!Array.isArray(errors) || errors.length === 0) return new Set();
    return new Set(errors.map((e) => String(e?.branchId || '')));
  }, [status?.source?.errors]);

  const getNextAlignedAtMs = useCallback((nowMs, intervalSeconds) => {
    if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) return null;
    try {
      const parts = getWibParts(new Date(nowMs));
      if (!parts) return nowMs + intervalSeconds * 1000;
      const secondsSinceMidnight = parts.hour * 3600 + parts.minute * 60 + parts.second;
      const remainder = secondsSinceMidnight % intervalSeconds;
      const secondsToNext = remainder === 0 ? intervalSeconds : intervalSeconds - remainder;
      return nowMs + secondsToNext * 1000;
    } catch {
      return nowMs + intervalSeconds * 1000;
    }
  }, []);

  const getNextRefreshAtMs = useCallback(
    (nowMsOverride = null) => {
      const nowMs = nowMsOverride == null ? serverNowMs() : nowMsOverride;
      return getNextAlignedAtMs(nowMs, AUTO_REFRESH_INTERVAL / 1000);
    },
    [getNextAlignedAtMs, serverNowMs]
  );

  useEffect(() => {
    const serverTime = status?.serverNow || status?.fetchedAt;
    if (!serverTime) return;
    const serverMs = new Date(serverTime).getTime();
    if (Number.isNaN(serverMs)) return;
    const clientMs = Date.now();
    // Avoid an update loop: serverNowMs/getNextRefreshAtMs depend on serverOffsetMs.
    // Also avoid tiny oscillations by ignoring sub-250ms drift.
    setServerOffsetMs((prev) => {
      const next = serverMs - clientMs;
      return Math.abs(next - prev) >= 250 ? next : prev;
    });

    nextRefreshAtRef.current =
      getNextAlignedAtMs(serverMs, AUTO_REFRESH_INTERVAL / 1000) ??
      serverMs + AUTO_REFRESH_INTERVAL;

    nextStatusRefreshAtRef.current =
      getNextAlignedAtMs(serverMs, STATUS_REFRESH_INTERVAL / 1000) ??
      serverMs + STATUS_REFRESH_INTERVAL;
  }, [status?.serverNow, status?.fetchedAt, getNextAlignedAtMs]);

  // Auto-refresh loop (server-time aligned)
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const nowMs = serverNowMs();
        let nextRefreshAt = nextRefreshAtRef.current;
        if (!nextRefreshAt) {
          nextRefreshAt = getNextRefreshAtMs(nowMs) ?? nowMs + AUTO_REFRESH_INTERVAL;
          nextRefreshAtRef.current = nextRefreshAt;
        }

        let nextStatusRefreshAt = nextStatusRefreshAtRef.current;
        if (!nextStatusRefreshAt) {
          nextStatusRefreshAt =
            getNextAlignedAtMs(nowMs, STATUS_REFRESH_INTERVAL / 1000) ??
            nowMs + STATUS_REFRESH_INTERVAL;
          nextStatusRefreshAtRef.current = nextStatusRefreshAt;
        }

        const refreshDue = nextRefreshAt != null && nextRefreshAt <= nowMs;
        const statusRefreshDue = nextStatusRefreshAt != null && nextStatusRefreshAt <= nowMs;

        if (statusRefreshDue) {
          fetchSummary();
          fetchStatus();
          nextStatusRefreshAt =
            getNextAlignedAtMs(nowMs, STATUS_REFRESH_INTERVAL / 1000) ??
            nowMs + STATUS_REFRESH_INTERVAL;
          nextStatusRefreshAtRef.current = nextStatusRefreshAt;
        }
        if (refreshDue) {
          fetchStores();
          nextRefreshAt = getNextRefreshAtMs(nowMs) ?? nowMs + AUTO_REFRESH_INTERVAL;
          nextRefreshAtRef.current = nextRefreshAt;
        }

        const remainingRefresh = nextRefreshAt
          ? Math.max(0, Math.ceil((nextRefreshAt - nowMs) / 1000))
          : 0;
        setCountdown(remainingRefresh);
      } catch (err) {
        // Never let timer exceptions freeze the view.
        console.error('[StoreSync] auto-refresh tick failed', err);
        setCountdown((prev) => (Number.isFinite(prev) && prev > 0 ? prev - 1 : prev));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchSummary, fetchStatus, fetchStores, serverNowMs, getNextRefreshAtMs, getNextAlignedAtMs]);

  const totalPages = Math.ceil((pagination.total || 0) / pagination.pageSize);
  const historyEmptyLabel =
    historyMode === 'recent'
      ? 'No history records found in the last 30 minutes.'
      : 'No intervals found for this day.';
  const isStatusSelected = (value) => String(statusFilter || '') === String(value || '');
  const updatedValue = lastStoresFetchedAt || summaryMeta?.updatedAt || status?.fetchedAt || null;
  const updatedLabel = updatedValue
    ? `${formatDate(updatedValue)}, ${formatTime(updatedValue)}`
    : '-';

  const fatalError = summaryError || statusError || storesError;

  if (fatalError && !status && stores.length === 0) {
    return (
      <PageShell>
        <EmptyState
          title="Failed to load sync data"
          description={fatalError}
          icon={<AlertTriangle className="size-8" />}
          action={
            <Button onClick={handleRefresh}>
              <RefreshCw className="mr-2 size-4" /> Retry
            </Button>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <FeatureStoryBanner story={getFeatureStory('store-sync')} />

      <PageHeader
        title="Store Sync Monitor"
        description="Real-time store data synchronization status. Stores sync from their computers every ~3 minutes."
        meta={`Updated ${updatedLabel} • Auto-refresh ${countdown}s${sourceMeta ? ` • ${sourceMeta}` : ''}`}
        actions={
          <Button onClick={handleRefresh}>
            {refreshing && <Loader2 className="animate-spin mr-2" />}
            <RefreshCw className="mr-2 size-4" />
            {refreshing ? 'Refreshing...' : 'Refresh Now'}
          </Button>
        }
      />

      {(summaryError || statusError || storesError) && (
        <Card className="py-3 border-status-warning/30 bg-status-warning/5">
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="text-sm text-foreground">
                {summaryError ? `Summary error: ${summaryError}` : null}
                {summaryError && (statusError || storesError) ? ' • ' : null}
                {statusError ? `Status error: ${statusError}` : null}
                {statusError && storesError ? ' • ' : null}
                {storesError ? `Stores error: {storesError}` : null}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => Promise.all([fetchSummary(), fetchStatus(), fetchStores()])}
                >
                  <RefreshCw className="mr-2 size-4" />
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <StatCard
          title="Total Stores"
          icon={<Store className="size-5" />}
          value={summary?.totalStores ?? '-'}
          subtext="Across all branches"
          onClick={handleTotalStoresClick}
          className={statusFilter === '' ? 'ring-2 ring-ring' : ''}
        />

        <StatCard
          title="On-time"
          icon={<CheckCircle className="size-5" />}
          value={<span className="text-status-success">{summary?.synced ?? '-'}</span>}
          subtext={`Last sync 0–${syncedMaxLabel}`}
          accent="text-status-success"
          onClick={() => handleKpiStatusClick('synced')}
          className={isStatusSelected('synced') ? 'ring-2 ring-ring' : ''}
        />

        <StatCard
          title="Warning"
          icon={<AlertTriangle className="size-5" />}
          value={
            <span
              className={
                (Number(summary?.stale) || 0) > 0 ? 'text-status-warning' : 'text-foreground'
              }
            >
              {summary?.stale ?? '-'}
            </span>
          }
          subtext={`Last sync ${syncedMaxLabel}–${staleMaxLabel}`}
          accent={
            (Number(summary?.stale) || 0) > 0 ? 'text-status-warning' : 'text-muted-foreground'
          }
          onClick={() => handleKpiStatusClick('stale')}
          className={isStatusSelected('stale') ? 'ring-2 ring-ring' : ''}
        />

        <StatCard
          title="Late"
          icon={<AlertTriangle className="size-5" />}
          value={
            <span
              className={(Number(status?.late) || 0) > 0 ? 'text-status-error' : 'text-foreground'}
            >
              {status?.late ?? '-'}
            </span>
          }
          subtext={`Last sync ${staleMaxLabel}+ • Total late ${summary?.problem ?? '-'} • No timestamp ${status?.noTimestamp ?? '-'}`}
          accent={
            (Number(summary?.problem) || 0) > 0 ? 'text-status-error' : 'text-muted-foreground'
          }
          onClick={() => handleKpiStatusClick('problem')}
          className={isStatusSelected('problem') ? 'ring-2 ring-ring' : ''}
        />

        <StatCard
          title="Oldest Last Sync"
          icon={<Clock className="size-5" />}
          value={summary?.oldest?.ageSec != null ? formatDuration(summary.oldest.ageSec) : '-'}
          subtext={
            <span className="block truncate" title={summary?.oldest?.namaToko}>
              {summary?.oldest?.namaToko || '-'}
            </span>
          }
          onClick={handleOldestClick}
        />
      </div>

      {/* Branch Health */}
      {status?.branches && status.branches.length > 0 && (
        <div>
          <h3 className="section-title">Branch Network Health</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {status.branches.map((branch) => {
              const hasData = branch.total > 0;
              const hasSourceError = sourceErrorBranchIds.has(String(branch.id));
              const staleCount = branch.stale || 0;
              const problemCount = branch.problem || 0;
              const syncedCount = branch.synced || 0;
              const healthPercent = hasData ? (syncedCount / branch.total) * 100 : 0;
              const statusVariant = hasData
                ? healthPercent < 80
                  ? 'destructive'
                  : healthPercent < 90
                    ? 'warning'
                    : 'success'
                : hasSourceError
                  ? 'destructive'
                  : 'secondary';
              const badgeLabel = hasData
                ? problemCount > 0
                  ? `${problemCount} late`
                  : staleCount > 0
                    ? `${staleCount} warning`
                    : 'On-time'
                : hasSourceError
                  ? 'Source error'
                  : 'No data';

              const isBranchSelected = String(branchFilter || '') === String(branch.id || '');
              return (
                <Card
                  key={branch.id}
                  onClick={() => {
                    setBranchFilter((prev) =>
                      String(prev || '') === String(branch.id || '') ? '' : String(branch.id || '')
                    );
                    resetPagination();
                    scrollToStoreTable();
                  }}
                  className={`transition-all hover:border-primary/50 hover:shadow-md active:scale-95 cursor-pointer ${isBranchSelected ? 'ring-2 ring-ring' : ''}`}
                >
                  <div className="flex flex-col gap-3 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground truncate">{branch.name}</span>
                      <StatusBadge variant={statusVariant}>{badgeLabel}</StatusBadge>
                    </div>
                    <ProgressBar
                      value={healthPercent}
                      trackClassName="bg-secondary border border-border h-2"
                      barClassName={`h-2 ${
                        hasData
                          ? statusVariant === 'destructive'
                            ? 'bg-status-error'
                            : statusVariant === 'warning'
                              ? 'bg-status-warning'
                              : 'bg-status-success'
                          : 'bg-muted'
                      }`}
                    />
                    <div className="text-xs text-muted-foreground">
                      {hasData
                        ? `${syncedCount} on-time • ${staleCount} warning • ${problemCount} late`
                        : hasSourceError
                          ? 'Upstream source error for this branch'
                          : 'No store data yet'}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Store Table */}
      <div ref={storeTableRef} className="space-y-4">
        <PageHeader
          title="Store Sync Status"
          className="mb-0"
          actions={
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <label className="flex h-11 w-full sm:w-auto items-center gap-2 whitespace-nowrap rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground cursor-pointer transition-colors hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={excludeBazar}
                  onChange={(e) => {
                    setExcludeBazar(e.target.checked);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="shrink-0 rounded border-border bg-transparent text-primary focus:ring-primary/50"
                />
                Exclude &gt; 7 days
              </label>

              <SearchBar
                placeholder="Search store..."
                value={search}
                onValueChange={(val) => {
                  setSearch(val);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="w-full sm:w-52"
              />

              <div className="flex w-full sm:w-auto items-center gap-2">
                <Select
                  value={branchFilter}
                  onValueChange={(val) => {
                    setBranchFilter(val);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                >
                  <SelectTrigger className="flex-1 sm:w-40">
                    <SelectValue placeholder="All Branches">
                      {branchFilter
                        ? branchOptions.find((o) => String(o.value) === String(branchFilter))?.label
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Branches</SelectItem>
                    {branchOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                >
                  <SelectTrigger className="flex-1 sm:w-40">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="problem">Late (last sync {staleMaxLabel}+)</SelectItem>
                    <SelectItem value="stale">
                      Warning ({syncedMaxLabel}–{staleMaxLabel})
                    </SelectItem>
                    <SelectItem value="synced">On-time (0–{syncedMaxLabel})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          }
        />

        <Card className="p-0 overflow-hidden flex flex-col">
          <CardContent className="p-0">
            <Table className="table-fixed whitespace-nowrap">
              <TableHeader>
                <TableRow className="border-b bg-muted/50">
                  <TableHead className="w-28">Store Code</TableHead>
                  <TableHead className="w-64">Store Name</TableHead>
                  <TableHead className="w-40">Branch</TableHead>
                  <TableHead className="w-44">Last Sync</TableHead>
                  <TableHead className="w-28 text-center">Status</TableHead>
                  <TableHead className="w-16 text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingStores && stores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Loading stores...
                    </TableCell>
                  </TableRow>
                ) : storesError && stores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      <div className="flex flex-col items-center gap-2">
                        <div>Failed to load stores: {storesError}</div>
                        <Button variant="secondary" onClick={fetchStores}>
                          <RefreshCw className="mr-2 size-4" />
                          Retry
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : stores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No stores match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  stores.map((store) => (
                    <TableRow
                      key={store.storeCode}
                      className={`group even:bg-muted/20 hover:bg-muted/30 ${store.isProblem || store.status === 'problem' ? 'bg-status-error/10 even:bg-status-error/10 hover:bg-status-error/15' : store.isStale || store.status === 'stale' ? 'bg-status-warning/5 even:bg-status-warning/5 hover:bg-status-warning/10' : ''}`}
                      onClick={() => openHistory(store.storeCode, store.storeName)}
                    >
                      <TableCell className="tabular-nums">{store.storeCode}</TableCell>
                      <TableCell className="text-foreground">{store.storeName || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{store.branchName}</TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        <div>{store.lastSyncAt ? formatTime(store.lastSyncAt) : '-'}</div>
                        <div className="text-xs">{formatDuration(store.lastSyncAgoSec)}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge
                          variant={
                            store.isProblem || store.status === 'problem'
                              ? 'destructive'
                              : store.isStale || store.status === 'stale'
                                ? 'warning'
                                : 'success'
                          }
                        >
                          {store.isProblem || store.status === 'problem'
                            ? 'Late'
                            : store.isStale || store.status === 'stale'
                              ? 'Warning'
                              : 'On-time'}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(event) => {
                            event.stopPropagation();
                            openHistory(store.storeCode, store.storeName);
                          }}
                          title="View sync history"
                        >
                          <History className="size-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="border-t border-border bg-card px-cell-x py-cell-y flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
              <span className="text-xs text-muted-foreground">
                Page {pagination.page} of {totalPages || 1} ({pagination.total} stores)
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: Math.max(prev.page - 1, 1) }))
                  }
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.min(prev.page + 1, totalPages),
                    }))
                  }
                  disabled={pagination.page >= totalPages}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal
        open={Boolean(historyStore)}
        onClose={() => setHistoryStore(null)}
        title="Sync History"
        maxWidth="max-w-2xl"
      >
        {historyStore && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {historyStore.storeCode} - {historyStore.storeName}
            </p>
            <div className="modal-scroll-70 overflow-y-auto">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={historyMode} onValueChange={(val) => setHistoryMode(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Last 30 minutes" />
                    </SelectTrigger>
                    <SelectContent>
                      {HISTORY_VIEWS.map((view) => (
                        <SelectItem key={view.value} value={view.value}>
                          {view.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={historyDate}
                    onChange={(e) => setHistoryDate(e.target.value)}
                    disabled={historyMode === 'recent'}
                    className="w-44"
                  />
                </div>
                {historySummary && (
                  <div className="text-xs text-muted-foreground">
                    Intervals: {historySummary.totalBuckets} | On-time:{' '}
                    {historySummary.syncedBuckets} | Warning: {historySummary.staleBuckets} | Late:{' '}
                    {historySummary.problemBuckets || 0}
                  </div>
                )}
              </div>

              {historyLoading ? (
                <div className="text-center text-muted-foreground py-8">Loading history...</div>
              ) : historyRecords.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">{historyEmptyLabel}</div>
              ) : (
                <div className="space-y-2">
                  {historyRecords.map((record) => {
                    const recordKey = record.id || record.bucketStart || record.polledAt;
                    const bucketLabel =
                      record.bucketStart && record.bucketEnd
                        ? `${formatTime(record.bucketStart)} - ${formatTime(record.bucketEnd)}`
                        : null;
                    const isProblem = Boolean(record.isProblem);
                    const isStale = !isProblem && Boolean(record.isStale);
                    const statusLabel = isProblem ? 'Late' : isStale ? 'Warning' : 'On-time';
                    const statusVariant = isProblem
                      ? 'destructive'
                      : isStale
                        ? 'warning'
                        : 'success';
                    const StatusIcon = isProblem
                      ? RefreshCw
                      : isStale
                        ? AlertTriangle
                        : CheckCircle;
                    const statusClass = isProblem
                      ? 'border-status-error/30 bg-status-error/5'
                      : isStale
                        ? 'border-status-warning/30 bg-status-warning/5'
                        : 'border-border bg-muted/30';
                    return (
                      <div
                        key={recordKey}
                        className={`flex items-center justify-between p-3 rounded-lg border ${statusClass}`}
                      >
                        <div className="flex items-center gap-3">
                          <StatusIcon
                            className={`size-4 ${
                              isProblem
                                ? 'text-status-error'
                                : isStale
                                  ? 'text-status-warning'
                                  : 'text-status-success'
                            }`}
                          />
                          <div>
                            <div className="text-sm text-foreground">
                              {bucketLabel ? `Interval ${bucketLabel}` : 'Latest snapshot'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Last sync:{' '}
                              {record.lastSyncAt ? formatTime(record.lastSyncAt) : 'Unknown'}
                              {record.polledAt
                                ? ` • Polled ${formatDateTime(record.polledAt)}`
                                : ''}
                            </div>
                          </div>
                        </div>
                        <StatusBadge variant={statusVariant} size="sm">
                          {statusLabel}
                        </StatusBadge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
};

export default StoreSync;
