import type { ReactNode } from 'react';
import { Toolbar } from './Toolbar';

interface DataToolbarProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function DataToolbar({ title, subtitle, search, filters, actions, className }: DataToolbarProps) {
  return (
    <Toolbar
      title={title}
      subtitle={subtitle}
      search={search}
      filters={filters}
      actions={actions}
      className={className}
    />
  );
}

export default DataToolbar;
