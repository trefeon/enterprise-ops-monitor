import { Card, CardContent } from '@/components/ui/card';
import { ProgressBar } from '@/components/shared/ProgressBar';
import type { EODArea } from '../types';

interface EODSummaryCardProps {
  branch: EODArea;
  onBranchClick: (branch: EODArea) => void;
}

export function EODSummaryCard({ branch, onBranchClick }: EODSummaryCardProps) {
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
      type="button"
      className="block w-full text-left border-0 bg-transparent p-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      onClick={() => onBranchClick(branch)}
    >
      <Card className="transition-all hover:shadow-md hover:ring-1 hover:ring-ring cursor-pointer min-h-36 justify-between border border-border/50">
        <CardContent className="p-4 flex flex-col gap-3.5 h-full justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-foreground tracking-tight break-words">
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
            <span className="text-muted-foreground/30">&bull;</span>
            <span>{pending} pending</span>
            <span className="text-muted-foreground/30">&bull;</span>
            <span className={failed > 0 ? 'text-status-error font-semibold' : ''}>
              {failed} failed
            </span>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
