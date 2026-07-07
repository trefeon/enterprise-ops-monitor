import React from 'react';
import { Button } from '@/components/ui/button';
import type { AvailableMonth } from '../types';
import { formatMonthLabel } from '../utils';

interface AvailableMonthsChipsProps {
  availableMonths: AvailableMonth[];
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
}

export function AvailableMonthsChips({
  availableMonths,
  selectedMonth,
  onSelectMonth,
}: AvailableMonthsChipsProps) {
  if (availableMonths.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Available Reports:</span>
      {availableMonths.map((m) => {
        const monthStr =
          typeof m.report_month === 'string'
            ? m.report_month.slice(0, 7)
            : new Date(m.report_month).toISOString().slice(0, 7);
        return (
          <Button
            key={monthStr}
            size="sm"
            variant={monthStr === selectedMonth ? 'default' : 'secondary'}
            onClick={() => onSelectMonth(monthStr)}
            className="h-7 rounded-sm px-3 text-xs"
          >
            {formatMonthLabel(m.report_month)} ({m.store_count})
          </Button>
        );
      })}
    </div>
  );
}
