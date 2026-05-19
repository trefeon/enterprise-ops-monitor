import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const StatCard = ({
  title,
  value,
  icon = null,
  subtext = null,
  footer = null,
  status = 'default',
  accent: accentProp = null,
  className = '',
  onClick = null,
}) => {
  const statusStyles = {
    default: {
      value: 'text-foreground',
      rail: 'bg-border',
      icon: 'border-border bg-muted text-foreground',
    },
    success: {
      value: 'text-status-success',
      rail: 'bg-status-success',
      icon: 'border-status-success/15 bg-status-success/10 text-status-success',
    },
    warning: {
      value: 'text-status-warning',
      rail: 'bg-status-warning',
      icon: 'border-status-warning/15 bg-status-warning/10 text-status-warning',
    },
    error: {
      value: 'text-status-error',
      rail: 'bg-status-error',
      icon: 'border-status-error/15 bg-status-error/10 text-status-error',
    },
    info: {
      value: 'text-status-info',
      rail: 'bg-status-info',
      icon: 'border-status-info/15 bg-status-info/10 text-status-info',
    },
  };

  const styles = statusStyles[status] || statusStyles.default;
  const accent = accentProp || styles.value;

  return (
    <Card
      onClick={onClick}
      className={`group relative flex h-full flex-col overflow-hidden ${className}`.trim()}
    >
      <CardContent>
        <div className={`absolute inset-x-0 top-0 h-0.5 ${styles.rail}`} />
        <div className="relative flex flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <h3 className="pt-1 text-xs font-medium uppercase tracking-wider leading-tight text-muted-foreground">
              {title}
            </h3>
            <div className={`shrink-0 ${!icon ? 'opacity-0' : ''}`}>
              {icon ? (
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-transform duration-200 group-hover:-translate-y-0.5 [&>svg]:size-5 ${styles.icon} ${accentProp || ''}`.trim()}
                >
                  {icon}
                </span>
              ) : (
                <span className="block h-11 w-11" />
              )}
            </div>
          </div>

          <div className="mt-3">
            <div
              className={`font-mono text-[1.75rem] font-bold leading-tight tracking-normal ${accent}`}
            >
              {value}
            </div>
          </div>

          <div className="mt-auto pt-2">
            {footer && <div className="mb-2">{footer}</div>}
            {subtext && <p className="text-xs leading-relaxed text-muted-foreground">{subtext}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
