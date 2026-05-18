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
  const isMaterialIcon = typeof icon === 'string';

  return (
    <Card className={cn('border-dashed border-border/60 bg-muted/5', className)}>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        {icon && (
          <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-muted shadow-inner">
            <span
              className={cn(
                'text-muted-foreground transition-colors',
                isMaterialIcon ? 'material-symbols-outlined text-3xl' : '[&>svg]:size-8'
              )}
            >
              {icon}
            </span>
          </div>
        )}
        <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">{title}</h3>
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
