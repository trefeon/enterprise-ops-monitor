"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterBarProps {
  /** Filter controls (Select, checkbox chips, etc.) */
  children: React.ReactNode;
  /** Additional classes for the bar wrapper */
  className?: string;
  /** Called when the reset button is clicked */
  onReset?: () => void;
  /** Number of active filters — shows reset button when > 0 */
  activeCount?: number;
}

/**
 * Horizontal row of filter chips, selects, and controls.
 * Optionally shows a "Reset filters" button when `activeCount > 0`.
 *
 * @example
 * ```tsx
 * <FilterBar activeCount={2} onReset={handleReset}>
 *   <Select value={status} onValueChange={setStatus}>...</Select>
 *   <Select value={type} onValueChange={setType}>...</Select>
 * </FilterBar>
 * ```
 */
export function FilterBar({
  children,
  className,
  onReset,
  activeCount = 0,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        className,
      )}
    >
      {children}
      {activeCount > 0 && onReset && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="mr-1 size-3.5" aria-hidden="true" />
          Reset
          <span className="sr-only"> ({activeCount} active)</span>
        </Button>
      )}
    </div>
  );
}

export default FilterBar;
