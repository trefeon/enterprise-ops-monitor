import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps extends ComponentPropsWithoutRef<'div'> {
  children: ReactNode;
  as?: ElementType;
  size?: 'default' | 'wide' | 'narrow';
}

const sizes = {
  narrow: 'max-w-5xl',
  default: 'max-w-screen-2xl',
  wide: 'max-w-[1800px]',
};

export function ResponsiveContainer({
  children,
  as: Component = 'div',
  className,
  size = 'default',
  ...props
}: ResponsiveContainerProps) {
  return (
    <Component
      className={cn('mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8', sizes[size], className)}
      {...props}
    >
      {children}
    </Component>
  );
}

export default ResponsiveContainer;
