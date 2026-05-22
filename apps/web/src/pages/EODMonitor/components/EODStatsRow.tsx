import { Store, CheckCircle2, Hourglass, CircleAlert } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { ProgressBar } from '@/components/shared/ProgressBar';
import type { EODStats } from '../types';

interface EODStatsRowProps {
  stats: EODStats;
  statsLoading: boolean;
  statsError: string | null;
  completionRate: number;
  pendingRate: number;
  onStatusClick: (status: string) => void;
}

export function EODStatsRow({
  stats,
  statsLoading,
  statsError,
  completionRate,
  pendingRate,
  onStatusClick,
}: EODStatsRowProps) {
  const isLoadingOrError = statsLoading || !!statsError;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-section">
      <StatCard
        title="Total Stores"
        value={isLoadingOrError ? '-' : stats.total}
        icon={<Store className="size-5" />}
        subtext="Active locations"
        onClick={() => onStatusClick('')}
      />
      <StatCard
        title="EOD Completed"
        value={isLoadingOrError ? '-' : stats.done}
        icon={<CheckCircle2 className="size-5" />}
        status="success"
        footer={
          <ProgressBar
            value={completionRate}
            trackClassName="bg-muted"
            barClassName="bg-status-success"
          />
        }
        onClick={() => onStatusClick('done')}
      />
      <StatCard
        title="Pending"
        value={isLoadingOrError ? '-' : stats.pending}
        icon={<Hourglass className="size-5" />}
        status="warning"
        footer={
          <ProgressBar
            value={pendingRate}
            trackClassName="bg-muted"
            barClassName="bg-status-warning"
          />
        }
        onClick={() => onStatusClick('pending')}
      />
      <StatCard
        title="Failed"
        value={isLoadingOrError ? '-' : stats.failed}
        icon={<CircleAlert className="size-5" />}
        status="error"
        subtext="Needs attention"
        onClick={() => onStatusClick('failed')}
      />
    </div>
  );
}
