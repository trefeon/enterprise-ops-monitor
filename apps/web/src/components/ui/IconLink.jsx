import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Link-styled icon button (keeps icon affordances consistent with IconButton).
 * @param {Object} props
 * @param {string} props.to
 * @param {React.ReactNode} props.icon
 * @param {string} [props.label]
 * @param {'neutral' | 'primary' | 'danger'} [props.intent='neutral']
 * @param {string} [props.className]
 */
export default function IconLink({ to, icon, label, intent = 'neutral', className = '' }) {
  let colorClass = 'text-muted-foreground hover:text-foreground hover:bg-secondary';

  if (intent === 'danger') {
    colorClass =
      'text-status-error hover:text-status-error hover:bg-status-error/10 border-status-error/10';
  } else if (intent === 'primary') {
    colorClass = 'text-primary hover:bg-primary/10 border-primary/10';
  }

  return (
    <Link
      to={to}
      className={cn(
        'flex min-h-10 min-w-10 items-center justify-center rounded-md border border-transparent p-2 transition-all active:scale-95',
        colorClass,
        className
      )}
      title={label}
      aria-label={label}
    >
      <span className="flex shrink-0 items-center justify-center [&>svg]:size-5">{icon}</span>
    </Link>
  );
}
