import { Store, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { StatCard } from '@/components/ui/cards';
import type { StoreSyncSummary, StoreSyncStatus } from '../types';
import { formatDuration } from '../hooks/useStoreSync';

interface SummaryCardsProps {
  summary: StoreSyncSummary | null;
  status: StoreSyncStatus | null;
  syncedMaxLabel: string;
  staleMaxLabel: string;
  statusFilter: string;
  onKpiStatusClick: (status: string) => void;
  onTotalStoresClick: () => void;
  onOldestClick: () => void;
  isStatusSelected: (value: string) => boolean;
}

export function StoreSyncSummaryCards({
  summary,
  status,
  syncedMaxLabel,
  staleMaxLabel,
  statusFilter,
  onKpiStatusClick,
  onTotalStoresClick,
  onOldestClick,
  isStatusSelected,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <StatCard
        title="Total Stores"
        icon={<Store className="size-5" />}
        value={<span className="tabular-nums">{summary?.totalStores ?? '-'}</span>}
        subtext="Across all branches"
        onClick={onTotalStoresClick}
        className={statusFilter === '' ? 'ring-2 ring-ring' : ''}
      />

      <StatCard
        title="On-time"
        icon={<CheckCircle className="size-5" />}
        value={<span className="tabular-nums text-status-success">{summary?.synced ?? '-'}</span>}
        subtext={`Last sync 0–${syncedMaxLabel}`}
        accent="text-status-success"
        onClick={() => onKpiStatusClick('synced')}
        className={isStatusSelected('synced') ? 'ring-2 ring-ring' : ''}
      />

      <StatCard
        title="Warning"
        icon={<AlertTriangle className="size-5" />}
        value={
          <span
            className={`tabular-nums ${(Number(summary?.stale) || 0) > 0 ? 'text-status-warning' : 'text-foreground'}`}
          >
            {summary?.stale ?? '-'}
          </span>
        }
        subtext={`Last sync ${syncedMaxLabel}–${staleMaxLabel}`}
        accent={
          (Number(summary?.stale) || 0) > 0 ? 'text-status-warning' : 'text-muted-foreground'
        }
        onClick={() => onKpiStatusClick('stale')}
        className={isStatusSelected('stale') ? 'ring-2 ring-ring' : ''}
      />

      <StatCard
        title="Late"
        icon={<AlertTriangle className="size-5" />}
        value={
          <span
            className={`tabular-nums ${(Number(status?.late) || 0) > 0 ? 'text-status-error' : 'text-foreground'}`}
          >
            {status?.late ?? '-'}
          </span>
        }
        subtext={`Last sync ${staleMaxLabel}+ • Total late ${summary?.problem ?? '-'} • No timestamp ${status?.noTimestamp ?? '-'}`}
        accent={
          (Number(summary?.problem) || 0) > 0 ? 'text-status-error' : 'text-muted-foreground'
        }
        onClick={() => onKpiStatusClick('problem')}
        className={isStatusSelected('problem') ? 'ring-2 ring-ring' : ''}
      />

      <StatCard
        title="Oldest Last Sync"
        icon={<Clock className="size-5" />}
        value={summary?.oldest?.ageSec != null ? <span className="tabular-nums">{formatDuration(summary.oldest.ageSec)}</span> : '-'}
        subtext={
          <span className="block break-words" title={summary?.oldest?.namaToko}>
            {summary?.oldest?.namaToko || '-'}
          </span>
        }
        onClick={onOldestClick}
      />
    </div>
  );
}
