import { useId, useState, type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

export interface ToolbarProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  leftClassName?: string;
  rightClassName?: string;
  variant?: 'card' | 'plain';
}

export function Toolbar({
  title,
  subtitle,
  search,
  filters,
  actions,
  left,
  right,
  children,
  className,
  contentClassName,
  leftClassName,
  rightClassName,
  variant = 'card',
}: ToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const filtersId = useId();

  const hasAdvancedFilters = Boolean(filters);
  const activeActions = actions || right;

  const content = children ? (
    <div className="flex w-full min-w-0 flex-col gap-3">{children}</div>
  ) : (
    <div className="grid w-full min-w-0 gap-3">
      <div className="grid w-full min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="grid min-w-0 gap-3 md:grid-cols-[auto_minmax(0,1fr)] md:items-center lg:flex lg:flex-wrap">
        {(title || subtitle) && (
            <div className="min-w-0 lg:mr-1">
            {title && (
                <div className="text-lg font-bold leading-tight tracking-normal text-foreground break-words">
                {title}
              </div>
            )}
            {subtitle && (
              <div className="mt-1 text-xs leading-5 text-muted-foreground break-words">
                {subtitle}
              </div>
            )}
          </div>
        )}

        {search && (
            <div className="min-w-0 md:max-w-md lg:max-w-xl lg:flex-1">
            {search}
          </div>
        )}

          {left && (
            <div
              className={cn(
                'grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:w-auto lg:flex-wrap lg:items-center [&>*]:min-w-0',
                leftClassName
              )}
            >
              {left}
            </div>
          )}
        </div>

        <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:ml-auto lg:w-auto [&>*]:w-full sm:[&>*]:w-auto">
          {activeActions && (
            <div className={cn('flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end', rightClassName)}>
              {activeActions}
            </div>
          )}

          {hasAdvancedFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
              aria-controls={filtersId}
              className={cn(
                'h-10 min-w-24 border-border transition-all hover:bg-muted/30',
                isExpanded && 'border-primary/40 bg-primary/10 text-primary'
              )}
            >
              <SlidersHorizontal />
              <span className="text-xs font-semibold">Filters</span>
              {isExpanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
          )}
        </div>
      </div>

      {hasAdvancedFilters && isExpanded && (
        <div 
          id={filtersId}
          className={cn(
            'animate-in fade-in slide-in-from-top-1 grid grid-cols-1 gap-3 border-t border-border/60 pt-3.5 duration-200 sm:grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap lg:items-center [&>*]:min-w-0',
            leftClassName
          )}
        >
          {filters}
        </div>
      )}
    </div>
  );

  if (variant === 'plain') {
    return (
      <div className={cn('w-full', className)}>
        <div className={cn('py-1', contentClassName)}>{content}</div>
      </div>
    );
  }

  return (
    <Card className={cn('border-border bg-card shadow-sm', className)}>
      <CardContent className={cn('px-4 py-3.5 sm:px-5 sm:py-4', contentClassName)}>
        {content}
      </CardContent>
    </Card>
  );
}

export default Toolbar;
