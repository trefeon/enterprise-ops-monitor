import { Badge } from '@/components/ui/badge';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  variant: 'success' | 'warning' | 'destructive' | 'default' | 'secondary' | 'outline';
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ variant, children, className, size = 'md' }: StatusBadgeProps) {
  const dotColor = {
    success: 'bg-status-success',
    warning: 'bg-status-warning',
    destructive: 'bg-destructive',
    default: 'bg-primary-foreground',
    secondary: 'bg-secondary-foreground',
    outline: 'bg-muted-foreground',
  };

  const sizes = {
    sm: 'gap-1 px-1.5 py-0 h-4.5 text-[0.65rem]',
    md: 'gap-1.5 px-2 py-0.5 h-5.5 text-[0.7rem]',
    lg: 'gap-2 px-3 py-1 h-7 text-xs',
  };

  const dotSizes = {
    sm: 'size-1.5',
    md: 'size-2',
    lg: 'size-2.5',
  };

  return (
    <Badge
      variant={variant}
      className={cn('font-bold uppercase tracking-wider', sizes[size], className)}
    >
      <span
        className={cn(
          'shrink-0 rounded-full',
          dotColor[variant] || dotColor.default,
          dotSizes[size]
        )}
      />
      {children}
    </Badge>
  );
}
