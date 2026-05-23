import React, { useCallback, useEffect, useRef, useState } from 'react';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { getFeatureStory } from '../../data/stories';
import {
  Radio,
  AlertCircle,
  Store,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';

// ── Data types ────────────────────────────────────────────────────────────────

interface SyncKpi {
  total: number;
  synced: number;
  stale: number;
  problem: number;
}

interface SyncBranch {
  id: string;
  name: string;
  synced: number;
  stale: number;
  problem: number;
  total: number;
}

interface SyncStore {
  storeCode: string;
  storeName: string;
  branchName: string;
  lastSyncAgoSec: number;
  lastSyncAt: string;
}

interface SyncOldest {
  storeName: string;
  ageSec: number;
}

interface SyncThresholds {
  syncedMaxSec: number;
  staleMaxSec: number;
}

interface SyncData {
  kpi: SyncKpi;
  branches: SyncBranch[];
  lateStores: SyncStore[];
  oldest: SyncOldest;
  thresholds: SyncThresholds;
}

interface EodRankingStore {
  storeCode: string;
  storeName: string;
  branchName: string;
  failedDays: number;
  okDays: number;
  failRate: number;
}

interface EodSummary {
  totalStoresWithFailures: number;
  dateRange?: {
    from: string;
    to: string;
  };
}

interface EodData {
  ranking: EodRankingStore[];
  summary: EodSummary;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const RAW_API_BASE = (import.meta as Record<string, any>).env?.VITE_API_URL;
const API_BASE = RAW_API_BASE
  ? String(RAW_API_BASE).replace(/\/+$/, '').endsWith('/api')
    ? String(RAW_API_BASE).replace(/\/+$/, '')
    : `${String(RAW_API_BASE).replace(/\/+$/, '')}/api`
  : '/api';
const REFRESH_INTERVAL = 10_000; // 10 seconds

const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds == null || !Number.isFinite(seconds)) return '-';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400)
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
};

const formatTime = (isoStr: string | null | undefined): string => {
  if (!isoStr) return '-';
  try {
    return new Date(isoStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Jakarta',
    });
  } catch {
    return '-';
  }
};

const getCurrentWibTime = (): string => {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
};

const getCurrentWibDate = (): string => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
};

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: LucideIcon;
  title: string;
  value: number | string | null | undefined;
  subtitle: string;
  color?: 'default' | 'success' | 'warning' | 'error';
  pulse?: boolean;
}

const KpiCard = ({ icon: Icon, title, value, subtitle, color = 'default', pulse = false }: KpiCardProps) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card p-5 transition-all duration-300 hover:border-primary/40 hover:bg-muted/10 group">
      {pulse && (
        <div className="absolute inset-0 animate-pulse-slow bg-destructive/5 rounded-2xl" />
      )}
      <div className="relative flex items-start gap-4">
        <div
          className={cn(
            'flex items-center justify-center w-14 h-14 rounded-xl shadow-lg',
            color === 'success'
              ? 'bg-status-success/15 text-status-success shadow-status-success/5'
              : color === 'warning'
                ? 'bg-status-warning/15 text-status-warning shadow-status-warning/5'
                : color === 'error'
                  ? 'bg-status-error/15 text-status-error shadow-status-error/5'
                  : 'bg-primary/10 text-primary shadow-primary/5'
          )}
        >
          <Icon className="size-7" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-3xs font-black uppercase tracking-widest-lg text-muted-foreground/60">
            {title}
          </div>
          <div
            className={cn(
              'text-4xl font-black tabular-nums tracking-tighter mt-0.5',
              color === 'success'
                ? 'text-status-success'
                : color === 'warning'
                  ? 'text-status-warning'
                  : color === 'error'
                    ? 'text-status-error'
                    : 'text-foreground'
            )}
          >
            {value ?? '-'}
          </div>
          <div className="text-3xs font-bold text-muted-foreground/40 mt-1 truncate uppercase">
            {subtitle}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Branch Card ──────────────────────────────────────────────────────────────

interface BranchCardProps {
  name: string;
  synced: number;
  stale: number;
  problem: number;
  total: number;
}

