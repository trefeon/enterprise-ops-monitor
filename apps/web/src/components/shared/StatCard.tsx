import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type StatStatus = 'default' | 'success' | 'warning' | 'error' | 'info';

interface StatCardProps {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
  subtext?: ReactNode;
  footer?: ReactNode;
  className?: string;
  accent?: string;
  status?: StatStatus;
  onClick?: () => void;
}

const statusStyles: Record<StatStatus, { value: string; rail: string; icon: string }> = {
  default: {
    value: 'text-foreground',
    rail: 'bg-foreground/10',
    icon: 'border-border/70 bg-muted/50 text-foreground',
  },
  success: {
    value: 'text-status-success',
    rail: 'bg-status-success/30',
    icon: 'border-status-success/15 bg-status-success/10 text-status-success',
  },
  warning: {
    value: 'text-status-warning',
    rail: 'bg-status-warning/30',
    icon: 'border-status-warning/15 bg-status-warning/10 text-status-warning',
  },
  error: {
    value: 'text-status-error',
    rail: 'bg-status-error/30',
    icon: 'border-status-error/15 bg-status-error/10 text-status-error',
  },
  info: {
    value: 'text-status-info',
    rail: 'bg-status-info/30',
    icon: 'border-status-info/15 bg-status-info/10 text-status-info',
  },
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
}: StatCardProps) {
  const isMaterialIcon = typeof icon === 'string';
  const styles = statusStyles[status] || statusStyles.default;
  const accent = accentProp || styles.value;

  return (
    <Card
      onClick={onClick}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden transition-all',
        onClick && 'cursor-pointer hover:border-primary/50 hover:shadow-md active:scale-[0.98]',
        className
      )}
    >
      <CardContent className="flex flex-1 flex-col pt-4">
        {/* Top semantic rail */}
        <div className={cn('absolute inset-x-0 top-0 h-1', styles.rail)} />

        <div className="relative flex flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </span>
            {icon ? (
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5',
                  isMaterialIcon ? 'material-symbols-outlined text-xl' : '[&>svg]:size-5',
                  styles.icon,
                  accentProp
                )}
              >
                {icon}
              </span>
            ) : (
              <div className="size-10" />
            )}
          </div>

          <div className="mt-2">
            <div className={cn('text-2xl font-bold tracking-tight sm:text-[1.8rem]', accent)}>
              {value}
            </div>
          </div>

          <div className="mt-auto pt-2">
            {footer && <div className="mb-2">{footer}</div>}
            {subtext && <p className="text-xs text-muted-foreground leading-relaxed">{subtext}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
