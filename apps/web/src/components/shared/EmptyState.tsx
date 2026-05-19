import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title = 'No data available',
  description = 'There are no records to display at this time.',
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn('border-dashed bg-card', className)}>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        {icon && (
          <div className="mb-6 flex size-14 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
            <span className="transition-colors [&>svg]:size-8">{icon}</span>
          </div>
        )}
        <h3 className="mb-2 font-display text-lg font-semibold tracking-normal text-foreground">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground mb-8 max-w-md leading-relaxed">
            {description}
          </p>
        )}
        {action && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">{action}</div>
        )}
      </CardContent>
    </Card>
  );
}
