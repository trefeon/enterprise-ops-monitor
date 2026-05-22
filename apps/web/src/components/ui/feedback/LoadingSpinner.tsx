"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: "size-4",
  default: "size-6",
  lg: "size-10",
} as const satisfies Record<string, string>;

export interface LoadingSpinnerProps {
  /** Spinner size variant */
  size?: "sm" | "default" | "lg";
  /** Additional classes for the wrapper */
  className?: string;
  /** Accessible label for screen readers (default: "Loading") */
  label?: string;
}

/**
 * Accessible loading spinner using the `Loader2` Lucide icon with a
 * continuous spin animation.
 *
 * @example
 * ```tsx
 * <LoadingSpinner size="lg" label="Saving changes..." />
 * ```
 */
export function LoadingSpinner({
  size = "default",
  className,
  label = "Loading",
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center justify-center",
        size === "sm" ? "p-1" : size === "lg" ? "p-4" : "p-2",
        className,
      )}
    >
      <Loader2
        className={cn(
          "animate-spin text-muted-foreground",
          sizeMap[size],
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export default LoadingSpinner;
