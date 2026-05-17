import { Badge } from '@/components/ui/badge';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  variant: 'success' | 'warning' | 'destructive' | 'default' | 'secondary' | 'outline';
  children: ReactNode;
  className?: string;
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <Badge variant={variant} className={cn('gap-1.5 px-2 py-0.5', className)}>
      <span
        className={cn(
          'size-2 shrink-0 rounded-full',
          variant === 'success' && 'bg-status-success',
          variant === 'warning' && 'bg-status-warning',
          variant === 'destructive' && 'bg-destructive',
          variant === 'default' && 'bg-primary-foreground',
          variant === 'secondary' && 'bg-secondary-foreground',
          variant === 'outline' && 'bg-muted-foreground'
        )}
      />
      {children}
    </Badge>
  );
}
