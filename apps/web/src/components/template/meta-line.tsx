import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface MetaLineProps {
  /**
   * Items rendered as a bullet-separated line under the page header,
   * e.g. ["Updated 12:00:01", "Auto-refresh 9s", "Live source"].
   */
  items: ReactNode[];
  /** Separator between items. Defaults to the bullet used across the app. */
  separator?: ReactNode;
  className?: string;
}

/**
 * MetaLine - the single meta/status line below the page header.
 * Standardizes the hand-rolled "Updated X - Auto-refresh Ys - source" lines.
 */
export function MetaLine({ items, separator = '•', className }: MetaLineProps) {
  if (items.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground', className)}>
      {items.map((item, index) => (
        <span key={index} className="inline-flex items-center gap-2">
          {index > 0 && (
            <span aria-hidden="true" className="text-muted-foreground/50">
              {separator}
            </span>
          )}
          {item}
        </span>
      ))}
    </div>
  );
}

export default MetaLine;
