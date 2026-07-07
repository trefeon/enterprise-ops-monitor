import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';
import {
  Loader2,
  ChevronUp,
  ChevronDown,
  Trophy,
  Save,
} from 'lucide-react';
import type { AfterHoursRankingItem } from '../types';
import { formatReportTimelineItem, formatGeneratedAt } from '../utils';

const medalClasses = ['text-status-warning', 'text-muted-foreground', 'text-status-warning/70'];

interface RankingTableProps {
  ranking: AfterHoursRankingItem[];
  loading: boolean;
  totalStores: number;
  branchLabel: string;
  month: string;
  search: string;
  expandedRow: string | null;
  onToggleExpand: (storeCode: string | null) => void;
  onFormatMonthLabel: (m: string) => string;
}

export function RankingTable({
  ranking,
  loading,
  totalStores,
  branchLabel,
  month,
  search,
  expandedRow,
  onToggleExpand,
  onFormatMonthLabel,
}: RankingTableProps) {
  const normalizedSearch = search.trim();

  return (
    <Card className="p-0 overflow-hidden">
      <CardContent className="p-0">
        {!loading && ranking.length > 0 && (
          <div className="flex flex-col gap-1 border-b border-border bg-muted/20 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium text-foreground">
              {branchLabel} • {onFormatMonthLabel(month + '-01')}
            </span>
            <span className="text-muted-foreground">Top {ranking.length} violating stores</span>
          </div>
        )}
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : ranking.length === 0 ? (
          <EmptyState
            title="No report data"
            description={
              normalizedSearch
                ? `No violating stores match the search "${normalizedSearch}" for ${onFormatMonthLabel(month + '-01')}.`
                : `No report data available for ${onFormatMonthLabel(month + '-01')}. Click "Generate Report" to create one.`
            }
            icon={<Save className="size-8" />}
          />
        ) : (
          <DataTable
            columns={[
              {
                header: 'Rank',
                render: (item: AfterHoursRankingItem) =>
                  item.rank <= 3 ? (
                    <Trophy className={cn('size-4', medalClasses[item.rank - 1])} />
                  ) : (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-secondary text-xs font-bold text-secondary-foreground">
                      {item.rank}
                    </span>
                  ),
              },
              {
                header: 'Store',
                render: (item: AfterHoursRankingItem) => (
                  <div className="flex flex-col">
                    <span className="font-mono text-xs text-foreground">{item.store_code}</span>
                    <span className="text-xs text-muted-foreground">{item.store_name || '—'}</span>
                  </div>
                ),
              },
              {
                header: 'Branch',
                render: (item: AfterHoursRankingItem) => (
                  <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                    {item.branch_name || item.branch_id}
                  </span>
                ),
              },
              {
                header: 'Violation Days',
                render: (item: AfterHoursRankingItem) => (
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'text-sm font-bold',
                        item.violation_count >= 20
                          ? 'text-destructive'
                          : item.violation_count >= 10
                            ? 'text-status-warning'
                            : 'text-foreground'
                      )}
                    >
                      {item.violation_count}
                    </span>
                    <span className="text-xs text-muted-foreground">day(s)</span>
                  </span>
                ),
              },
              {
                header: 'Detail',
                render: (item: AfterHoursRankingItem) => {
                  const isExpanded = expandedRow === item.store_code;
                  const dates = Array.isArray(item.violation_dates)
                    ? item.violation_dates
                    : [];
                  const timestamps = Array.isArray(item.violation_timestamps)
                    ? item.violation_timestamps
                    : [];
                  const detailItems = timestamps.length > 0 ? timestamps : dates;
                  const detailLabel = timestamps.length > 0 ? 'times' : 'dates';
                  return (
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          onToggleExpand(isExpanded ? null : item.store_code)
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                        {detailItems.length} {detailLabel}
                      </Button>
                      {isExpanded && detailItems.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 py-1">
                          {detailItems.map((timestampStr) => (
                            <span
                              key={timestampStr}
                              className="inline-flex items-center rounded-sm border border-border/60 bg-background px-2.5 py-1 text-xs text-foreground"
                            >
                              {formatReportTimelineItem(timestampStr)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                },
              },
            ]}
            data={ranking}
            keyExtractor={(item: AfterHoursRankingItem) => item.store_code}
            noCard
            rowClassName={(item: AfterHoursRankingItem) =>
              item.rank <= 3 ? 'bg-destructive/5' : ''
            }
          />
        )}
        {!loading && ranking.length > 0 && (
          <div className="border-t border-border bg-card px-cell-x py-cell-y flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
            <span className="text-muted-foreground">
              Showing{' '}
              <span className="font-medium text-foreground">{ranking.length}</span> of{' '}
              <span className="font-medium text-foreground">{totalStores}</span> violating
              store(s)
            </span>
            <span className="text-xs text-muted-foreground">
              {ranking[0]?.generated_at
                ? `Generated: ${formatGeneratedAt(ranking[0].generated_at)}`
                : ''}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
