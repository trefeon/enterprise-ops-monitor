import React from 'react';
import { Card, CardContent } from './card';

export default function Toolbar({ left = null, right = null, children = null, className = '' }) {
  return (
    <Card className={className}>
      <CardContent>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {children || (
          <>
            {left && (
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:flex-1">
                {left}
              </div>
            )}
            {right && <div className="flex items-center gap-2">{right}</div>}
          </>
        )}
      </div>
      </CardContent>
    </Card>
  );
}
