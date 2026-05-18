import React from 'react';
import { cn } from '@/lib/utils';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.icon
 * @param {string} [props.label]
 * @param {'neutral' | 'primary' | 'danger' | 'ghost'} [props.intent='neutral']
 * @param {import('react').MouseEventHandler<HTMLButtonElement>} props.onClick
 * @param {string} [props.className]
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.showDot]
 */
export const IconButton = ({
  icon,
  label,
  intent = 'neutral',
  onClick,
  className = '',
  disabled = false,
  showDot = false,
  ...props
}) => {
  const isMaterialIcon = typeof icon === 'string';

  let colorClass = 'text-muted-foreground hover:text-foreground hover:bg-accent';

  if (intent === 'danger') {
    colorClass =
      'text-status-error hover:text-status-error hover:bg-status-error/10 border-status-error/10';
  } else if (intent === 'primary') {
    colorClass = 'text-primary hover:bg-primary/10 border-primary/10';
  } else if (intent === 'ghost') {
    colorClass = 'text-muted-foreground hover:text-foreground hover:bg-transparent';
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 transition-all active:scale-95 border border-transparent',
        colorClass,
        disabled && 'opacity-50 cursor-not-allowed grayscale',
        className
      )}
      title={label}
      aria-label={label}
      disabled={disabled}
      {...props}
    >
      <span
        className={cn(
          'shrink-0 flex items-center justify-center',
          isMaterialIcon ? 'material-symbols-outlined text-xl leading-none' : '[&>svg]:size-5'
        )}
      >
        {icon}
      </span>
      {showDot && (
        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-status-error ring-2 ring-background animate-pulse" />
      )}
    </button>
  );
};

export default IconButton;
