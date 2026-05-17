import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, meta, actions, className }: PageHeaderProps) {
  return (
    <div
      className={`page-header ${className ?? ''}`}
    >
      <div className="flex flex-col gap-1">
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-subtitle">{description}</p>}
        {meta && (
          <div className="page-meta mt-1">{meta}</div>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
