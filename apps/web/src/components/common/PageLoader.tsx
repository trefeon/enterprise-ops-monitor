import { Skeleton } from "../ui/skeleton";
import { Card, CardContent } from "../ui/card";
import PageShell from "../shared/PageShell";

export default function PageLoader() {
  return (
    <PageShell>
      <div className="flex flex-col gap-1 mb-8">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      <Card className="p-4 space-y-4">
        <CardContent>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </PageShell>
  );
}
