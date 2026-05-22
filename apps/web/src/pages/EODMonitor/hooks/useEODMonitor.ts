import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types';
import { getWibToday, formatTime } from '@/lib/date';
import type {
  EODStore,
  EODStoreDetail,
  EODArea,
  EODStats,
  PaginationMeta,
  EODFilters,
} from '../types';

const AUTO_REFRESH_INTERVAL = 30000;

interface ApiClient {
  get: (url: string, opts?: Record<string, unknown>) => Promise<ApiResponse>;
  post: (url: string, body?: unknown, opts?: Record<string, unknown>) => Promise<ApiResponse>;
}

interface UserInfo {
  isDemo?: boolean;
  username?: string;
  role?: string;
  roleNames?: string[];
  [key: string]: unknown;
}

export interface UseEODMonitorReturn {
  data: EODStore[];
  loading: boolean;
  error: string | null;
  pagination: PaginationMeta;
  stats: EODStats;
  statsLoading: boolean;
  statsError: string | null;
  branches: EODArea[];
  lastUpdatedAt: string | null;
  filters: EODFilters;
  hasManualDate: boolean;
  autoRefresh: boolean;
  syncOpen: boolean;
  retryTarget: EODStore | null;
  detail: EODStoreDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  branchModal: EODArea | null;
  branchStores: EODStore[];
  branchStoresLoading: boolean;
  branchStoresPagination: PaginationMeta;
  exporting: boolean;
  completionRate: number;
  pendingRate: number;
  lastUpdatedLabel: string;
  searchParams: URLSearchParams;
  isDemoUser: boolean;
  setAutoRefresh: React.Dispatch<React.SetStateAction<boolean>>;
  setSyncOpen: (v: boolean) => void;
  setRetryTarget: (v: EODStore | null) => void;
  setDetail: (v: EODStoreDetail | null) => void;
  setBranchModal: (v: EODArea | null) => void;
  setPagination: React.Dispatch<React.SetStateAction<PaginationMeta>>;
  fetchData: () => Promise<void>;
  fetchStats: () => Promise<void>;
  handleRefresh: () => void;
  handleFilterChange: (e: { target: { name: string; value: string } }) => void;
  handleResetFilters: () => void;
  handleSync: () => Promise<void>;
  handleRetry: () => Promise<void>;
  handleExport: () => Promise<void>;
  openDetail: (row: EODStore) => Promise<void>;
  openBranchModal: (branch: EODArea) => void;
  closeBranchModal: () => void;
  fetchBranchStores: (branch: EODArea, page?: number) => Promise<void>;
  setBranchStoresPagination: React.Dispatch<React.SetStateAction<PaginationMeta>>;
}

function normalizeAreaKey(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(String(base64 || ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: contentType });
}

function normalizeEodExportFileName(
  fileName: unknown,
  contentType: string,
  date: string
): string {
  const fallbackName = `eod_monitor_${date}.xlsx`;
  const rawName = String(fileName || '').trim() || fallbackName;
  const isWorkbook = String(contentType || '').includes('spreadsheetml.sheet');
  if (!isWorkbook) return rawName;
  if (rawName.toLowerCase().endsWith('.xlsx')) return rawName;
  if (rawName.toLowerCase().endsWith('.xls')) return `${rawName.slice(0, -4)}.xlsx`;
  return `${rawName}.xlsx`;
}

function demoBlockedToast(): void {
  toast.warning('Demo Account', {
    description: 'This action is not available in the demo account.',
  });
}

