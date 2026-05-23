import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BasePageShellProps {
  children: ReactNode;
  className?: string;
  constrained?: boolean;
}

export function BasePageShell({ children, className, constrained = true }: BasePageShellProps) {
  return (
    <div className={cn(constrained ? "page-container" : "min-h-full px-page-x py-page-y", className)}>
      {children}
    </div>
  );
}
