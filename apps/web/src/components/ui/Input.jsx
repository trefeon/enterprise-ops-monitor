import React from 'react';

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

  const inputClassName = (
    `h-10 ${fullWidth ? 'w-full' : ''} rounded-md border border-input bg-transparent px-3 text-sm text-foreground ` +
    'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring '
  ).concat(`${hasLeftIcon ? 'pl-9 ' : ''}${hasRightIcon ? 'pr-9 ' : ''}${className}`.trim());

  if (!hasLeftIcon && !hasRightIcon) {
    return <input ref={ref} className={inputClassName} {...props} />;
  }

  return (
    <div className={`relative ${wrapperClassName}`.trim()}>
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
            className="absolute right-2 inset-y-0 my-1 inline-flex w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <span className="material-symbols-outlined text-xl leading-none">{rightIcon}</span>
          </button>
        ) : (
          <span className="absolute right-3 inset-y-0 flex items-center text-muted-foreground material-symbols-outlined text-xl leading-none pointer-events-none">
            {rightIcon}
          </span>
        ))}
      <input ref={ref} className={inputClassName} {...props} />
    </div>
  );
}

const Input = React.forwardRef(InputImpl);

export default Input;
