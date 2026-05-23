import type { ReactNode } from "react";
import { BaseToolbar } from "@/components/base";

export interface ToolbarProps {
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Toolbar({ left, right, children, className }: ToolbarProps) {
  return (
    <BaseToolbar className={className}>
      {children ?? (
        <>
          {left && <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center">{left}</div>}
          {right && <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">{right}</div>}
        </>
      )}
    </BaseToolbar>
  );
}

export default Toolbar;
