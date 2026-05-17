import React from 'react';
import Card from './Card';

export function SectionCard({
  title = null,
  subtitle = null,
  right = null,
  children = null,
  className = '',
}) {
  return (
    <Card className={className}>
      {(title || right) && (
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            {title && <div className="text-sm font-semibold text-foreground">{title}</div>}
            {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
          </div>
          {right}
        </div>
      )}
      {children}
    </Card>
  );
}
