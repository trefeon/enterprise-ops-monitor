import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ToolbarProps {
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Toolbar({ left, right, children, className }: ToolbarProps) {
  return (
    <Card className={cn('border-border bg-card', className)}>
      <CardContent className="py-3 px-4 sm:py-3.5 sm:px-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {children || (
            <>
              {left && (
                <div className="flex min-w-0 flex-col gap-2 md:flex-1 md:flex-row md:items-center [&>*]:w-full md:[&>*]:w-auto">
                  {left}
                </div>
              )}
              {right && (
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center md:w-auto md:justify-end [&>*]:w-full sm:[&>*]:w-auto">
                  {right}
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default Toolbar;
