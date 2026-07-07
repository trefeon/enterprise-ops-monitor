import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BasePageShellProps {
  children: ReactNode;
  className?: string;
  constrained?: boolean;
  debugLabel?: string;
}

export function BasePageShell({ children, className, constrained = true, debugLabel }: BasePageShellProps) {
  return (
    <div
      data-debug-component-root={debugLabel}
      className={cn(constrained ? "page-container animate-in" : "min-h-full px-page-x py-page-y animate-in", className)}
    >
      {children}
    </div>
  );
}
