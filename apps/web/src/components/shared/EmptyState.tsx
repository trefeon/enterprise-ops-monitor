import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
        <h3 className="text-lg font-medium mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>
        )}
        {action && <div>{action}</div>}
      </CardContent>
    </Card>
  );
}
