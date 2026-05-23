import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { pageHeaderActionGroupClass } from './actionLayout';

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
    <motion.div
      className={cn('page-header flex flex-col gap-3 border-b border-border/60 pb-5', className)}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
        >
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <div key={idx} className="flex items-center gap-1.5">
                {crumb.href && !isLast ? (
                  <a
                    href={crumb.href}
                    className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
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

      <div className="grid w-full min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <h1 className="page-title break-words">{title}</h1>
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
          <div className={pageHeaderActionGroupClass}>{actions}</div>
        )}
      </div>
    </motion.div>
  );
}
export default PageHeader;