const BranchCard = ({ name, synced, stale, problem, total }: BranchCardProps) => {
  const healthPct = total > 0 ? (synced / total) * 100 : 0;
  const variant: 'neutral' | 'error' | 'warning' | 'success' =
    total === 0 ? 'neutral' : healthPct < 80 ? 'error' : healthPct < 90 ? 'warning' : 'success';
  const badgeColor =
    variant === 'success'
      ? 'border-status-success/30 bg-status-success/15 text-status-success'
      : variant === 'warning'
        ? 'border-status-warning/30 bg-status-warning/15 text-status-warning'
        : variant === 'error'
          ? 'border-status-error/30 bg-status-error/15 text-status-error'
          : 'border-border/40 bg-muted text-muted-foreground';
  const badgeLabel =
    variant === 'success'
      ? 'Healthy'
      : variant === 'warning'
        ? 'Degraded'
        : variant === 'error'
          ? 'Critical'
          : 'Offline';
  const barColor =
    variant === 'success'
      ? 'bg-status-success'
      : variant === 'warning'
        ? 'bg-status-warning'
        : variant === 'error'
          ? 'bg-status-error'
          : 'bg-muted';

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-4 transition-all duration-300 hover:border-primary/30 hover:bg-muted/5 group">
      <div className="flex items-center justify-between mb-4">
        <span
          className="font-bold text-foreground text-xs uppercase tracking-tight truncate pr-2"
          title={name}
        >
          {name}
        </span>
        <span
          className={cn(
            'text-4xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full border leading-none shrink-0',
            badgeColor
          )}
        >
          {badgeLabel}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mb-3">
        <div
          className={cn('h-full rounded-full transition-all duration-1000', barColor)}
          // eslint-disable-next-line no-restricted-syntax
          style={{ width: `${Math.min(100, healthPct)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-4xs font-black uppercase tracking-tighter text-muted-foreground/50">
        <span>{synced} OK</span>
        <span className="text-muted-foreground/20">•</span>
        <span>{stale} WARN</span>
        <span className="text-muted-foreground/20">•</span>
        <span>{problem} ERR</span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main LiveSync component
// ═══════════════════════════════════════════════════════════════════════════════

const LiveSync = () => {
  const [data, setData] = useState<SyncData | null>(null);
  const [eodData, setEodData] = useState<EodData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchAt, setLastFetchAt] = useState<Date | null>(null);
  const [clock, setClock] = useState<string>(getCurrentWibTime());
  const [countdown, setCountdown] = useState<number>(Math.round(REFRESH_INTERVAL / 1000));
  const nextRefreshRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const eodScrollRef = useRef<HTMLDivElement | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [syncRes, eodRes] = await Promise.allSettled([
        fetch(`${API_BASE}/sync/live`).then((r) => r.json()),
        fetch(`${API_BASE}/eod/live`).then((r) => r.json()),
      ]);

      if (syncRes.status === 'fulfilled' && syncRes.value.ok) {
        setData(syncRes.value.data as SyncData);
        setError(null);
      } else {
        const syncErr =
          syncRes.status === 'rejected'
            ? (syncRes.reason as Error)?.message
            : syncRes.value?.error?.message;
        setError(syncErr || 'Sync API error');
      }

      if (eodRes.status === 'fulfilled' && eodRes.value.ok) {
        setEodData(eodRes.value.data as EodData);
      }

      setLastFetchAt(new Date());
      nextRefreshRef.current = Date.now() + REFRESH_INTERVAL;
    } catch (err) {
      console.error('[LiveSync] fetch error:', err);
      setError((err as Error).message);
    }
  }, []);

  // Initial fetch + auto-refresh + clock tick
  useEffect(() => {
    nextRefreshRef.current = Date.now() + REFRESH_INTERVAL;

    // Inline initial fetch
    let cancelled = false;
    (async () => {
      try {
        const [syncRes, eodRes] = await Promise.allSettled([
          fetch(`${API_BASE}/sync/live`).then((r) => r.json()),
          fetch(`${API_BASE}/eod/live`).then((r) => r.json()),
        ]);
        if (cancelled) return;

        if (syncRes.status === 'fulfilled' && syncRes.value.ok) {
          setData(syncRes.value.data as SyncData);
          setError(null);
        } else {
          const syncErr =
            syncRes.status === 'rejected'
              ? (syncRes.reason as Error)?.message
              : syncRes.value?.error?.message;
          setError(syncErr || 'Sync API error');
        }

        if (eodRes.status === 'fulfilled' && eodRes.value.ok) {
          setEodData(eodRes.value.data as EodData);
        }

        setLastFetchAt(new Date());
        nextRefreshRef.current = Date.now() + REFRESH_INTERVAL;
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-refresh + clock tick
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setClock(getCurrentWibTime());

      const remaining = Math.max(0, Math.ceil(((nextRefreshRef.current ?? now) - now) / 1000));
      setCountdown(remaining);

      if (now >= (nextRefreshRef.current ?? 0)) {
        fetchData();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const kpi = data?.kpi;
  const branches = data?.branches || [];
  const lateStores = data?.lateStores || [];
  const oldest = data?.oldest;
  const thresholds = data?.thresholds || ({} as SyncThresholds);
  const syncedMaxLabel = `${Math.round((thresholds.syncedMaxSec || 300) / 60)}m`;
  const staleMaxLabel = `${Math.round((thresholds.staleMaxSec || 600) / 60)}m`;
  const eodRanking = eodData?.ranking || [];
  const eodSummary = eodData?.summary || ({} as EodSummary);

  return (
    <div className="fixed inset-0 flex flex-col gap-4 overflow-hidden bg-background text-foreground dark">
      {/* ── Header Bar ─────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between border-b border-border/40 bg-card px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Radio className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-foreground">
              Operational <span className="text-muted-foreground/40 font-medium">Radar</span>
              <span className="ml-3 inline-block align-middle animate-pulse rounded-full border border-status-success/30 bg-status-success/20 px-3 py-0.5 text-3xs font-black uppercase tracking-widest-lg text-status-success">
                LIVE
              </span>
            </h1>
            <p className="text-3xs font-bold uppercase tracking-widest text-muted-foreground/60">
              {getCurrentWibDate()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-8">
          {error && (
            <span className="flex items-center gap-2 px-3 py-1 rounded-lg bg-status-error/10 border border-status-error/20 text-3xs font-black uppercase tracking-widest text-status-error">
              <AlertCircle className="size-3.5" />
              {error}
            </span>
          )}
          <div className="text-right">
            <div className="font-mono text-3xl font-black tabular-nums tracking-tighter text-foreground">
              {clock}
            </div>
            <div className="text-4xs font-black uppercase tracking-widest-2xl text-muted-foreground/40 pr-1">
              WIB LOCAL TIME
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 border-l border-border/40 pl-8">
            <div className="text-xl font-black tabular-nums text-primary/60">{countdown}s</div>
            <div className="text-5xs font-black uppercase tracking-widest text-muted-foreground/40">
              NEXT REFRESH
            </div>
          </div>
        </div>
      </header>

      <section className="px-6">
        <FeatureStoryBanner story={getFeatureStory('live-sync')} />
      </section>

      {/* ── KPI Cards ──────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4 px-6">
        <KpiCard
          icon={Store}
          title="Active Stores"
          value={kpi?.total}
          subtitle="Monitored Endpoints"
          color="default"
        />
        <KpiCard
          icon={CheckCircle2}
          title="On-time Sync"
          value={kpi?.synced}
          subtitle={`Window: 0–${syncedMaxLabel}`}
          color="success"
        />
        <KpiCard
          icon={AlertTriangle}
          title="Warning"
          value={kpi?.stale}
          subtitle={`Window: ${syncedMaxLabel}–${staleMaxLabel}`}
          color="warning"
          pulse={(kpi?.stale ?? 0) > 0}
        />
        <KpiCard
          icon={RefreshCw}
          title="Critical Delay"
          value={kpi?.problem}
          subtitle={`Threshold: ${staleMaxLabel}+`}
          color="error"
          pulse={(kpi?.problem ?? 0) > 0}
        />
        <KpiCard
          icon={Clock}
          title="Longest Delay"
          value={oldest?.ageSec != null ? formatDuration(oldest.ageSec) : '-'}
          subtitle={oldest?.storeName || 'Stable'}
          color={
            oldest?.ageSec != null && oldest.ageSec > 3600
              ? 'error'
              : oldest?.ageSec != null
                ? 'warning'
                : 'default'
          }
        />
      </section>

      {/* ── Branch Network Health ──────────────────────────────── */}
      <section className="px-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-3xs font-black text-muted-foreground uppercase tracking-widest-xl">
            Regional Network Status
          </h2>
          <div className="h-px flex-1 bg-border/20" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {branches.map((b: SyncBranch) => (
            <BranchCard
              key={b.id}
              name={b.name}
              synced={b.synced}
              stale={b.stale}
              problem={b.problem}
              total={b.total}
            />
          ))}
        </div>
      </section>

      {/* ── Bottom Split: Late Stores + EOD Ranking ─────────────── */}
      <section className="px-6 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        {/* Left: Late Sync Stores */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center text-3xs font-black text-muted-foreground uppercase tracking-widest-xl">
              <RefreshCw className="mr-2 size-3 text-status-error" />
              Live Latency Monitor
              {lateStores.length > 0 && (
                <span className="ml-3 px-2 py-0.5 rounded bg-status-error/10 text-status-error font-black border border-status-error/20">
                  ({lateStores.length})
                </span>
              )}
            </h2>
            <div className="text-4xs font-bold text-muted-foreground/30 uppercase tracking-widest">
              Last Polled: {lastFetchAt ? formatTime(lastFetchAt.toISOString()) : '-'}
            </div>
          </div>
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto rounded-lg border border-border bg-card scrollbar-none"
          >
            {lateStores.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 gap-4">
                <CheckCircle2 className="size-12 text-status-success/20" />
                <span className="text-xs font-black uppercase tracking-widest">
                  All regions perfectly synced
                </span>
              </div>
            ) : (
              <DataTable
                columns={[
                  { header: '#', className: 'w-8 text-right text-muted-foreground/40', render: (_store, idx) => idx + 1 },
                  { header: 'Code', className: 'w-24 text-right font-mono text-xs font-bold text-muted-foreground', render: (store) => store.storeCode },
                  { header: 'Endpoint Name', className: 'max-w-cell-md truncate text-sm font-bold text-foreground', render: (store) => store.storeName || '-' },
                  { header: 'Branch', className: 'text-3xs font-black uppercase tracking-widest text-muted-foreground/60', render: (store) => store.branchName },
                  {
                    header: 'Latency',
                    className: 'text-right',
                    render: (store) => {
                      const isCritical = store.lastSyncAgoSec != null && store.lastSyncAgoSec > 3600;
                      return (
                        <span className={cn('text-sm font-black tabular-nums tracking-tighter', isCritical ? 'text-status-error' : 'text-status-warning')}>
                          {formatDuration(store.lastSyncAgoSec)}
                        </span>
                      );
                    },
                  },
                  { header: 'Last Sync', className: 'text-right text-3xs font-bold text-muted-foreground/40 tabular-nums', render: (store) => store.lastSyncAt ? formatTime(store.lastSyncAt) : 'Never' },
                ]}
                data={lateStores}
                keyExtractor={(store) => store.storeCode}
                noCard
                rowClassName={(store) => (store.lastSyncAgoSec != null && store.lastSyncAgoSec > 3600 ? 'bg-status-error/5' : '')}
              />
            )}
          </div>
        </div>

        {/* Right: EOD Failure Ranking */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center text-3xs font-black text-muted-foreground uppercase tracking-widest-xl">
              <TrendingDown className="mr-2 size-3 text-status-warning" />
              Integrity Performance Ranking
              {eodRanking.length > 0 && (
                <span className="ml-3 px-2 py-0.5 rounded bg-status-warning/10 text-status-warning font-black border border-status-warning/20">
                  ({eodSummary.totalStoresWithFailures || eodRanking.length})
                </span>
              )}
            </h2>
            <div className="text-4xs font-bold text-muted-foreground/30 uppercase tracking-widest">
              Range:{' '}
              {eodSummary.dateRange?.from && eodSummary.dateRange?.to
                ? `${eodSummary.dateRange.from} – ${eodSummary.dateRange.to}`
                : '-'}
            </div>
          </div>
          <div
            ref={eodScrollRef}
            className="flex-1 overflow-y-auto rounded-lg border border-border bg-card scrollbar-none"
          >
            {eodRanking.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 gap-4">
                <CheckCircle2 className="size-12 text-status-success/20" />
                <span className="text-xs font-black uppercase tracking-widest">
                  Zero EOD integrity violations
                </span>
              </div>
            ) : (
              <DataTable
                columns={[
                  { header: '#', className: 'w-8 text-right text-muted-foreground/40', render: (_store, idx) => idx + 1 },
                  { header: 'Code', className: 'w-24 text-right font-mono text-xs font-bold text-muted-foreground', render: (store) => store.storeCode },
                  { header: 'Endpoint Name', className: 'max-w-cell-sm truncate text-sm font-bold text-foreground', render: (store) => store.storeName || '-' },
                  { header: 'Branch', className: 'text-3xs font-black uppercase tracking-widest text-muted-foreground/60', render: (store) => store.branchName },
                  {
                    header: 'Failure / Success',
                    className: 'text-center',
                    render: (store) => (
                      <>
                        <span className="text-status-error font-black text-xs tabular-nums">{store.failedDays}</span>
                        <span className="text-muted-foreground/20 mx-1">/</span>
                        <span className="text-status-success font-bold text-xs tabular-nums">{store.okDays}</span>
                      </>
                    ),
                  },
                  {
                    header: 'Fail Rate',
                    className: 'text-right',
                    render: (store) => (
                      <span className={cn('text-sm font-black tabular-nums tracking-tighter', store.failRate > 30 ? 'text-status-error' : 'text-status-warning')}>
                        {store.failRate}%
                      </span>
                    ),
                  },
                ]}
                data={eodRanking}
                keyExtractor={(store) => store.storeCode}
                noCard
                rowClassName={(store) => (store.failRate > 30 ? 'bg-status-error/5' : '')}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LiveSync;
