import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Link-styled icon button (keeps icon affordances consistent with IconButton).
 */
export default function IconLink({ to, icon, label, intent = 'neutral', className = '' }) {
  let colorClass = 'text-muted-foreground hover:text-foreground hover:bg-accent';

  if (intent === 'danger') {
    colorClass = 'text-destructive hover:text-destructive hover:bg-destructive/10';
  } else if (intent === 'primary') {
    colorClass = 'text-primary hover:bg-primary/10';
  }

  return (
    <Link
      to={to}
      className={`p-2 rounded-md transition-colors flex items-center justify-center ${colorClass} ${className}`}
      title={label}
      aria-label={label}
    >
      <span className="material-symbols-outlined text-xl leading-none">{icon}</span>
    </Link>
  );
}
