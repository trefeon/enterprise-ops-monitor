import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ActionBar } from './ActionBar';

interface SectionHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, meta, actions, className }: SectionHeaderProps) {
  return (
    <ActionBar
      className={cn('border-b border-border/60 pb-3', className)}
      left={
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight text-foreground break-words">{title}</h2>
          {description && (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground break-words">
              {description}
            </p>
          )}
          {meta && <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{meta}</div>}
        </div>
      }
      right={actions}
    />
  );
}

export default SectionHeader;
