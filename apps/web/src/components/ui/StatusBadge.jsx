import React from 'react';
import { Badge } from './badge';

const StatusBadge = ({ variant = 'neutral', size = 'md', className = '', children }) => {
  const variants = {
    success: 'success',
    warning: 'warning',
    error: 'destructive',
    neutral: 'secondary',
    info: 'outline',
  };
  const sizes = {
    sm: 'h-5 px-2',
    md: 'h-6 px-2.5',
  };

  return (
    <Badge variant={variants[variant] || variants.neutral} className={`${sizes[size] || sizes.md} ${className}`}>
      {children}
    </Badge>
  );
};

export default StatusBadge;
