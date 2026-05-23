import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, MoveRight } from 'lucide-react';

export type StatStatus = 'default' | 'success' | 'warning' | 'error' | 'info';

export interface StatCardProps {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
  subtext?: ReactNode;
  footer?: ReactNode;
  className?: string;
  accent?: string;
  status?: StatStatus;
  onClick?: () => void;
  size?: 'sm' | 'default' | 'lg';
  loading?: boolean;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'flat';
    label?: string;
  };
}

const statusStyles: Record<StatStatus, { value: string; rail: string; icon: string }> = {
  default: {
    value: 'text-foreground',
    rail: 'bg-border',
    icon: 'border-border bg-muted text-foreground',
  },
  success: {
    value: 'text-status-success',
    rail: 'bg-status-success',
    icon: 'border-status-success/15 bg-status-success/10 text-status-success',
  },
  warning: {
    value: 'text-status-warning',
    rail: 'bg-status-warning',
    icon: 'border-status-warning/15 bg-status-warning/10 text-status-warning',
  },
  error: {
    value: 'text-status-error',
    rail: 'bg-status-error',
    icon: 'border-status-error/15 bg-status-error/10 text-status-error',
  },
  info: {
    value: 'text-status-info',
    rail: 'bg-status-info',
    icon: 'border-status-info/15 bg-status-info/10 text-status-info',
  },
};

const paddingSizes = {
  sm: 'pt-3.5 px-3.5 pb-3.5',
  default: 'pt-4 px-4 pb-4 sm:pt-5 sm:px-5 sm:pb-5',
  lg: 'pt-5 px-5 pb-5 sm:pt-6 sm:px-6 sm:pb-6',
};

const titleSizes = {
  sm: 'text-[10px]',
  default: 'text-xs',
  lg: 'text-sm',
};

const valueSizes = {
  sm: 'text-xl',
  default: 'text-2xl sm:text-[1.75rem]',
  lg: 'text-[1.75rem] sm:text-3xl',
};

export function StatCard({
  title,
  value,
  icon,
  subtext,
  footer,
  className,
  accent: accentProp,
  status = 'default',
  onClick,
  size = 'default',
  loading = false,
  trend,
}: StatCardProps) {
  const styles = statusStyles[status] || statusStyles.default;
  const accent = accentProp || styles.value;

  const renderTrend = () => {
    if (!trend) return null;

    const trendColors = {
      up: 'text-status-success bg-status-success/10 border-status-success/15',
      down: 'text-status-error bg-status-error/10 border-status-error/15',
      flat: 'text-muted-foreground bg-muted border-border',
    };

    const TrendIcon = {
      up: TrendingUp,
      down: TrendingDown,
      flat: MoveRight,
    }[trend.direction];

    return (
      <div className="flex items-center gap-1.5 mt-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border',
            trendColors[trend.direction]
          )}
        >
          <TrendIcon className="size-3" />
          {trend.direction !== 'flat' && (trend.value > 0 ? '+' : '')}
          {trend.value}%
        </span>
        {trend.label && (
          <span className="text-[10px] text-muted-foreground font-medium">
            {trend.label}
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className={cn('relative flex h-full flex-col overflow-hidden', className)}>
        <CardContent className={cn('flex flex-1 flex-col', paddingSizes[size])}>
          <div className={cn('absolute inset-x-0 top-0 h-0.5', styles.rail)} />
          <div className="flex justify-between items-start">
            <Skeleton className="h-4 w-24 bg-muted/60" />
            <Skeleton className="size-9 rounded-lg bg-muted/60 sm:size-10" />
          </div>
          <div className="mt-4 mb-2">
            <Skeleton className="h-8 w-32 bg-muted/60" />
          </div>
          <div className="mt-auto space-y-2">
            <Skeleton className="h-3 w-40 bg-muted/60" />
            <Skeleton className="h-3 w-28 bg-muted/60" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      onClick={onClick}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden transition-all duration-200 border-border',
        onClick && 'cursor-pointer hover:border-primary/50 active:scale-[0.98]',
        className
      )}
    >
      <CardContent className={cn('flex flex-1 flex-col', paddingSizes[size])}>
        {/* Top semantic rail */}
        <div className={cn('absolute inset-x-0 top-0 h-0.5', styles.rail)} />

        <div className="relative flex flex-1 flex-col">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <span
              className={cn(
                'min-w-0 font-semibold text-muted-foreground uppercase tracking-wider break-words',
                titleSizes[size]
              )}
            >
              {title}
            </span>
            {icon ? (
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-lg border transition-transform duration-200 group-hover:-translate-y-0.5 sm:size-10 [&>svg]:size-4 sm:[&>svg]:size-5',
                  styles.icon,
                  accentProp
                )}
              >
                {icon}
              </span>
            ) : (
              <div className="size-9 sm:size-10" />
            )}
          </div>

          <div className="mt-2 flex flex-col justify-start">
            <div
              className={cn(
                'font-mono font-bold leading-tight tracking-normal break-words',
                valueSizes[size],
                accent
              )}
            >
              {value}
            </div>
            {renderTrend()}
          </div>

          <div className="mt-auto pt-2">
            {footer && <div className="mb-2">{footer}</div>}
            {subtext && (
              <div className="text-xs text-muted-foreground leading-relaxed break-words">
                {subtext}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
