import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string; // Alias for description to support legacy components
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
  breadcrumbs?: BreadcrumbItem[];
}

export function PageHeader({
  title,
  description,
  subtitle,
  meta,
  actions,
  className,
  breadcrumbs,
}: PageHeaderProps) {
  const displayDescription = description || subtitle;

  return (
    <div className={cn('page-header flex flex-col gap-3 pb-6 border-b border-border/10', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <div key={idx} className="flex items-center gap-1.5">
                {crumb.href && !isLast ? (
                  <a
                    href={crumb.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className={isLast ? 'text-foreground font-semibold' : ''}>
                    {crumb.label}
                  </span>
                )}
                {!isLast && <ChevronRight className="size-3 text-muted-foreground/50 shrink-0" />}
              </div>
            );
          })}
        </nav>
      )}

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <h1 className="page-title text-2xl font-bold tracking-tight text-foreground break-words">{title}</h1>
          {displayDescription && (
            <p className="page-subtitle text-sm text-muted-foreground leading-relaxed break-words">
              {displayDescription}
            </p>
          )}
          {meta && (
            <div className="page-meta mt-2 flex flex-wrap items-center gap-3">
              {meta}
            </div>
          )}
        </div>

        {actions && (
          <div className="flex w-full flex-col gap-2 shrink-0 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
export default PageHeader;
