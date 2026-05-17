import React from 'react';
import PageShell from './ui/PageShell';
import { Skeleton } from './ui/Skeleton';
import Card from './ui/Card';

const PageLoader = () => {
  return (
    <PageShell>
      <div className="flex flex-col gap-1 mb-8">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      <Card className="p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </Card>
    </PageShell>
  );
};

export default PageLoader;
