import { useState, type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

export interface ToolbarProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  
  // New props for structured layout
  search?: ReactNode;       // Main search bar component (always visible)
  filters?: ReactNode;      // Advanced filters (dropdowns/dates/checkboxes)
  actions?: ReactNode;      // Action buttons (Reset, Export, Apply, etc.)
  
  // Backward compatibility props
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

  // Determine if we have advanced filters to collapse
  const hasFilters = Boolean(filters || left);
  const activeFilters = filters || left;
  const activeActions = actions || right;

  const content = children ? (
    <div className="flex w-full min-w-0 flex-col gap-3">{children}</div>
  ) : (
    <div className="flex w-full flex-col gap-3.5">
      {/* Top Row: Title, Search, Primary Actions, and Filter Toggle */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between w-full min-w-0">
        
        {/* Title / Heading Section */}
        {(title || subtitle) && (
          <div className="min-w-0 shrink-0">
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

        {/* Search Bar Section (flex-1 so it takes available space) */}
        {search && (
          <div className="flex-1 min-w-0 md:max-w-md lg:max-w-xl">
            {search}
          </div>
        )}

        {/* Actions & Filters Toggle Button Group */}
        <div className="flex items-center gap-2 shrink-0 justify-end w-full md:w-auto">
          {/* Action buttons (Reset, Export, Add, etc.) shown on the main row if not collapsed */}
          {activeActions && (
            <div className={cn("flex flex-wrap items-center gap-2", rightClassName)}>
              {activeActions}
            </div>
          )}

          {/* Filters Toggle Button (only rendered if there are advanced filters) */}
          {hasFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "h-10 px-3 flex items-center gap-1.5 border-border transition-all hover:bg-muted/30",
                isExpanded && "border-primary/40 bg-primary/10 text-primary"
              )}
            >
              <SlidersHorizontal className="size-4" />
              <span className="text-xs font-semibold">Filters</span>
              {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </Button>
          )}
        </div>
      </div>

      {/* Bottom Collapsible Row: Advanced Filters */}
      {hasFilters && isExpanded && (
        <div 
          className={cn(
            "grid grid-cols-1 gap-3 border-t border-border/40 pt-3.5 sm:grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap lg:items-center [&>*]:min-w-0 animate-in fade-in slide-in-from-top-1 duration-200",
            leftClassName
          )}
        >
          {activeFilters}
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
