import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface KpiRowProps extends ComponentProps<'div'> {
  /** Number of KPI cards in the strip. Defaults to 4, the standard ops strip. */
  columns?: 2 | 3 | 4;
  children: ReactNode;
}

const columnClasses: Record<NonNullable<KpiRowProps['columns']>, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
};

/**
 * KpiRow - the responsive KPI strip. Children are StatCard components from
 * @/components/ui/cards (the single KPI card; DashboardStatCard is deprecated).
 */
export function KpiRow({ columns = 4, children, className, ...rest }: KpiRowProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-6', columnClasses[columns], className)} {...rest}>
      {children}
    </div>
  );
}

export default KpiRow;
