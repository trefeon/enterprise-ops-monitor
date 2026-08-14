import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface SectionCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned header actions. */
  actions?: ReactNode;
  /** Padded strip between header and body (search/filter rows). */
  toolbar?: ReactNode;
  /** Flush body (tables). Prefer TableCard for the table convention. */
  noPadding?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * SectionCard - the framed section container (supersedes ui/cards/SectionCard).
 *
 * Card chrome is inherited from ui/card (6px radius, border-border, bg-card,
 * no shadows). Title renders as an h2. `noPadding` gives a flush body for
 * tables - TableCard is the named shortcut for exactly that case.
 */
export function SectionCard({
  title,
  subtitle,
  actions,
  toolbar,
  noPadding = false,
  className,
  children,
}: SectionCardProps) {
  const hasHeader = Boolean(title || subtitle || actions);

  return (
    <Card className={cn('gap-0 overflow-hidden py-0', className)}>
      {hasHeader && (
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pb-4 pt-5">
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
        <div className={cn('px-4 py-3', hasHeader && 'border-t border-border')}>{toolbar}</div>
      )}
      <div className={cn(!noPadding && 'px-5 py-4')}>{children}</div>
    </Card>
  );
}

export default SectionCard;
