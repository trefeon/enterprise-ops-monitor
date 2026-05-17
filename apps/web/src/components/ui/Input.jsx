import React from 'react';
import { Input as ShadInput } from './input';

/**
 * @typedef {import('react').InputHTMLAttributes<HTMLInputElement>} NativeInputProps
 */

/**
 * @typedef {NativeInputProps & {
 *  icon?: string | null;
 *  rightIcon?: string | null;
 *  onRightIconClick?: (() => void) | null;
 *  rightIconAriaLabel?: string;
 *  fullWidth?: boolean;
 *  wrapperClassName?: string;
 * }} InputProps
 */

/**
 * @type {import('react').ForwardRefRenderFunction<HTMLInputElement, InputProps>}
 */
function InputImpl(
  {
    className = '',
    icon = null,
    rightIcon = null,
    onRightIconClick = null,
    rightIconAriaLabel = 'Input action',
    fullWidth = true,
    wrapperClassName = '',
    ...props
  },
  ref
) {
  const hasLeftIcon = Boolean(icon);
  const hasRightIcon = Boolean(rightIcon);

  const inputClassName = `${fullWidth ? 'w-full' : ''} ${hasLeftIcon ? 'pl-10' : ''} ${hasRightIcon ? 'pr-12' : ''} ${className}`.trim();

  if (!hasLeftIcon && !hasRightIcon) {
    return <ShadInput ref={ref} className={inputClassName} {...props} />;
  }

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''} ${wrapperClassName}`.trim()}>
      {hasLeftIcon && (
        <span className="absolute left-3 inset-y-0 flex items-center text-muted-foreground material-symbols-outlined text-xl leading-none pointer-events-none">
          {icon}
        </span>
      )}

      {hasRightIcon &&
        (onRightIconClick ? (
          <button
            type="button"
            aria-label={rightIconAriaLabel}
            onClick={onRightIconClick}
            className="absolute right-0 inset-y-0 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <span className="material-symbols-outlined text-xl leading-none">{rightIcon}</span>
          </button>
        ) : (
          <span className="absolute right-3 inset-y-0 flex items-center text-muted-foreground material-symbols-outlined text-xl leading-none pointer-events-none">
            {rightIcon}
          </span>
        ))}
      <ShadInput ref={ref} className={inputClassName} {...props} />
    </div>
  );
}

const Input = React.forwardRef(InputImpl);

export default Input;
