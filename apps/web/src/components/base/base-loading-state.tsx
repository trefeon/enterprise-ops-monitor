import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface BaseLoadingStateProps {
  label?: string;
  rows?: number;
  variant?: "spinner" | "skeleton";
  className?: string;
}

export function BaseLoadingState({
  label = "Loading...",
  rows = 3,
  variant = "spinner",
  className,
}: BaseLoadingStateProps) {
  if (variant === "skeleton") {
    return (
      <div className={cn("grid gap-3 p-4", className)} aria-label={label}>
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn("flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground", className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}
