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
  const gridCols = gridTemplateColumns
    ? gridTemplateColumns
    : columns
      ? `repeat(${columns}, minmax(0, 1fr))`
      : undefined;

  return (
    <section
      aria-label={label}
      className={cn(className)}
      style={{
        display: gridCols ? "grid" : "block",
        gridTemplateColumns: gridCols,
        gap: `${gap}px`,
        width: "100%",
      }}
    >
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Welcome Hero — top-of-page greeting block                          */
/* ------------------------------------------------------------------ */

export interface DashboardWelcomeProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function DashboardWelcome({
  title,
  subtitle,
  className,
}: DashboardWelcomeProps) {
  return (
    <div className={cn("py-1", className)}>
      <h1
        className="font-display text-[2rem] font-medium leading-tight tracking-normal text-foreground"
        style={{ height: 36, display: "flex", alignItems: "center" }}
      >
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  KPI Stat Card                                                      */
/* ------------------------------------------------------------------ */

export interface DashboardStatCardProps {
  label: string;
  value: string | number;
  /** Optional delta like "+12.5%" */
  delta?: string;
  /** Optional icon (React element) */
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function DashboardStatCard({
  label,
  value,
  delta,
  icon,
  trend,
  className,
}: DashboardStatCardProps) {
  const deltaColor =
    trend === "up"
      ? "var(--supabase-success,#3ecf8e)"
      : trend === "down"
        ? "var(--supabase-danger,#e54d2e)"
        : "var(--text-secondary,#898989)";

  return (
    <div
      className={cn(
        "surface-card flex flex-col gap-2",
        "hover:border-hover transition-colors duration-150",
        className,
      )}
      style={{
        boxShadow: "var(--elevation-level1, 0 0 0 1px #2e2e2e)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon && (
          <span className="text-muted-foreground/60">{icon}</span>
        )}
      </div>
      <span
        className="font-display text-[2rem] font-medium leading-none tracking-tight text-foreground"
      >
        {value}
      </span>
      {delta && (
        <span className="text-xs font-medium" style={{ color: deltaColor }}>
          {delta}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Header (with optional breadcrumb & actions)                   */
/* ------------------------------------------------------------------ */

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
