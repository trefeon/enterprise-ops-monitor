import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { sectionActionGroupClass } from './actionLayout';

export interface SectionCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function SectionCard({
  title,
  subtitle,
  right,
  children,
  className,
  noPadding = false,
}: SectionCardProps) {
  return (
    <Card className={cn('border-border bg-card', className)}>
      <CardContent className={cn(noPadding ? 'p-0' : 'p-5')}>
        {(title || right) && (
          <div className="mb-4 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div className="min-w-0 flex-1">
              {title && (
                <div className="text-sm font-semibold text-foreground leading-none">
                  {title}
                </div>
              )}
              {subtitle && (
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed break-words">
                  {subtitle}
                </div>
              )}
            </div>
            {right && (
              <div className={sectionActionGroupClass}>{right}</div>
            )}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

export default SectionCard;
