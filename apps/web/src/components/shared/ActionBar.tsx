import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ActionBarProps {
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function ActionBar({ left, right, children, className }: ActionBarProps) {
  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      {children ?? (
        <>
          {left && <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{left}</div>}
          {right && (
            <div className="flex w-full min-w-0 flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
              {right}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ActionBar;
