import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormFieldGroupProps {
  children: ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}

const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
};

export function FormFieldGroup({ children, columns = 2, className }: FormFieldGroupProps) {
  return <div className={cn('grid gap-4', columnClasses[columns], className)}>{children}</div>;
}

export default FormFieldGroup;
