import React from 'react';

const variants = {
  default: 'surface-card',
  compact: 'surface-card-compact',
  table: 'surface-card p-0 overflow-hidden',
};

export default function Card({
  children,
  className = '',
  variant = 'default',
  title = null,
  actions = null,
  onClick = null,
  ...props
}) {
  const baseClass = variants[variant] || variants.default;
  const interactiveClass = onClick
    ? 'cursor-pointer hover:border-primary/50 transition-colors'
    : '';

  return (
    <div
      className={`${baseClass} ${interactiveClass} ${className}`.trim()}
      onClick={onClick}
      {...props}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="section-title mb-0">{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
