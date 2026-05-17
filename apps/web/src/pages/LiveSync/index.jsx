import React, { useCallback, useEffect, useRef, useState } from 'react';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { getFeatureStory } from '../../data/stories';

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
    return new Date(isoStr).toLocaleTimeString('id-ID', {
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
  return new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
};

const getCurrentWibDate = () => {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
};

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, title, value, subtitle, color, pulse = false }) => (
  <div className="live-card group relative overflow-hidden">
    {pulse && <div className="absolute inset-0 animate-pulse-slow bg-red-500/5 rounded-2xl" />}
    <div className="relative flex items-start gap-4">
      <div
        className={`flex items-center justify-center w-14 h-14 rounded-xl ${
          color === 'success'
            ? 'bg-emerald-500/15 text-emerald-400'
            : color === 'warning'
              ? 'bg-amber-500/15 text-amber-400'
              : color === 'error'
                ? 'bg-red-500/15 text-red-400'
                : 'bg-blue-500/15 text-blue-400'
        }`}
      >
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-neutral-400 uppercase tracking-wider">{title}</div>
        <div
          className={`text-4xl font-bold tabular-nums mt-0.5 ${
            color === 'success'
              ? 'text-emerald-400'
              : color === 'warning'
                ? 'text-amber-400'
                : color === 'error'
                  ? 'text-red-400'
                  : 'text-white'
          }`}
        >
          {value ?? '-'}
        </div>
        <div className="text-xs text-neutral-500 mt-1 truncate">{subtitle}</div>
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
      ? 'bg-red-500'
      : variant === 'warning'
        ? 'bg-amber-500'
        : variant === 'success'
          ? 'bg-emerald-500'
          : 'bg-neutral-600';
  const badge =
    problem > 0
      ? `${problem} late`
      : stale > 0
        ? `${stale} warning`
        : total > 0
          ? 'On-time'
          : 'No data';
  const badgeColor =
    variant === 'error'
      ? 'bg-red-500/20 text-red-400 border-red-500/30'
      : variant === 'warning'
        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
        : variant === 'success'
          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
          : 'bg-neutral-700/50 text-neutral-400 border-neutral-600';

  return (
    <div className="live-card-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-white text-sm">{name}</span>
        <span className={`live-text-2xs font-medium px-2 py-0.5 rounded-full border ${badgeColor}`}>
          {badge}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden mb-2">
        <div
          className={`h-full rounded-full live-bar-fill ${barColor}`}
          ref={(el) => {
            if (el) el.style.width = `${Math.min(100, healthPct)}%`;
          }}
        />
      </div>
      <div className="live-text-2xs text-neutral-500">
        {synced} on-time • {stale} warning • {problem} late
      </div>
    </div>
  );
};

// ─── Late Store Row ──────────────────────────────────────────────────────────
const LateStoreRow = ({ store, idx }) => {
  const ageSec = store.lastSyncAgoSec;
  const isCritical = ageSec != null && ageSec > 3600;
  return (
    <tr className={`border-b border-neutral-800/60 ${isCritical ? 'bg-red-500/5' : ''}`}>
      <td className="py-2.5 px-3 text-neutral-500 text-xs font-mono w-8 text-right">{idx + 1}</td>
      <td className="py-2.5 px-3 font-mono text-sm text-neutral-300 w-24 text-right">
        {store.storeCode}
      </td>
      <td className="py-2.5 px-3 text-sm text-white truncate live-truncate-name">
        {store.storeName || '-'}
      </td>
      <td className="py-2.5 px-3 text-xs text-neutral-400">{store.branchName}</td>
      <td className="py-2.5 px-3 text-right">
        <span
          className={`text-sm font-bold tabular-nums ${
            isCritical ? 'text-red-400' : 'text-amber-400'
          }`}
        >
          {formatDuration(ageSec)}
        </span>
      </td>
      <td className="py-2.5 px-3 text-xs text-neutral-500 text-right">
        {store.lastSyncAt ? formatTime(store.lastSyncAt) : 'Never'}
      </td>
    </tr>
  );
};

