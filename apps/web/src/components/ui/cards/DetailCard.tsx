import type { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface DetailCardField {
  label: string;
  value: ReactNode;
  span?: number;
}

export interface DetailCardProps {
  title: string;
  subtitle?: string;
  fields: DetailCardField[];
  loading?: boolean;
  className?: string;
  columns?: 1 | 2;
}

export function DetailCard({
  title,
  subtitle,
  fields,
  loading = false,
  className,
  columns = 2,
}: DetailCardProps) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'grid gap-x-6 gap-y-4',
            columns === 2 ? 'grid-cols-2' : 'grid-cols-1'
          )}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex flex-col gap-1.5',
                    columns === 2 && i === 0 && 'col-span-2'
                  )}
                >
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-40" />
                </div>
              ))
            : fields.map((field, i) => (
                <div
                  key={`${field.label}-${i}`}
                  className={cn(
                    'flex flex-col gap-1.5',
                    columns === 2 && field.span === 2 && 'col-span-2'
                  )}
                >
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {field.label}
                  </span>
                  <span className="text-sm text-foreground">
                    {field.value ?? (
                      <span className="italic text-muted-foreground/60">—</span>
                    )}
                  </span>
                </div>
              ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default DetailCard;
