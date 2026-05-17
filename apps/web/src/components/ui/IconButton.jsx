import React from 'react';

/**
 * @param {Object} props
 * @param {string} props.icon
 * @param {string} [props.label]
 * @param {'neutral' | 'primary' | 'danger'} [props.intent='neutral']
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
  let colorClass = 'text-muted-foreground hover:text-foreground hover:bg-accent';

  if (intent === 'danger') {
    colorClass = 'text-destructive hover:text-destructive hover:bg-destructive/10';
  } else if (intent === 'primary') {
    colorClass = 'text-primary hover:bg-primary/10';
  }

  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-md transition-colors flex items-center justify-center ${colorClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      title={label}
      aria-label={label}
      disabled={disabled}
      {...props}
    >
      <span className="material-symbols-outlined text-xl leading-none">{icon}</span>
      {showDot && (
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-status-error" />
      )}
    </button>
  );
};

export default IconButton;
