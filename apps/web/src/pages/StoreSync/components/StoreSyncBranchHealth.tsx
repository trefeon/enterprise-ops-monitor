import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ProgressBar } from '@/components/shared/ProgressBar';
import type { StoreSyncBranch } from '../types';

interface BranchHealthProps {
  branches: StoreSyncBranch[];
  branchFilter: string;
  sourceErrorBranchIds: Set<string>;
  onBranchClick: (branchId: string) => void;
}

export function StoreSyncBranchHealth({
  branches,
  branchFilter,
  sourceErrorBranchIds,
  onBranchClick,
}: BranchHealthProps) {
  if (branches.length === 0) return null;

  return (
    <div>
      <h3 className="section-title">Branch Network Health</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {branches.map((branch) => {
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
          const branchId = String(branch.id || '');

          return (
            <Card
              key={branch.id}
              role="button"
              tabIndex={0}
              onClick={() => onBranchClick(branchId)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') {
                  onBranchClick(branchId);
                }
              }}
              className={`transition-[transform,box-shadow,border-color] hover:border-primary/50 hover:shadow-md active:scale-95 cursor-pointer ${isBranchSelected ? 'ring-2 ring-ring' : ''}`}
            >
              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground break-words">{branch.name}</span>
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
  );
}