// ─── EOD Ranking Row ─────────────────────────────────────────────────────────
const EodRankRow = ({ store, idx }) => {
  const isBad = store.failRate > 30;
  return (
    <tr className={`border-b border-neutral-800/60 ${isBad ? 'bg-red-500/5' : ''}`}>
      <td className="py-2 px-3 text-neutral-500 text-xs font-mono w-8 text-right">{idx + 1}</td>
      <td className="py-2 px-3 font-mono text-sm text-neutral-300 w-24 text-right">
        {store.storeCode}
      </td>
      <td className="py-2 px-3 text-sm text-white truncate live-truncate-name-sm">
        {store.storeName || '-'}
      </td>
      <td className="py-2 px-3 text-xs text-neutral-400">{store.branchName}</td>
      <td className="py-2 px-3 text-center">
        <span className="text-red-400 font-bold text-sm tabular-nums">{store.failedDays}</span>
        <span className="text-neutral-600 mx-0.5">/</span>
        <span className="text-emerald-400/70 text-xs tabular-nums">{store.okDays}</span>
      </td>
      <td className="py-2 px-3 text-right">
        <span
          className={`text-sm font-bold tabular-nums ${isBad ? 'text-red-400' : 'text-amber-400'}`}
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

    // Inline initial fetch (avoid calling setState wrapper in effect body)
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

  // Auto-scroll disabled
  // useEffect(() => {
  //   const el = scrollRef.current;
  //   if (!el) return;
  //   let dir = 1;
  //   const scrollInterval = setInterval(() => {
  //     if (!el) return;
  //     if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) dir = -1;
  //     if (el.scrollTop <= 0) dir = 1;
  //     el.scrollTop += dir * 1;
  //   }, 80);
  //   return () => clearInterval(scrollInterval);
  // }, [data?.lateStores]);

  // useEffect(() => {
  //   const el = eodScrollRef.current;
  //   if (!el) return;
  //   let dir = 1;
  //   const scrollInterval = setInterval(() => {
  //     if (!el) return;
  //     if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) dir = -1;
  //     if (el.scrollTop <= 0) dir = 1;
  //     el.scrollTop += dir * 1;
  //   }, 100);
  //   return () => clearInterval(scrollInterval);
  // }, [eodData?.ranking]);

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
    <div className="live-root dark">
      {/* ── Header Bar ─────────────────────────────────────────── */}
      <header className="live-header">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-2xl text-emerald-400">cell_tower</span>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              Store Sync Monitor
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 align-middle animate-pulse-slow">
                LIVE
              </span>
            </h1>
            <p className="text-xs text-neutral-500">{getCurrentWibDate()}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {error && (
            <span className="text-xs text-red-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </span>
          )}
          <div className="text-right">
            <div className="text-2xl font-bold text-white tabular-nums font-mono">{clock}</div>
            <div className="live-text-3xs text-neutral-500 uppercase tracking-widest">WIB</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-lg font-bold text-neutral-400 tabular-nums">{countdown}s</div>
            <div className="live-text-3xs text-neutral-600 uppercase">refresh</div>
          </div>
        </div>
      </header>

      <section className="px-6">
        <FeatureStoryBanner story={getFeatureStory('live-sync')} />
      </section>

      {/* ── KPI Cards ──────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4 px-6">
        <KpiCard
          icon="store"
          title="Total"
          value={kpi?.total}
          subtitle="Active stores"
          color="default"
        />
        <KpiCard
          icon="check_circle"
          title="On-time"
          value={kpi?.synced}
          subtitle={`Sync 0–${syncedMaxLabel}`}
          color="success"
        />
        <KpiCard
          icon="warning"
          title="Warning"
          value={kpi?.stale}
          subtitle={`Sync ${syncedMaxLabel}–${staleMaxLabel}`}
          color="warning"
          pulse={kpi?.stale > 0}
        />
        <KpiCard
          icon="sync_problem"
          title="Late"
          value={kpi?.problem}
          subtitle={`Sync ${staleMaxLabel}+ or no data`}
          color="error"
          pulse={kpi?.problem > 0}
        />
        <KpiCard
          icon="schedule"
          title="Oldest"
          value={oldest?.ageSec != null ? formatDuration(oldest.ageSec) : '-'}
          subtitle={oldest?.storeName || '-'}
          color={oldest?.ageSec > 3600 ? 'error' : 'warning'}
        />
      </section>

      {/* ── Branch Network Health ──────────────────────────────── */}
      <section className="px-6">
        <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">
          Branch Network Health
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
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
      <section className="px-6 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Late Sync Stores */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
              <span className="material-symbols-outlined text-sm align-text-bottom mr-1 text-red-400">
                sync_problem
              </span>
              Late Sync
              {lateStores.length > 0 && (
                <span className="ml-2 text-xs font-normal text-red-400">({lateStores.length})</span>
              )}
            </h2>
            <div className="live-text-3xs text-neutral-600">
              {lastFetchAt ? formatTime(lastFetchAt.toISOString()) : '-'}
            </div>
          </div>
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto rounded-xl border border-neutral-800/60 bg-neutral-900/60"
          >
            {lateStores.length === 0 ? (
              <div className="flex items-center justify-center h-full text-neutral-600 text-sm">
                <span className="material-symbols-outlined text-3xl mr-3 text-emerald-500/40">
                  check_circle
                </span>
                All stores syncing on time
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-700/60 live-text-2xs uppercase text-neutral-500 tracking-wider">
                    <th className="py-2 px-3 w-8">#</th>
                    <th className="py-2 px-3 w-24 text-right">Code</th>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Branch</th>
                    <th className="py-2 px-3 text-right">Delay</th>
                    <th className="py-2 px-3 text-right">Last Sync</th>
                  </tr>
                </thead>
                <tbody>
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
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
              <span className="material-symbols-outlined text-sm align-text-bottom mr-1 text-amber-400">
                trending_down
              </span>
              EOD Failure Ranking
              {eodRanking.length > 0 && (
                <span className="ml-2 text-xs font-normal text-amber-400">
                  ({eodSummary.totalStoresWithFailures || eodRanking.length} stores)
                </span>
              )}
            </h2>
            <div className="live-text-3xs text-neutral-600">
              {eodSummary.dateRange?.from && eodSummary.dateRange?.to
                ? `${eodSummary.dateRange.from} – ${eodSummary.dateRange.to}`
                : '-'}
            </div>
          </div>
          <div
            ref={eodScrollRef}
            className="flex-1 overflow-y-auto rounded-xl border border-neutral-800/60 bg-neutral-900/60"
          >
            {eodRanking.length === 0 ? (
              <div className="flex items-center justify-center h-full text-neutral-600 text-sm">
                <span className="material-symbols-outlined text-3xl mr-3 text-emerald-500/40">
                  check_circle
                </span>
                No EOD failures recorded
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-700/60 live-text-2xs uppercase text-neutral-500 tracking-wider">
                    <th className="py-2 px-3 w-8">#</th>
                    <th className="py-2 px-3 w-24 text-right">Code</th>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Branch</th>
                    <th className="py-2 px-3 text-center">Fail / OK</th>
                    <th className="py-2 px-3 text-right">Fail %</th>
                  </tr>
                </thead>
                <tbody>
                  {eodRanking.map((store, idx) => (
                    <EodRankRow key={store.storeCode} store={store} idx={idx} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      {/* ── Inline Styles ──────────────────────────────────────── */}
      <style>{`
        .live-root {
          position: fixed;
          inset: 0;
          background: #0a0a0a;
          color: #fafafa;
          display: flex;
          flex-direction: column;
          gap: 16px;
          overflow: hidden;
          font-family: Inter, system-ui, -apple-system, sans-serif;
        }
        .live-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(10,10,10,0.95);
          backdrop-filter: blur(12px);
          flex-shrink: 0;
        }
        .live-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 20px;
          transition: all 0.3s ease;
        }
        .live-card:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.1);
        }
        .live-card-sm {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 14px;
          transition: all 0.3s ease;
        }
        .live-card-sm:hover {
          background: rgba(255,255,255,0.05);
        }
        /* Thin scrollbar for manual scroll */
        .live-root ::-webkit-scrollbar { width: 6px; height: 6px; }
        .live-root ::-webkit-scrollbar-track { background: transparent; }
        .live-root ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
        .live-root ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
        .live-root { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.15) transparent; }
        /* Material Symbols */
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
      `}</style>
    </div>
  );
};

export default LiveSync;
