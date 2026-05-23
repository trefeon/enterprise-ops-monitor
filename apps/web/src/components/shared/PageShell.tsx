import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ResponsiveContainer } from './ResponsiveContainer';

interface PageShellProps {
  children: ReactNode;
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <ResponsiveContainer
      data-page-shell
      className={cn('flex flex-col gap-6 py-5 sm:py-6 lg:py-7', className)}
    >
      {children}
    </ResponsiveContainer>
  );
}

export default PageShell;
