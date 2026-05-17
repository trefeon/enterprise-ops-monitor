import React, { useEffect, useMemo, useRef, useState } from 'react';

function getText(child) {
  if (!child) return '';
  const value = child.props?.children;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value))
    return value.filter((v) => typeof v === 'string' || typeof v === 'number').join(' ');
  return '';
}

/**
 * @typedef {{
 *  className?: string;
 *  children: any;
 *  icon?: string;
 *  wrapperClassName?: string;
 *  fullWidth?: boolean;
 *  value: any;
 *  name?: any;
 *  onChange?: any;
 *  disabled?: boolean;
 *  [x: string]: any;
 * }} SelectProps
 */

/**
 * @param {SelectProps} props
 */
export default function Select({
  className = '',
  children,
  icon = 'expand_more',
  wrapperClassName = '',
  fullWidth = true,
  value,
  name = undefined,
  onChange = undefined,
  disabled = false,
  ...props
}) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);

  const options = useMemo(() => {
    const list = [];
    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return;
      if (child.type === 'option') {
        list.push({
          value: child.props.value ?? '',
          label: getText(child) || String(child.props.value ?? ''),
          disabled: Boolean(child.props.disabled),
        });
      }
      if (child.type === 'optgroup') {
        React.Children.forEach(child.props.children, (nested) => {
          if (!React.isValidElement(nested) || nested.type !== 'option') return;
          list.push({
            value: nested.props.value ?? '',
            label: getText(nested) || String(nested.props.value ?? ''),
            disabled: Boolean(nested.props.disabled) || Boolean(child.props.disabled),
          });
        });
      }
    });
    return list;
  }, [children]);

  const selectedLabel = useMemo(() => {
    const found = options.find((opt) => String(opt.value) === String(value ?? ''));
    return found?.label || options.find((opt) => String(opt.value) === '')?.label || 'Select';
  }, [options, value]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const emitChange = (nextValue) => {
    if (typeof onChange !== 'function') return;
    onChange({ target: { name, value: nextValue } });
  };

  return (
    <div ref={rootRef} className={`relative ${wrapperClassName}`.trim()}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={(
          `h-10 ${fullWidth ? 'w-full' : ''} inline-flex items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 pr-3 text-sm ` +
          'text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring '
        )
          .concat(disabled ? 'opacity-60 cursor-not-allowed ' : '')
          .concat(className)}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        {...props}
      >
        <span className="truncate">{selectedLabel}</span>
        <span className="text-muted-foreground material-symbols-outlined text-base">{icon}</span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-2 min-w-full max-h-72 overflow-auto rounded-md border border-border bg-background shadow-lg"
        >
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value ?? '');
            return (
              <button
                key={String(opt.value)}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={opt.disabled}
                className={
                  'w-full text-left px-3 py-2 text-sm ' +
                  (opt.disabled ? 'opacity-50 cursor-not-allowed ' : 'hover:bg-accent ') +
                  (isSelected ? 'bg-accent text-foreground font-medium ' : 'text-foreground')
                }
                onClick={() => {
                  if (opt.disabled) return;
                  emitChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
