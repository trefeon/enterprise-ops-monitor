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
                <div className="flex min-w-0 flex-col gap-2 md:flex-1 md:flex-row md:items-center">
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
