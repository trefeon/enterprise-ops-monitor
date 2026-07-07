import React from 'react';
import { TOOLBAR_META_PILL_CLASS } from '../types';

interface ActiveFiltersProps {
  filters: string[];
}

export function ActiveFilters({ filters }: ActiveFiltersProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((item) => (
        <span key={item} className={TOOLBAR_META_PILL_CLASS}>
          {item}
        </span>
      ))}
    </div>
  );
}
