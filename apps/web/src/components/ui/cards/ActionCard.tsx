import type { ReactNode } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ActionCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actionLabel: string;
  onAction: () => void;
  variant?: 'default' | 'primary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

const buttonVariantMap: Record<
  NonNullable<ActionCardProps['variant']>,
  'default' | 'outline' | 'ghost'
> = {
  default: 'outline',
  primary: 'default',
  ghost: 'ghost',
};

export function ActionCard({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  variant = 'default',
  loading = false,
  disabled = false,
  className,
}: ActionCardProps) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
        {loading ? (
          <>
            <Skeleton className="size-12 rounded-full" />
            <Skeleton className="h-5 w-40" />
            {description && <Skeleton className="h-4 w-60" />}
            <Skeleton className="h-8 w-28 rounded-lg" />
          </>
        ) : (
          <>
            {icon && (
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground [&>svg]:size-6">
                {icon}
              </div>
            )}
            <div className="flex flex-col gap-1">
              <CardTitle className="text-sm">{title}</CardTitle>
              {description && (
                <CardDescription className="text-xs">
                  {description}
                </CardDescription>
              )}
            </div>
            <Button
              variant={buttonVariantMap[variant]}
              onClick={onAction}
              disabled={disabled || loading}
              className="gap-2"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {actionLabel}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ActionCard;
