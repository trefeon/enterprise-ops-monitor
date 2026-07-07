import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { formatDate, formatDateTime, formatTime, getWibParts, getWibToday } from '../../../lib/date';
import type {
  BranchOption,
  HistoryRecord,
  HistorySummary,
  HistoryView,
  PaginationState,
  Store,
  StoreSyncStatus,
  StoreSyncSummary,
} from '../types';

const AUTO_REFRESH_INTERVAL = 10000; // stores table refresh: 10 seconds
const STATUS_REFRESH_INTERVAL = 10000; // KPI/status refresh: 10 seconds
export const HISTORY_VIEWS: HistoryView[] = [
  { value: 'recent', label: 'Last 30 minutes' },
  { value: 'bucket-10', label: 'Day view (10 min intervals)' },
  { value: 'bucket-30', label: 'Day view (30 min intervals)' },
  { value: 'bucket-60', label: 'Day view (hourly intervals)' },
];
const HISTORY_BUCKETS: Record<string, number> = {
  'bucket-10': 10,
  'bucket-30': 30,
  'bucket-60': 60,
};

export const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds == null || !Number.isFinite(seconds)) return '-';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400)
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

interface ApiClient {
  get: (url: string, opts?: Record<string, unknown>) => Promise<any>;
  post: (url: string, body?: unknown, opts?: Record<string, unknown>) => Promise<any>;
}

interface UserInfo {
  isDemo?: boolean;
  username?: string;
  role?: string;
  roleNames?: string[];
  [key: string]: unknown;
}

export interface UseStoreSyncReturn {
  summary: StoreSyncSummary | null;
  summaryError: string | null;
  status: StoreSyncStatus | null;
  stores: Store[];
  loadingStores: boolean;
  statusError: string | null;
  storesError: string | null;
  branchFilter: string;
  statusFilter: string;
  search: string;
  pagination: PaginationState;
  excludeBazar: boolean;
  refreshing: boolean;
  countdown: number;
  serverOffsetMs: number;
  lastStoresFetchedAt: Date | null;
  historyStore: { storeCode: string; storeName: string } | null;
  historyRecords: HistoryRecord[];
  historyLoading: boolean;
  historyMode: string;
  historyDate: string;
  historySummary: HistorySummary | null;
  storeTableRef: React.RefObject<HTMLDivElement | null>;
  fatalError: string | null;
  updatedValue: string | null;
  updatedLabel: string;
  syncedMaxLabel: string;
  staleMaxLabel: string;
  branchOptions: BranchOption[];
  sourceMeta: string;
  sourceErrorBranchIds: Set<string>;
  historyEmptyLabel: string;
  isStatusSelected: (value: string) => boolean;
  setBranchFilter: React.Dispatch<React.SetStateAction<string>>;
  setStatusFilter: React.Dispatch<React.SetStateAction<string>>;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  setExcludeBazar: React.Dispatch<React.SetStateAction<boolean>>;
  setHistoryStore: (store: { storeCode: string; storeName: string } | null) => void;
  setHistoryMode: React.Dispatch<React.SetStateAction<string>>;
  setHistoryDate: React.Dispatch<React.SetStateAction<string>>;
  fetchSummary: () => Promise<void>;
  fetchStatus: () => Promise<void>;
  fetchStores: () => Promise<void>;
  handleRefresh: () => Promise<void>;
  openHistory: (storeCode: string, storeName: string) => void;
  loadHistory: (opts: { mode: string; storeCode: string; date?: string }) => Promise<void>;
  scrollToStoreTable: () => void;
  resetPagination: () => void;
  handleKpiStatusClick: (status: string) => void;
  handleTotalStoresClick: () => void;
  handleOldestClick: () => void;
}

