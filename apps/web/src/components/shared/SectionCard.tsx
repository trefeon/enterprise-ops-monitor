import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
          <div className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
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
              <div className="flex items-center shrink-0 w-full sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">
                {right}
              </div>
            )}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

export default SectionCard;
