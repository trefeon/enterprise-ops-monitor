import { Badge } from '@/components/ui/badge';
import type { ReactNode } from 'react';

interface StatusBadgeProps {
  variant: 'success' | 'warning' | 'destructive' | 'default' | 'secondary' | 'outline';
  children: ReactNode;
  className?: string;
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <Badge variant={variant} className={className}>
      {children}
    </Badge>
  );
}