export function useStoreSync(api: ApiClient, user: UserInfo): UseStoreSyncReturn {
  const isDemoUser = Boolean(
    user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo'
  );

  const [summary, setSummary] = useState<StoreSyncSummary | null>(null);
  const [summaryMeta, setSummaryMeta] = useState<Record<string, unknown> | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [status, setStatus] = useState<StoreSyncStatus | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [storesError, setStoresError] = useState<string | null>(null);

  const statusAbortRef = useRef<AbortController | null>(null);
  const storesAbortRef = useRef<AbortController | null>(null);
  const storeTableRef = useRef<HTMLDivElement | null>(null);

  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('problem');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({ page: 1, pageSize: 50, total: 0 });
  const [excludeBazar, setExcludeBazar] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(Math.round(AUTO_REFRESH_INTERVAL / 1000));
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const nextRefreshAtRef = useRef<number | null>(null);
  const nextStatusRefreshAtRef = useRef<number | null>(null);
  const [lastStoresFetchedAt, setLastStoresFetchedAt] = useState<Date | null>(null);

  // History modal state
  const [historyStore, setHistoryStore] = useState<{ storeCode: string; storeName: string } | null>(null);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMode, setHistoryMode] = useState('recent');
  const [historyDate, setHistoryDate] = useState(getWibToday());
  const [historySummary, setHistorySummary] = useState<HistorySummary | null>(null);
  const serverNowMs = useCallback(() => Date.now() + serverOffsetMs, [serverOffsetMs]);

  const fetchSummary = useCallback(async () => {
    setSummaryError(null);
    try {
      const params: Record<string, string> = {};
      if (excludeBazar) params.excludeBazar = '1';
      const res = await api.get('/sync/summary', { params });
      if (!res.ok) throw new Error(res.error?.message || 'Failed to load sync summary');
      setSummary(res.data);
      setSummaryMeta(res.meta || null);
    } catch (err: any) {
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
      const params: Record<string, string> = {};
      if (excludeBazar) params.excludeBazar = '1';
      const res = await api.get('/sync/status', { params, signal: controller.signal });
      if (!res.ok) throw new Error(res.error?.message || 'Failed to load sync status');
      setStatus(res.data);
    } catch (err: any) {
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
      const params: Record<string, string | number> = {
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
    } catch (err: any) {
      if (err?.isCanceled) return;
      setStoresError(err.message);
    } finally {
      setLoadingStores(false);
    }
  }, [api, branchFilter, statusFilter, search, pagination.page, pagination.pageSize, excludeBazar]);

  const handleRefresh = async () => {
    if (isDemoUser) {
      toast.warning('Demo Account', {
        description: 'This action is not available in the demo account.',
      });
      return;
    }
    setRefreshing(true);
    setStatusError(null);
    setStoresError(null);
    try {
      // Express' JSON parser defaults to strict mode and rejects primitive JSON like `null`.
      // Send an object body to avoid 400 'Unexpected token n in JSON'.
      const res = await api.post('/sync/refresh', {}, { timeout: 120000 });
      if (!res.ok) throw new Error(res.error?.message || 'Refresh failed');
      toast.success('Sync data refreshed', {
        description: `${res.data.total} stores loaded`,
      });
      await Promise.all([fetchSummary(), fetchStatus(), fetchStores()]);
      nextRefreshAtRef.current = getNextRefreshAtMs();
    } catch (err: any) {
      toast.error('Refresh failed', { description: err.message });
    } finally {
      setRefreshing(false);
    }
  };

  const loadHistory = useCallback(
    async ({ mode, storeCode, date }: { mode: string; storeCode: string; date?: string }) => {
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
      } catch (err: any) {
        toast.error('History load failed', { description: err.message });
      } finally {
        setHistoryLoading(false);
      }
    },
    [api]
  );

  const openHistory = (storeCode: string, storeName: string) => {
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

  const handleKpiStatusClick = (nextStatus: string) => {
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

  // Initial load - run once on mount
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
    return status.branches.map((b) => ({ value: String(b.id), label: b.name }));
  }, [status]);

  const syncedMaxLabel = useMemo(() => {
    const sec = summary?.thresholdsSec?.syncedMax;
    if (sec == null || !Number.isFinite(sec)) return '5m';
    return `${Math.round(sec / 60)}m`;
  }, [summary?.thresholdsSec?.syncedMax]);

  const staleMaxLabel = useMemo(() => {
    const sec = summary?.thresholdsSec?.staleMax;
    if (sec == null || !Number.isFinite(sec)) return '10m';
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
    if (!Array.isArray(errors) || errors.length === 0) return new Set<string>();
    return new Set(errors.map((e) => String(e?.branchId || '')));
  }, [status?.source?.errors]);

  const getNextAlignedAtMs = useCallback((nowMs: number, intervalSeconds: number): number | null => {
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
    (nowMsOverride: number | null = null): number | null => {
      const nowMs = nowMsOverride == null ? serverNowMs() : nowMsOverride;
      return getNextAlignedAtMs(nowMs, AUTO_REFRESH_INTERVAL / 1000);
    },
    [getNextAlignedAtMs, serverNowMs]
  );

  useEffect(() => {
    const serverTime = (status as any)?.serverNow || (status as any)?.fetchedAt;
    if (!serverTime) return;
    const serverMs = new Date(serverTime).getTime();
    if (Number.isNaN(serverMs)) return;
    const clientMs = Date.now();
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
  }, [(status as any)?.serverNow, (status as any)?.fetchedAt, getNextAlignedAtMs]);

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
        console.error('[StoreSync] auto-refresh tick failed', err);
        setCountdown((prev) => (Number.isFinite(prev) && prev > 0 ? prev - 1 : prev));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchSummary, fetchStatus, fetchStores, serverNowMs, getNextRefreshAtMs, getNextAlignedAtMs]);

  const historyEmptyLabel =
    historyMode === 'recent'
      ? 'No history records found in the last 30 minutes.'
      : 'No intervals found for this day.';

  const isStatusSelected = (value: string) => String(statusFilter || '') === String(value || '');

  const updatedValue: string | null =
    lastStoresFetchedAt?.toISOString() ||
    (summaryMeta?.updatedAt as string) ||
    (status?.fetchedAt as string) ||
    null;

  const updatedLabel = updatedValue
    ? `${formatDate(updatedValue)}, ${formatTime(updatedValue)}`
    : '-';

  const fatalError = summaryError || statusError || storesError;

  return {
    summary,
    summaryError,
    status,
    stores,
    loadingStores,
    statusError,
    storesError,
    branchFilter,
    statusFilter,
    search,
    pagination,
    excludeBazar,
    refreshing,
    countdown,
    serverOffsetMs,
    lastStoresFetchedAt,
    historyStore,
    historyRecords,
    historyLoading,
    historyMode,
    historyDate,
    historySummary,
    storeTableRef,
    fatalError,
    updatedValue,
    updatedLabel,
    syncedMaxLabel,
    staleMaxLabel,
    branchOptions,
    sourceMeta,
    sourceErrorBranchIds,
    historyEmptyLabel,
    isStatusSelected,
    setBranchFilter,
    setStatusFilter,
    setSearch,
    setPagination,
    setExcludeBazar,
    setHistoryStore,
    setHistoryMode,
    setHistoryDate,
    fetchSummary,
    fetchStatus,
    fetchStores,
    handleRefresh,
    openHistory,
    loadHistory,
    scrollToStoreTable,
    resetPagination,
    handleKpiStatusClick,
    handleTotalStoresClick,
    handleOldestClick,
  };
}
