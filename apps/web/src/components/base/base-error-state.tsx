import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface BaseErrorStateProps {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  onRetry?: () => void;
  className?: string;
}

export function BaseErrorState({
  title = "Something went wrong",
  description,
  action,
  onRetry,
  className,
}: BaseErrorStateProps) {
  return (
    <Alert variant="destructive" className={cn("items-start", className)}>
      <AlertCircle className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      {description && <AlertDescription>{description}</AlertDescription>}
      {(action || onRetry) && (
        <div className="mt-3">
          {action ?? (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      )}
    </Alert>
  );
}
