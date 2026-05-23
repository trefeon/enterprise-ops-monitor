"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { sectionActionGroupClass } from "@/components/shared/actionLayout";

export interface ContentSectionProps {
  /** Section title shown in the header */
  title?: string;
  /** Subtitle or description below the title */
  subtitle?: string;
  /** Action elements rendered to the right of the title (buttons, links, etc.) */
  actions?: React.ReactNode;
  /** Main body content */
  children: React.ReactNode;
  /** Optional footer content rendered below a separator */
  footer?: React.ReactNode;
  /** Additional classes for the outer section wrapper */
  className?: string;
  /** When true removes default horizontal padding */
  noPadding?: boolean;
}

/**
 * Layout section with an optional header (title + subtitle + actions),
 * body content, and optional footer separated by a divider.
 *
 * @example
 * ```tsx
 * <ContentSection
 *   title="Recent Activity"
 *   subtitle="Last 7 days"
 *   actions={<Button>View All</Button>}
 * >
 *   <ActivityList />
 * </ContentSection>
 * ```
 */
export function ContentSection({
  title,
  subtitle,
  actions,
  children,
  footer,
  className,
  noPadding = false,
}: ContentSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {/* Header */}
      {(title || actions) && (
        <div className={cn("grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start", !noPadding && "px-0")}>
          <div className="min-w-0 space-y-1">
            {title && (
              <h2 className="text-lg font-semibold tracking-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className={sectionActionGroupClass}>{actions}</div>
          )}
        </div>
      )}

      {/* Body */}
      <div className={cn(!noPadding && "px-0")}>{children}</div>

      {/* Footer */}
      {footer && (
        <>
          <Separator />
          <div className={cn(!noPadding && "px-0")}>{footer}</div>
        </>
      )}
    </section>
  );
}

export default ContentSection;
