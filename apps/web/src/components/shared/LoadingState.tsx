import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  title?: string;
  rows?: number;
  className?: string;
}

export function LoadingState({ title = 'Loading data', rows = 4, className }: LoadingStateProps) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-card p-4', className)}
      role="status"
      aria-busy="true"
      aria-label={title}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <Skeleton className="h-5 w-40 bg-muted/70" />
        <Skeleton className="h-8 w-24 bg-muted/70" />
      </div>
      <div className="grid gap-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="grid gap-2 rounded-md border border-border/70 bg-background/40 p-3">
            <Skeleton className="h-4 w-2/3 bg-muted/70" />
            <Skeleton className="h-3 w-1/2 bg-muted/70" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default LoadingState;
