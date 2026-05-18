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

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const REFRESH_INTERVAL = 10_000; // 10 seconds

const formatDuration = (seconds) => {
  if (seconds == null || !Number.isFinite(seconds)) return '-';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400)
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
};

const formatTime = (isoStr) => {
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

const getCurrentWibTime = () => {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
};

const getCurrentWibDate = () => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
};

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, title, value, subtitle, color, pulse = false }) => (
  <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card p-5 transition-all duration-300 hover:border-primary/40 hover:bg-muted/10 group">
    {pulse && <div className="absolute inset-0 animate-pulse-slow bg-destructive/5 rounded-2xl" />}
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
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
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
        <div className="text-[10px] font-bold text-muted-foreground/40 mt-1 truncate uppercase">
          {subtitle}
        </div>
      </div>
    </div>
  </div>
);

// ─── Branch Card ─────────────────────────────────────────────────────────────
const BranchCard = ({ name, synced, stale, problem, total }) => {
  const healthPct = total > 0 ? (synced / total) * 100 : 0;
  const variant =
    total === 0 ? 'neutral' : healthPct < 80 ? 'error' : healthPct < 90 ? 'warning' : 'success';

  const barColor =
    variant === 'error'
      ? 'bg-status-error'
      : variant === 'warning'
        ? 'bg-status-warning'
        : variant === 'success'
          ? 'bg-status-success'
          : 'bg-muted-foreground/30';

  const badgeColor =
    variant === 'error'
      ? 'bg-status-error/20 text-status-error border-status-error/30'
      : variant === 'warning'
        ? 'bg-status-warning/20 text-status-warning border-status-warning/30'
        : variant === 'success'
          ? 'bg-status-success/20 text-status-success border-status-success/30'
          : 'bg-muted/50 text-muted-foreground border-border/40';

  const badgeLabel =
    problem > 0
      ? `${problem} late`
      : stale > 0
        ? `${stale} warning`
        : total > 0
          ? 'On-time'
          : 'No data';

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
            'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border leading-none shrink-0',
            badgeColor
          )}
        >
          {badgeLabel}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mb-3">
        <div
          className={cn('h-full rounded-full transition-all duration-1000', barColor)}
          style={{ width: `${Math.min(100, healthPct)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-tighter text-muted-foreground/50">
        <span>{synced} OK</span>
        <span className="text-muted-foreground/20">•</span>
        <span>{stale} WARN</span>
        <span className="text-muted-foreground/20">•</span>
        <span>{problem} ERR</span>
      </div>
    </div>
  );
};

// ─── Late Store Row ──────────────────────────────────────────────────────────
const LateStoreRow = ({ store, idx }) => {
  const ageSec = store.lastSyncAgoSec;
  const isCritical = ageSec != null && ageSec > 3600;
  return (
    <tr
      className={cn(
        'border-b border-border/40 transition-colors hover:bg-muted/30',
        isCritical ? 'bg-status-error/5' : ''
      )}
    >
      <td className="py-2.5 px-3 text-muted-foreground/40 text-[10px] font-black w-8 text-right tabular-nums">
        {idx + 1}
      </td>
      <td className="py-2.5 px-3 font-mono text-xs font-bold text-muted-foreground w-24 text-right">
        {store.storeCode}
      </td>
      <td className="py-2.5 px-3 text-sm font-bold text-foreground truncate max-w-[200px]">
        {store.storeName || '-'}
      </td>
      <td className="py-2.5 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
        {store.branchName}
      </td>
      <td className="py-2.5 px-3 text-right">
        <span
          className={cn(
            'text-sm font-black tabular-nums tracking-tighter',
            isCritical ? 'text-status-error' : 'text-status-warning'
          )}
        >
          {formatDuration(ageSec)}
        </span>
      </td>
      <td className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground/40 text-right tabular-nums">
        {store.lastSyncAt ? formatTime(store.lastSyncAt) : 'Never'}
      </td>
    </tr>
  );
};

// ─── EOD Ranking Row ─────────────────────────────────────────────────────────
const EodRankRow = ({ store, idx }) => {
  const isBad = store.failRate > 30;
  return (
    <tr
      className={cn(
        'border-b border-border/40 transition-colors hover:bg-muted/30',
        isBad ? 'bg-status-error/5' : ''
      )}
    >
      <td className="py-2 px-3 text-muted-foreground/40 text-[10px] font-black w-8 text-right tabular-nums">
        {idx + 1}
      </td>
      <td className="py-2 px-3 font-mono text-xs font-bold text-muted-foreground w-24 text-right">
        {store.storeCode}
      </td>
      <td className="py-2 px-3 text-sm font-bold text-foreground truncate max-w-[180px]">
        {store.storeName || '-'}
      </td>
      <td className="py-2 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
        {store.branchName}
      </td>
      <td className="py-2 px-3 text-center">
        <span className="text-status-error font-black text-xs tabular-nums">
          {store.failedDays}
        </span>
        <span className="text-muted-foreground/20 mx-1">/</span>
        <span className="text-status-success font-bold text-xs tabular-nums">{store.okDays}</span>
      </td>
      <td className="py-2 px-3 text-right">
        <span
          className={cn(
            'text-sm font-black tabular-nums tracking-tighter',
            isBad ? 'text-status-error' : 'text-status-warning'
          )}
        >
          {store.failRate}%
        </span>
      </td>
    </tr>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// Main LiveSync component
// ═════════════════════════════════════════════════════════════════════════════
const LiveSync = () => {
  const [data, setData] = useState(null);
  const [eodData, setEodData] = useState(null);
  const [error, setError] = useState(null);
  const [lastFetchAt, setLastFetchAt] = useState(null);
  const [clock, setClock] = useState(getCurrentWibTime());
  const [countdown, setCountdown] = useState(Math.round(REFRESH_INTERVAL / 1000));
  const nextRefreshRef = useRef(null);
  const scrollRef = useRef(null);
  const eodScrollRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [syncRes, eodRes] = await Promise.allSettled([
        fetch(`${API_BASE}/sync/live`).then((r) => r.json()),
        fetch(`${API_BASE}/eod/live`).then((r) => r.json()),
      ]);

      if (syncRes.status === 'fulfilled' && syncRes.value.ok) {
        setData(syncRes.value.data);
        setError(null);
      } else {
        const syncErr =
          syncRes.status === 'rejected' ? syncRes.reason?.message : syncRes.value?.error?.message;
        setError(syncErr || 'Sync API error');
      }

      if (eodRes.status === 'fulfilled' && eodRes.value.ok) {
        setEodData(eodRes.value.data);
      }

      setLastFetchAt(new Date());
      nextRefreshRef.current = Date.now() + REFRESH_INTERVAL;
    } catch (err) {
      console.error('[LiveSync] fetch error:', err);
      setError(err.message);
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
          setData(syncRes.value.data);
          setError(null);
        } else {
          const syncErr =
            syncRes.status === 'rejected' ? syncRes.reason?.message : syncRes.value?.error?.message;
          setError(syncErr || 'Sync API error');
        }

        if (eodRes.status === 'fulfilled' && eodRes.value.ok) {
          setEodData(eodRes.value.data);
        }

        setLastFetchAt(new Date());
        nextRefreshRef.current = Date.now() + REFRESH_INTERVAL;
      } catch (err) {
        if (!cancelled) setError(err.message);
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

      const remaining = Math.max(0, Math.ceil((nextRefreshRef.current - now) / 1000));
      setCountdown(remaining);

      if (now >= nextRefreshRef.current) {
        fetchData();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const kpi = data?.kpi;
  const branches = data?.branches || [];
  const lateStores = data?.lateStores || [];
  const oldest = data?.oldest;
  const thresholds = data?.thresholds || {};
  const syncedMaxLabel = `${Math.round((thresholds.syncedMaxSec || 300) / 60)}m`;
  const staleMaxLabel = `${Math.round((thresholds.staleMaxSec || 600) / 60)}m`;
  const eodRanking = eodData?.ranking || [];
  const eodSummary = eodData?.summary || {};

  return (
    <div className="fixed inset-0 flex flex-col gap-4 overflow-hidden bg-background text-foreground dark">
      {/* ── Header Bar ─────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between border-b border-border/40 bg-card px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-2xl shadow-primary/20">
            <Radio className="size-7" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-foreground">
              Operational <span className="text-muted-foreground/40 font-medium">Radar</span>
              <span className="ml-3 inline-block align-middle animate-pulse rounded-full border border-status-success/30 bg-status-success/20 px-3 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-status-success">
                LIVE
              </span>
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              {getCurrentWibDate()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-8">
          {error && (
            <span className="flex items-center gap-2 px-3 py-1 rounded-lg bg-status-error/10 border border-status-error/20 text-[10px] font-black uppercase tracking-widest text-status-error">
              <AlertCircle className="size-3.5" />
              {error}
            </span>
          )}
          <div className="text-right">
            <div className="font-mono text-3xl font-black tabular-nums tracking-tighter text-foreground">
              {clock}
            </div>
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 pr-1">
              WIB LOCAL TIME
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 border-l border-border/40 pl-8">
            <div className="text-xl font-black tabular-nums text-primary/60">{countdown}s</div>
            <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">
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
          pulse={kpi?.stale > 0}
        />
        <KpiCard
          icon={RefreshCw}
          title="Critical Delay"
          value={kpi?.problem}
          subtitle={`Threshold: ${staleMaxLabel}+`}
          color="error"
          pulse={kpi?.problem > 0}
        />
        <KpiCard
          icon={Clock}
          title="Longest Delay"
          value={oldest?.ageSec != null ? formatDuration(oldest.ageSec) : '-'}
          subtitle={oldest?.storeName || 'Stable'}
          color={oldest?.ageSec > 3600 ? 'error' : 'warning'}
        />
      </section>

      {/* ── Branch Network Health ──────────────────────────────── */}
      <section className="px-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em]">
            Regional Network Status
          </h2>
          <div className="h-px flex-1 bg-border/20" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {branches.map((b) => (
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
            <h2 className="flex items-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em]">
              <RefreshCw className="mr-2 size-3 text-status-error" />
              Live Latency Monitor
              {lateStores.length > 0 && (
                <span className="ml-3 px-2 py-0.5 rounded bg-status-error/10 text-status-error font-black border border-status-error/20">
                  ({lateStores.length})
                </span>
              )}
            </h2>
            <div className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">
              Last Polled: {lastFetchAt ? formatTime(lastFetchAt.toISOString()) : '-'}
            </div>
          </div>
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto rounded-[2rem] border border-border/40 bg-card shadow-inner scrollbar-none"
          >
            {lateStores.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 gap-4">
                <CheckCircle2 className="size-12 text-status-success/20" />
                <span className="text-xs font-black uppercase tracking-widest">
                  All regions perfectly synced
                </span>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-md z-20">
                  <tr className="border-b border-border/40 text-[9px] font-black uppercase text-muted-foreground/50 tracking-[0.2em]">
                    <th className="py-4 px-4 w-8">#</th>
                    <th className="py-4 px-4 w-24 text-right">Code</th>
                    <th className="py-4 px-4">Endpoint Name</th>
                    <th className="py-4 px-4">Branch</th>
                    <th className="py-4 px-4 text-right">Latency</th>
                    <th className="py-4 px-4 text-right">Last Sync</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {lateStores.map((store, idx) => (
                    <LateStoreRow key={store.storeCode} store={store} idx={idx} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: EOD Failure Ranking */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em]">
              <TrendingDown className="mr-2 size-3 text-status-warning" />
              Integrity Performance Ranking
              {eodRanking.length > 0 && (
                <span className="ml-3 px-2 py-0.5 rounded bg-status-warning/10 text-status-warning font-black border border-status-warning/20">
                  ({eodSummary.totalStoresWithFailures || eodRanking.length})
                </span>
              )}
            </h2>
            <div className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">
              Range:{' '}
              {eodSummary.dateRange?.from && eodSummary.dateRange?.to
                ? `${eodSummary.dateRange.from} – ${eodSummary.dateRange.to}`
                : '-'}
            </div>
          </div>
          <div
            ref={eodScrollRef}
            className="flex-1 overflow-y-auto rounded-[2rem] border border-border/40 bg-card shadow-inner scrollbar-none"
          >
            {eodRanking.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 gap-4">
                <CheckCircle2 className="size-12 text-status-success/20" />
                <span className="text-xs font-black uppercase tracking-widest">
                  Zero EOD integrity violations
                </span>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-md z-20">
                  <tr className="border-b border-border/40 text-[9px] font-black uppercase text-muted-foreground/50 tracking-[0.2em]">
                    <th className="py-4 px-4 w-8">#</th>
                    <th className="py-4 px-4 w-24 text-right">Code</th>
                    <th className="py-4 px-4">Endpoint Name</th>
                    <th className="py-4 px-4">Branch</th>
                    <th className="py-4 px-4 text-center">Failure / Success</th>
                    <th className="py-4 px-4 text-right">Fail Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {eodRanking.map((store, idx) => (
                    <EodRankRow key={store.storeCode} store={store} idx={idx} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LiveSync;
