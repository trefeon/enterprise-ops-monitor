import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-side header actions (Refresh Now, Export, Create...). */
  actions?: ReactNode;
  className?: string;
}

/**
 * PageHeader - the single page header for every ops page.
 *
 * Supersedes DashboardPageHeader (components/base/dashboard-layout.tsx) and
 * PageHeader (components/shared/PageHeader.tsx). Same visual as
 * DashboardPageHeader: display h1, subtitle, border-b, actions right-aligned.
 *
 * The meta line ("Updated X - Auto-refresh Ys") is NOT part of the header;
 * PageTemplate renders it as a standalone MetaLine below, so live-updating
 * content never re-renders the header itself.
 */
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col justify-between gap-4 border-b border-border pb-5 md:flex-row md:flex-wrap md:items-end',
        className,
      )}
    >
      <div className="min-w-[12rem] flex-1">
        <h1 className="font-display text-xl font-medium leading-tight tracking-normal text-foreground sm:text-2xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 self-start md:self-end">
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
