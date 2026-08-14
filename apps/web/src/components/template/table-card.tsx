import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface TableCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned header actions (Export, Create...). */
  actions?: ReactNode;
  /** Search/filter strip above the table. */
  toolbar?: ReactNode;
  /** Optional footer row (counts, notes). */
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * TableCard - the table terminal pattern: the data table is the last element
 * in a page flow, and every page that has one wraps it the same way.
 *
 * Header row carries a border-b (unlike SectionCard), toolbar is a bordered
 * strip, the table itself is flush (p-0). Children are a DataTable (or, for
 * the Backups migration only, BaseDataTable).
 */
export function TableCard({
  title,
  subtitle,
  actions,
  toolbar,
  footer,
  className,
  children,
}: TableCardProps) {
  const hasHeader = Boolean(title || subtitle || actions);

  return (
    <Card className={cn('gap-0 overflow-hidden py-0', className)}>
      {hasHeader && (
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h2 className="font-heading text-base font-medium leading-snug text-foreground">
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {toolbar && (
        <div
          className={cn(
            'flex flex-wrap items-center gap-2 px-4 py-3',
            hasHeader && 'border-b border-border'
          )}
        >
          {toolbar}
        </div>
      )}
      <div className="p-0">{children}</div>
      {footer && <div className="border-t border-border px-4 py-3">{footer}</div>}
    </Card>
  );
}

export default TableCard;
