import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

export function SectionCard({
  title = null,
  subtitle = null,
  right = null,
  children = null,
  className = '',
}) {
  return (
    <Card className={className}><CardContent>
        <CardContent>
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
        </CardContent>
      </CardContent>
    </Card>
  );
}
