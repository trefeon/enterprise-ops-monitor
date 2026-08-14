import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Dashboard Layout — Supabase/NeedMCP inspired grid-based layout     */
/*  Replaces the old single-space page-container pattern.              */
/* ------------------------------------------------------------------ */

export interface DashboardLayoutProps {
  children: ReactNode;
  /** Override the default 32px horizontal padding */
  px?: number | string;
  /** Override the default 24px vertical gap between sections */
  gap?: number | string;
  className?: string;
}

export function DashboardLayout({
  children,
  px = 32,
  gap = 24,
  className,
}: DashboardLayoutProps) {
  return (
    <div
      className={cn("animate-in", className)}
      style={{
        width: "100%",
        maxWidth: "100%",
        paddingInline: typeof px === "number" ? `${px}px` : px,
        display: "flex",
        flexDirection: "column",
        gap: typeof gap === "number" ? `${gap}px` : gap,
        paddingBlock: `${typeof gap === "number" ? gap : "24px"} 0`,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard Section — a row container that can host a grid           */
/* ------------------------------------------------------------------ */

export interface DashboardSectionProps {
  children: ReactNode;
  /** Grid columns (number of equal-width columns) */
  columns?: number;
  /** Explicit CSS grid-template-columns override */
  gridTemplateColumns?: string;
  /** Gap between grid children, defaults to 24px */
  gap?: number;
  className?: string;
  label?: string;
}

export function DashboardSection({
  children,
  columns,
  gridTemplateColumns,
  gap = 24,
  className,
  label,
}: DashboardSectionProps) {
  const responsiveCols = columns
    ? ({
        1: 'lg:grid-cols-1',
        2: 'lg:grid-cols-2',
        3: 'lg:grid-cols-3',
        4: 'lg:grid-cols-4',
      } as const)[columns]
    : undefined;

  return (
    <section
      aria-label={label}
      className={cn(columns && 'grid grid-cols-1', responsiveCols, className)}
      style={
        gridTemplateColumns
          ? {
              display: 'grid',
              gridTemplateColumns,
              gap: `${gap}px`,
              width: '100%',
            }
          : columns
            ? { display: 'grid', gap: `${gap}px`, width: '100%' }
            : undefined
      }
    >
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Header (with optional breadcrumb & actions)                   */
/* ------------------------------------------------------------------ */

/**
 * @deprecated Superseded by PageHeader from `@/components/template`
 * (same visual, part of the unified PageTemplate stack). Keep working
 * until the page-refactor phase migrates all 14 call sites.
 */
export interface DashboardPageHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-side actions (buttons, filters, search) */
  actions?: ReactNode;
  className?: string;
}

export function DashboardPageHeader({
  title,
  subtitle,
  actions,
  className,
}: DashboardPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-4 border-b border-border pb-5 md:flex-row md:items-end",
        className,
      )}
    >
      <div>
        <h1 className="font-display text-xl font-medium leading-tight tracking-normal text-foreground sm:text-2xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-3 self-start md:self-end">
          {actions}
        </div>
      )}
    </div>
  );
}
