import React from 'react';
import { StatCard } from '@/components/ui/cards';
import { Store, Calendar } from 'lucide-react';
import { formatMonthLabel, formatWindowLabel } from '../utils';

interface StatsCardsProps {
  totalStores: number;
  totalViolationDays: number;
  month: string;
  windowStart: string;
  branch: string;
  branchLabel: string;
  search: string;
}

export function StatsCards({
  totalStores,
  totalViolationDays,
  month,
  windowStart,
  branch,
  branchLabel,
  search,
}: StatsCardsProps) {
  const selectedWindowLabel = formatWindowLabel(windowStart);
  const normalizedSearch = search.trim();

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <StatCard
        title="Violating Stores"
        value={totalStores}
        icon={<Store className="size-5" />}
        status={totalStores > 0 ? 'error' : 'success'}
        subtext={`${branchLabel} • ${formatMonthLabel(month + '-01')} • Window: ${selectedWindowLabel}${normalizedSearch ? ` • Search: ${normalizedSearch}` : ''}`}
      />
      <StatCard
        title="Total Violation Days"
        value={totalViolationDays}
        icon={<Calendar className="size-5" />}
        status={totalViolationDays > 0 ? 'warning' : 'success'}
        subtext="Accumulated across all stores"
      />
      <StatCard
        title="Report Period"
        value={formatMonthLabel(month + '-01')}
        icon={<Calendar className="size-5" />}
        status="info"
        subtext={
          branch || normalizedSearch
            ? [
                branch ? `Filtered: ${branchLabel}` : null,
                normalizedSearch ? `Search: ${normalizedSearch}` : null,
              ]
                .filter(Boolean)
                .join(' • ')
            : 'All monitored branches'
        }
      />
    </div>
  );
}
