import React from 'react';
import { Badge } from './badge';

const StatusBadge = ({ variant = 'neutral', size = 'md', className = '', children }) => {
  const variants = {
    success: 'success',
    warning: 'warning',
    error: 'destructive',
    destructive: 'destructive',
    neutral: 'neutral',
    info: 'info',
  };
  const sizes = {
    sm: 'h-5 gap-1 px-2 text-[10px]',
    md: 'h-6 gap-1.5 px-2.5 text-[11px]',
  };
  const dotStyles = {
    success: 'bg-status-success',
    warning: 'bg-status-warning',
    error: 'bg-status-error',
    destructive: 'bg-status-error',
    neutral: 'bg-status-neutral',
    info: 'bg-status-info',
  };

  return (
    <Badge
      variant={variants[variant] || variants.neutral}
      className={`${sizes[size] || sizes.md} ${className}`}
    >
      <span
        className={`size-1.5 shrink-0 rounded-full ${dotStyles[variant] || dotStyles.neutral}`}
      />
      {children}
    </Badge>
  );
};

export default StatusBadge;
