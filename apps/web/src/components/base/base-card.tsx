import type { ComponentType, ReactNode } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BaseErrorState } from "./base-error-state";
import { BaseLoadingState } from "./base-loading-state";

export interface BaseCardProps {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  loading?: boolean;
  error?: ReactNode;
  density?: "default" | "compact";
  clickable?: boolean;
  onClick?: () => void;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  titleAs?: "h2" | "h3" | "h4";
}

export function BaseCard({
  title,
  description,
  icon: Icon,
  actions,
  footer,
  children,
  loading = false,
  error,
  density = "default",
  clickable = false,
  onClick,
  className,
  contentClassName,
  headerClassName,
  titleAs = "h2",
}: BaseCardProps) {
  const TitleTag = titleAs;
  const interactive = clickable || Boolean(onClick);

  return (
    <Card
      size={density === "compact" ? "sm" : "default"}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!interactive || !onClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        interactive && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {(title || description || Icon || actions) && (
        <CardHeader className={headerClassName}>
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-4" />
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <CardTitle>
                  <TitleTag className="truncate">{title}</TitleTag>
                </CardTitle>
              )}
              {description && <CardDescription>{description}</CardDescription>}
            </div>
          </div>
          {actions && <CardAction>{actions}</CardAction>}
        </CardHeader>
      )}
      <CardContent className={contentClassName}>
        {loading ? (
          <BaseLoadingState variant="skeleton" />
        ) : error ? (
          <BaseErrorState description={error} />
        ) : (
          children
        )}
      </CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}
