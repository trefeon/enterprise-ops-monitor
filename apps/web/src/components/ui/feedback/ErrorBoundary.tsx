"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ErrorBoundaryProps {
  /** Child component tree to wrap with error handling */
  children: React.ReactNode;
  /** Custom fallback UI instead of the default error card */
  fallback?: React.ReactNode;
  /** Called when the retry button is clicked — defaults to window.location.reload() */
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React error boundary with a retry button.
 * Catches uncaught JavaScript errors in the child tree and displays
 * a fallback UI with the error stack trace and a retry action.
 *
 * Replaces the legacy `components/ErrorBoundary.jsx`.
 *
 * @example
 * ```tsx
 * <ErrorBoundary onRetry={handleRetry}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Keep console output for dev diagnostics
    console.error("UI crashed:", error, errorInfo);
  }

  private handleRetry = (): void => {
    const { onRetry } = this.props;

    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  render(): React.ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (!hasError) {
      return children;
    }

    // Custom fallback provided
    if (fallback) {
      return fallback;
    }

    // Default error UI
    return (
      <div
        className={cn(
          "min-h-screen bg-background text-foreground",
          "flex items-center justify-center p-6",
        )}
      >
        <Card className="max-w-2xl w-full">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-5 text-destructive shrink-0" />
              <h1 className="text-lg font-semibold">Something went wrong</h1>
            </div>

            <p className="text-sm text-muted-foreground">
              An unexpected error occurred while rendering this page. You can
              try reloading below.
            </p>

            <Button
              type="button"
              variant="secondary"
              onClick={this.handleRetry}
            >
              <RefreshCw className="mr-2 size-4" aria-hidden="true" />
              Retry
            </Button>

            {error && (
              <details className="rounded-lg border border-border bg-muted/40 p-3">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground select-none">
                  Error details
                </summary>
                <pre className="mt-2 font-mono text-xs whitespace-pre-wrap break-words">
                  {error.stack ?? error.message ?? "Unknown error"}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
}

export default ErrorBoundary;
