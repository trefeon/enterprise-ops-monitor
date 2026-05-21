import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface LegacyAction {
  onClick: () => void;
  label: string;
  icon?: ReactNode;
}

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode | LegacyAction;
  className?: string;
  compact?: boolean;
}

const isLegacyAction = (action: any): action is LegacyAction => {
  return action && typeof action === 'object' && 'onClick' in action && 'label' in action;
};

export function EmptyState({
  title = 'No data available',
  description = 'There are no records to display at this time.',
  icon,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  const renderAction = () => {
    if (!action) return null;

    if (isLegacyAction(action)) {
      return (
        <Button onClick={action.onClick} variant="outline" size={compact ? 'sm' : 'default'} className="gap-2">
          {action.icon && <span className="[&>svg]:size-4">{action.icon}</span>}
          {action.label}
        </Button>
      );
    }

    return action;
  };

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
              compact ? 'mb-4 size-10 [&>svg]:size-5' : 'mb-6 size-14 [&>svg]:size-8'
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
            {renderAction()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export default EmptyState;
