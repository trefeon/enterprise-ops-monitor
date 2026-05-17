import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
  subtext?: ReactNode;
  className?: string;
  accent?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  icon,
  subtext,
  className,
  accent,
  onClick,
}: StatCardProps) {
  const isMaterialIcon = typeof icon === 'string';

  return (
    <Card
      onClick={onClick}
      className={cn(
        'transition-all',
        onClick && 'cursor-pointer hover:border-primary/50 hover:shadow-md active:scale-[0.98]',
        className
      )}
    >
      <CardContent className="flex flex-col gap-2 pt-4">
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          {icon && (
            <span
              className={cn(
                'shrink-0',
                isMaterialIcon ? 'material-symbols-outlined text-xl' : '',
                accent ?? 'text-muted-foreground'
              )}
            >
              {icon}
            </span>
          )}
        </div>
        <div className={cn('text-2xl font-semibold tracking-tight', accent)}>{value}</div>
        {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
      </CardContent>
    </Card>
  );
}
