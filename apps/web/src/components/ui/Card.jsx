import React from 'react';
import {
  Card as ShadCard,
  CardContent,
  CardHeader,
  CardTitle,
} from './card';

const variants = {
  default: '',
  compact: 'py-3',
  table: 'p-0 overflow-hidden',
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
    <ShadCard
      className={`${baseClass} ${interactiveClass} ${className}`.trim()}
      onClick={onClick}
      {...props}
    >
      {(title || actions) && (
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          {title && <CardTitle>{title}</CardTitle>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </CardHeader>
      )}
      <CardContent className={variant === 'table' ? 'p-0' : ''}>{children}</CardContent>
    </ShadCard>
  );
}
