import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SectionHeadingProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned heading actions. */
  actions?: ReactNode;
  className?: string;
}

/**
 * SectionHeading - the bare (unframed) section heading row.
 *
 * Used above content that is NOT card-framed (grids of panels, plain blocks).
 * Replaces raw `<h3 class="section-title">` (SystemHealth) and the
 * BaseSection header. Always renders an h2 so heading levels stay
 * h1 (PageHeader) -> h2 (sections), never skipped.
 */
export function SectionHeading({ title, subtitle, actions, className }: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-lg font-medium tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export default SectionHeading;
