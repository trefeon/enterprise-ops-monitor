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
  const isMaterialIcon = typeof icon === 'string';

  let colorClass = 'text-muted-foreground hover:text-foreground hover:bg-accent';

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
        'p-2 rounded-xl transition-all flex items-center justify-center active:scale-95 border border-transparent',
        colorClass,
        className
      )}
      title={label}
      aria-label={label}
    >
      <span
        className={cn(
          'shrink-0 flex items-center justify-center',
          isMaterialIcon ? 'material-symbols-outlined text-xl leading-none' : '[&>svg]:size-5'
        )}
      >
        {icon}
      </span>
    </Link>
  );
}
