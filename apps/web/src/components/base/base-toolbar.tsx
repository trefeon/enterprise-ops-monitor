import type { ComponentType, ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface BaseToolbarAction {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  disabled?: boolean;
}

export interface BaseToolbarProps {
  title?: ReactNode;
  description?: ReactNode;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  filters?: ReactNode;
  dateSlot?: ReactNode;
  primaryAction?: BaseToolbarAction;
  secondaryActions?: BaseToolbarAction[];
  bulkActions?: ReactNode;
  viewOptions?: ReactNode;
  activeFilterCount?: number;
  onClearFilters?: () => void;
  children?: ReactNode;
  className?: string;
}

function ToolbarButton({ action }: { action: BaseToolbarAction }) {
  const Icon = action.icon;
  return (
    <Button
      type="button"
      variant={action.variant ?? "outline"}
      size="sm"
      onClick={action.onClick}
      disabled={action.disabled}
    >
      {Icon && <Icon data-icon="inline-start" />}
      {action.label}
    </Button>
  );
}

export function BaseToolbar({
  title,
  description,
  searchValue,
  searchPlaceholder = "Search...",
  onSearchChange,
  filters,
  dateSlot,
  primaryAction,
  secondaryActions = [],
  bulkActions,
  viewOptions,
  activeFilterCount,
  onClearFilters,
  children,
  className,
}: BaseToolbarProps) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-lg border border-border bg-card p-3", className)}>
      {(title || description || primaryAction || secondaryActions.length > 0) && (
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {secondaryActions.map((action) => (
              <ToolbarButton key={action.label} action={action} />
            ))}
            {primaryAction && <ToolbarButton action={{ variant: "default", ...primaryAction }} />}
          </div>
        </div>
      )}

      {(onSearchChange || filters || dateSlot || bulkActions || viewOptions || children) && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {onSearchChange && (
              <div className="relative min-w-0 sm:w-72">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchValue ?? ""}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-9 pl-8"
                  aria-label={searchPlaceholder}
                />
              </div>
            )}
            {dateSlot}
            {filters}
            {typeof activeFilterCount === "number" && activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount} active</Badge>
            )}
            {onClearFilters && activeFilterCount ? (
              <Button type="button" variant="ghost" size="sm" onClick={onClearFilters}>
                <X data-icon="inline-start" />
                Clear
              </Button>
            ) : null}
            {children}
          </div>
          {(bulkActions || viewOptions) && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {bulkActions}
              {bulkActions && viewOptions && <Separator orientation="vertical" className="hidden h-6 sm:block" />}
              {viewOptions}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
