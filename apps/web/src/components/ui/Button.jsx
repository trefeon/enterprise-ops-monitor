import React from 'react';
import { Button as ShadButton } from './button';

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  className = '',
  disabled = false,
  children = null,
  icon = null,
  ...rest
}) {
  const variants = {
    primary: 'default',
    secondary: 'secondary',
    danger: 'destructive',
    ghost: 'ghost',
  };
  const sizes = {
    sm: 'sm',
    md: 'default',
    lg: 'lg',
  };

  const iconSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <ShadButton
      variant={variants[variant] || 'default'}
      size={sizes[size] || 'default'}
      className={`
                ${fullWidth ? 'w-full' : ''}
                ${disabled || loading ? 'opacity-60 cursor-not-allowed' : ''}
                ${className}
            `}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {!loading && icon && <span className={`material-symbols-outlined ${iconSize}`}>{icon}</span>}
      {children}
    </ShadButton>
  );
}
