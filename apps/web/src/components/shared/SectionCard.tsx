import type { ReactNode } from 'react';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { sectionActionGroupClass } from './actionLayout';

export interface SectionCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function SectionCard({
  title,
  subtitle,
  right,
  children,
  className,
  noPadding = false,
}: SectionCardProps) {
  return (
    <Card className={cn('border-border bg-card', className)}>
      {(title || right) && (
        <CardHeader className={cn(!subtitle && 'items-center')}>
          <div className="min-w-0">
            {title && <CardTitle>{title}</CardTitle>}
            {subtitle && <CardDescription className="mt-1 break-words">{subtitle}</CardDescription>}
          </div>
          {right && <CardAction className={sectionActionGroupClass}>{right}</CardAction>}
        </CardHeader>
      )}
      <CardContent className={cn(noPadding ? 'p-0' : 'p-5')}>
        {children}
      </CardContent>
    </Card>
  );
}

export default SectionCard;
