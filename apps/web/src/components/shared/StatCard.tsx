import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

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
  return (
    <Card
      onClick={onClick}
      className={`transition-all ${onClick ? 'cursor-pointer hover:border-primary/50 hover:shadow-md active:scale-[0.98]' : ''} ${className ?? ''}`}
    >
      <CardContent className="flex flex-col gap-2 pt-4">
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          {icon && <span className={`shrink-0 material-symbols-outlined text-xl ${accent ?? 'text-muted-foreground'}`}>{icon}</span>}
        </div>
        <div className={`text-2xl font-semibold tracking-tight ${accent ?? ''}`}>{value}</div>
        {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
      </CardContent>
    </Card>
  );
}
