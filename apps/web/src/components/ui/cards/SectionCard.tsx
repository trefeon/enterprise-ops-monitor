import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface SectionCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
  noPadding?: boolean;
}

/**
 * @deprecated Superseded by SectionCard from `@/components/template`
 * (same visual, plus h2 title semantics and a toolbar slot). Keep working
 * until the page-refactor phase migrates its call sites.
 */
export function SectionCard({
  title,
  subtitle,
  right,
  children,
  className,
  noPadding = false,
}: SectionCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {(title || subtitle || right) && (
        <CardHeader>
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              {title && <CardTitle>{title}</CardTitle>}
              {subtitle && <CardDescription>{subtitle}</CardDescription>}
            </div>
            {right && <CardAction>{right}</CardAction>}
          </div>
        </CardHeader>
      )}
      <CardContent className={noPadding ? "p-0" : undefined}>
        {children}
      </CardContent>
    </Card>
  );
}

export default SectionCard;
