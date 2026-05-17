import React from 'react';

const StatusBadge = ({ variant = 'neutral', size = 'md', className = '', children }) => {
  const variants = {
    success: 'bg-status-success/15 text-status-success border-status-success/20',
    warning: 'bg-status-warning/15 text-status-warning border-status-warning/20',
    error: 'bg-status-error/15 text-status-error border-status-error/20',
    neutral: 'bg-muted text-muted-foreground border-border',
    info: 'bg-status-info/15 text-status-info border-status-info/20',
  };
  const sizes = {
    sm: 'px-2 py-0.5',
    md: 'px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center justify-center ${sizes[size] || sizes.md} rounded-[6px] text-xs font-medium border ${variants[variant] || variants.neutral} whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
};

export default StatusBadge;
