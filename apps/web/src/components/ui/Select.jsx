import React, { useMemo } from 'react';
import {
  Select as ShadSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

function getText(child) {
  if (!child) return '';
  const value = child.props?.children;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value))
    return value.filter((v) => typeof v === 'string' || typeof v === 'number').join(' ');
  return '';
}

export default function Select({
  className = '',
  children,
  wrapperClassName = '',
  fullWidth = true,
  value,
  name = undefined,
  onChange = undefined,
  disabled = false,
  ...props
}) {
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

  const handleValueChange = (nextValue) => {
    if (typeof onChange !== 'function') return;
    onChange({ target: { name, value: nextValue } });
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${wrapperClassName}`.trim()}>
      <ShadSelect
        value={value == null ? '' : String(value)}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          className={`${fullWidth ? 'w-full' : ''} min-h-[44px] ${className}`.trim()}
          {...props}
        >
          <SelectValue placeholder={selectedLabel} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={String(opt.value)} value={String(opt.value)} disabled={opt.disabled}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </ShadSelect>
    </div>
  );
}