export function useEODMonitor(api: ApiClient, user: UserInfo): UseEODMonitorReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  const isDemoUser = Boolean(
    user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo'
  );

  // ── Core data state ──────────────────────────────────────────
  const [data, setData] = useState<EODStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: 20,
    total: 0,
  });

  // ── Filters ───────────────────────────────────────────────────
  const [filters, setFilters] = useState<EODFilters>({
    areaId: searchParams.get('areaId') || '',
    status: searchParams.get('status') || '',
    date: searchParams.get('date') || getWibToday(),
    q: '',
  });
  const [hasManualDate, setHasManualDate] = useState(() => Boolean(searchParams.get('date')));

  // ── Stats / Branches ──────────────────────────────────────────
  const [stats, setStats] = useState<EODStats>({ total: 0, done: 0, pending: 0, failed: 0 });
  const [branches, setBranches] = useState<EODArea[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // ── UI state ──────────────────────────────────────────────────
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [retryTarget, setRetryTarget] = useState<EODStore | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // ── Detail modal ──────────────────────────────────────────────
  const [detail, setDetail] = useState<EODStoreDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // ── Branch modal ──────────────────────────────────────────────
  const [branchModal, setBranchModal] = useState<EODArea | null>(null);
  const [branchStores, setBranchStores] = useState<EODStore[]>([]);
  const [branchStoresLoading, setBranchStoresLoading] = useState(false);
  const [branchStoresPagination, setBranchStoresPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: 50,
    total: 0,
  });

  // ── Data fetching ──────────────────────────────────────────────
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
      setData((res.data as EODStore[]) || []);
      if (res.meta?.pagination) {
        setPagination(res.meta.pagination as PaginationMeta);
      }
      if (!hasManualDate && (res.meta as Record<string, string>)?.date) {
        setFilters((prev) =>
          prev.date === (res.meta as Record<string, string>).date
            ? prev
            : { ...prev, date: (res.meta as Record<string, string>).date }
        );
      }
      setLastUpdatedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load EOD data');
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
      const rows = (res.data as EODArea[]) || [];
      setBranches(rows);

      const areaKey = normalizeAreaKey(filters.areaId);
      const scopedRows = areaKey
        ? rows.filter((row) => normalizeAreaKey(row.areaId || row.areaName) === areaKey)
        : rows;

      const totals = scopedRows.reduce(
        (acc, row) => ({
          total: acc.total + (Number(row.storesTotal) || 0),
          done: acc.done + (Number(row.done) || 0),
          pending: acc.pending + (Number(row.pending) || 0),
          failed: acc.failed + (Number(row.failed) || 0),
        }),
        { total: 0, done: 0, pending: 0, failed: 0 }
      );
      setStats(totals);

      if (!hasManualDate && (res.meta as Record<string, string>)?.date) {
        setFilters((prev) =>
          prev.date === (res.meta as Record<string, string>).date
            ? prev
            : { ...prev, date: (res.meta as Record<string, string>).date }
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load summary';
      setStatsError(msg);
      setStats({ total: 0, done: 0, pending: 0, failed: 0 });
      setBranches([]);
    } finally {
      setStatsLoading(false);
    }
  }, [api, filters.date, filters.areaId, hasManualDate]);

  // ── Effects ────────────────────────────────────────────────────
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Sync search params → filters
  useEffect(() => {
    const areaId = searchParams.get('areaId') || '';
    const status = searchParams.get('status') || '';
    const date = searchParams.get('date') || getWibToday();
    const q = searchParams.get('q') || '';
    setHasManualDate(Boolean(searchParams.get('date')));
    setFilters((prev) => {
      if (prev.areaId === areaId && prev.status === status && prev.date === date && prev.q === q) {
        return prev;
      }
      return { ...prev, areaId, status, date, q };
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [searchParams]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = setInterval(() => {
      fetchData();
      fetchStats();
    }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData, fetchStats]);

  // ── Actions ────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    if (isDemoUser) { demoBlockedToast(); return; }
    fetchData();
    fetchStats();
  }, [fetchData, fetchStats, isDemoUser]);

  const handleFilterChange = useCallback(
    (e: { target: { name: string; value: string } }) => {
      const { name, value } = e.target;
      const newParams = new URLSearchParams(searchParams);
      if (value) newParams.set(name, value);
      else newParams.delete(name);
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  const handleResetFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const handleSync = useCallback(async () => {
    if (isDemoUser) { demoBlockedToast(); setSyncOpen(false); return; }
    try {
      const res = await api.post('/eod/sync', { date: filters.date, scope: 'all' });
      if (!res.ok) throw new Error(res.error?.message || 'Sync failed');
      toast.success('Sync queued', {
        description: 'EOD sync requested for all stores.',
      });
      fetchData();
      fetchStats();
    } catch (err) {
      toast.error('Sync failed', {
        description: err instanceof Error ? err.message : 'Sync failed',
      });
    } finally {
      setSyncOpen(false);
    }
  }, [api, fetchData, fetchStats, filters.date, isDemoUser]);

  const handleRetry = useCallback(async () => {
    if (!retryTarget) return;
    if (isDemoUser) { demoBlockedToast(); setRetryTarget(null); return; }
    try {
      const res = await api.post('/eod/retry', {
        storeCode: retryTarget.storeCode,
        date: filters.date,
      });
      if (!res.ok) throw new Error(res.error?.message || 'Retry failed');
      toast.success('Retry queued', {
        description: `Retry requested for ${retryTarget.storeCode}.`,
      });
      fetchData();
      fetchStats();
    } catch (err) {
      toast.error('Retry failed', {
        description: err instanceof Error ? err.message : 'Retry failed',
      });
    } finally {
      setRetryTarget(null);
    }
  }, [api, fetchData, fetchStats, filters.date, isDemoUser, retryTarget]);

  const handleExport = useCallback(async () => {
    if (isDemoUser) { demoBlockedToast(); return; }
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('date', filters.date);
      if (filters.areaId) params.set('areaId', filters.areaId);
      if (filters.status) params.set('status', filters.status);
      if (filters.q.trim()) params.set('q', filters.q.trim());

      const res = await api.get(`/eod/export?${params}`);
      if (!res.ok) throw new Error(res.error?.message || 'Failed to export report');

      const exportData = (res.data || {}) as Record<string, string>;
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

      toast.success('Export ready', { description: 'EOD Excel exported.' });
    } catch (err) {
      toast.error('Export failed', {
        description: err instanceof Error ? err.message : 'Failed to export report',
      });
    } finally {
      setExporting(false);
    }
  }, [api, filters.areaId, filters.date, filters.q, filters.status, isDemoUser]);

  const openDetail = useCallback(
    async (row: EODStore) => {
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
        setDetail(res.data as EODStoreDetail);
      } catch (err) {
        setDetailError(err instanceof Error ? err.message : 'Failed to load detail');
      } finally {
        setDetailLoading(false);
      }
    },
    [api, filters.date]
  );

  const fetchBranchStores = useCallback(
    async (branch: EODArea, page = 1) => {
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

        const sorted = [...((res.data as EODStore[]) || [])].sort((a, b) => {
          const order: Record<string, number> = { failed: 0, pending: 1, done: 2 };
          const aOrder = order[a.status?.toLowerCase()] ?? 3;
          const bOrder = order[b.status?.toLowerCase()] ?? 3;
          return aOrder - bOrder;
        });
        setBranchStores(sorted);
        if (res.meta?.pagination) {
          setBranchStoresPagination(res.meta.pagination as PaginationMeta);
        }
      } catch {
        setBranchStores([]);
      } finally {
        setBranchStoresLoading(false);
      }
    },
    [api, filters.date, hasManualDate, branchStoresPagination.pageSize]
  );

  const openBranchModalAction = useCallback(
    (branch: EODArea) => {
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

  // ── Computed ───────────────────────────────────────────────────
  const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const pendingRate = stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0;
  const lastUpdatedLabel = lastUpdatedAt ? formatTime(lastUpdatedAt) : '--';

  return {
    data, loading, error, pagination,
    stats, statsLoading, statsError, branches, lastUpdatedAt,
    filters, hasManualDate,
    autoRefresh, syncOpen, retryTarget,
    detail, detailLoading, detailError,
    branchModal, branchStores, branchStoresLoading, branchStoresPagination,
    exporting,
    completionRate, pendingRate, lastUpdatedLabel,
    searchParams, isDemoUser,
    setAutoRefresh, setSyncOpen, setRetryTarget,
    setDetail, setBranchModal, setPagination,
    fetchData, fetchStats,
    handleRefresh, handleFilterChange, handleResetFilters,
    handleSync, handleRetry, handleExport,
    openDetail, openBranchModal: openBranchModalAction, closeBranchModal,
    fetchBranchStores, setBranchStoresPagination,
  };
}
