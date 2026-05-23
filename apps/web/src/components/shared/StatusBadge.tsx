import { Badge } from '@/components/ui/badge';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'destructive'
  | 'info'
  | 'neutral'
  | 'default'
  | 'secondary'
  | 'outline';

export interface StatusBadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  live?: boolean;
  dot?: boolean;
}

export function StatusBadge({
  variant,
  children,
  className,
  size = 'md',
  live,
  dot = true,
}: StatusBadgeProps) {
  const normalizedVariant = variant === 'error' ? 'destructive' : variant;
  const badgeVariant =
    normalizedVariant === 'destructive'
      ? 'destructive'
      : normalizedVariant === 'neutral'
        ? 'neutral'
        : normalizedVariant;

  const glowClasses: Record<BadgeVariant, string> = {
    success: 'badge-glow-success',
    warning: 'badge-glow-warning',
    destructive: 'badge-glow-danger',
    error: 'badge-glow-danger',
    info: 'badge-glow-info',
    neutral: 'badge-glow-neutral',
    default: '',
    secondary: '',
    outline: '',
  };

  const dotColor = {
    success: 'bg-status-success',
    warning: 'bg-status-warning',
    destructive: 'bg-destructive',
    error: 'bg-destructive',
    info: 'bg-status-info',
    neutral: 'bg-status-neutral',
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
      variant={badgeVariant}
      className={cn('font-semibold uppercase tracking-wider', glowClasses[variant], sizes[size], className)}
    >
      {dot && (
        <span
          className={cn(
            'relative shrink-0 rounded-full',
            dotColor[normalizedVariant] || dotColor.default,
            live &&
              "after:absolute after:inset-[-2px] after:rounded-full after:bg-current after:content-[''] after:animate-ping",
            dotSizes[size]
          )}
        />
      )}
      {children}
    </Badge>
  );
}
export default StatusBadge;
