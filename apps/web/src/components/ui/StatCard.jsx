import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

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
      rail: 'bg-foreground/10',
      icon: 'border-border/70 bg-muted/50 text-foreground',
    },
    success: {
      value: 'text-status-success',
      rail: 'bg-status-success/30',
      icon: 'border-status-success/15 bg-status-success/10 text-status-success',
    },
    warning: {
      value: 'text-status-warning',
      rail: 'bg-status-warning/30',
      icon: 'border-status-warning/15 bg-status-warning/10 text-status-warning',
    },
    error: {
      value: 'text-status-error',
      rail: 'bg-status-error/30',
      icon: 'border-status-error/15 bg-status-error/10 text-status-error',
    },
    info: {
      value: 'text-status-info',
      rail: 'bg-status-info/30',
      icon: 'border-status-info/15 bg-status-info/10 text-status-info',
    },
  };

  const styles = statusStyles[status] || statusStyles.default;
  const accent = accentProp || styles.value;

  return (
    <Card
      onClick={onClick}
      className={`group relative flex h-full flex-col overflow-hidden ${className}`.trim()}
    ><CardContent>
        <CardContent>
          <div className={`absolute inset-x-0 top-0 h-1 ${styles.rail}`} />
          <div className="relative flex flex-1 flex-col">
            <div className="flex items-start justify-between gap-3">
              <h3 className="pt-1 text-sm font-medium leading-tight text-muted-foreground">
                {title}
              </h3>
              <div className={`shrink-0 ${!icon ? 'opacity-0' : ''}`}>
                {icon ? (
                  <span
                    className={`material-symbols-outlined flex h-11 w-11 items-center justify-center rounded-2xl border text-[26px] shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5 ${styles.icon} ${accentProp || ''}`.trim()}
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
                className={`text-2xl font-semibold leading-tight tracking-tight sm:text-[1.8rem] ${accent}`}
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
      </CardContent>
    </Card>
  );
};

export default StatCard;
