import type { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface ListCardItem {
  id: string;
  label: string;
  value?: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
}

export interface ListCardProps {
  title: string;
  subtitle?: string;
  items: ListCardItem[];
  loading?: boolean;
  emptyState?: ReactNode;
  maxHeight?: string;
  className?: string;
}

export function ListCard({
  title,
  subtitle,
  items,
  loading = false,
  emptyState,
  maxHeight = '300px',
  className,
}: ListCardProps) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent className="p-0">
        <div
          className="overflow-y-auto scrollbar-thin"
          style={{ maxHeight }}
        >
          {loading ? (
            <div className="flex flex-col gap-3 px-5 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            emptyState ? (
              <div className="px-5 py-4">{emptyState}</div>
            ) : (
              <div className="flex items-center justify-center px-5 py-8 text-sm text-muted-foreground">
                No items to display.
              </div>
            )
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={item.onClick}
                    disabled={!item.onClick}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 px-5 py-3 text-left text-sm transition-colors',
                      item.onClick
                        ? 'cursor-pointer hover:bg-muted/50'
                        : 'cursor-default'
                    )}
                  >
                    <span className="flex items-center gap-3 truncate">
                      {item.icon && (
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&>svg]:size-4">
                          {item.icon}
                        </span>
                      )}
                      <span className="truncate font-medium text-foreground">
                        {item.label}
                      </span>
                    </span>
                    {item.value !== undefined && (
                      <span className="shrink-0 text-muted-foreground">
                        {item.value}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ListCard;
