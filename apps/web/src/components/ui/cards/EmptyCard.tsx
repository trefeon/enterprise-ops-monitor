import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface EmptyCardProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyCard({
  title = 'No data available',
  description = 'There are no records to display at this time.',
  icon,
  action,
  compact = false,
  className,
}: EmptyCardProps) {
  return (
    <Card className={cn('border-dashed bg-card border-border', className)}>
      <CardContent
        className={cn(
          'flex flex-col items-center justify-center text-center',
          compact ? 'py-8 px-4' : 'py-16 px-6'
        )}
      >
        {icon && (
          <div
            className={cn(
              'flex items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground',
              compact
                ? 'mb-4 size-10 [&>svg]:size-5'
                : 'mb-6 size-14 [&>svg]:size-8'
            )}
          >
            <span className="transition-colors">{icon}</span>
          </div>
        )}
        <h3
          className={cn(
            'font-display font-semibold tracking-normal text-foreground',
            compact ? 'text-sm mb-1' : 'text-lg mb-2'
          )}
        >
          {title}
        </h3>
        {description && (
          <p
            className={cn(
              'text-muted-foreground max-w-md leading-relaxed',
              compact ? 'text-xs mb-4' : 'text-sm mb-8'
            )}
          >
            {description}
          </p>
        )}
        {action && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {action}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EmptyCard;
