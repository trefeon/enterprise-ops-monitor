import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type IconButtonIntent = 'neutral' | 'primary' | 'danger' | 'ghost';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label?: string;
  intent?: IconButtonIntent;
  showDot?: boolean;
}

export function IconButton({
  icon,
  label,
  intent = 'neutral',
  onClick,
  className,
  disabled = false,
  showDot = false,
  type = 'button',
  ...props
}: IconButtonProps) {
  let colorClass = 'text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent';

  if (intent === 'danger') {
    colorClass =
      'text-status-error hover:text-status-error hover:bg-status-error/10 border-status-error/10';
  } else if (intent === 'primary') {
    colorClass = 'text-primary hover:bg-primary/10 border-primary/10';
  } else if (intent === 'ghost') {
    colorClass = 'text-muted-foreground hover:text-foreground hover:bg-transparent border-transparent';
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md border p-2 transition-all active:scale-95 duration-150',
        colorClass,
        disabled && 'opacity-50 cursor-not-allowed grayscale active:scale-100',
        className
      )}
      {...props}
    >
      <span className="flex shrink-0 items-center justify-center [&>svg]:size-5">{icon}</span>
      {showDot && (
        <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-status-error ring-2 ring-background animate-pulse" />
      )}
    </button>
  );
}

export default IconButton;
