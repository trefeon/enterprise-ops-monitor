import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  toolbarActionGroupClass,
  toolbarFilterGroupClass,
  toolbarLayoutClass,
  toolbarLeadingClass,
} from './actionLayout';

export interface ToolbarProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  leftClassName?: string;
  rightClassName?: string;
  variant?: 'card' | 'plain';
}

export function Toolbar({
  title,
  subtitle,
  left,
  right,
  children,
  className,
  contentClassName,
  leftClassName,
  rightClassName,
  variant = 'card',
}: ToolbarProps) {
  const content = children ? (
    <div className="flex w-full min-w-0 flex-col gap-3">{children}</div>
  ) : (
    <div className={toolbarLayoutClass}>
      {(title || subtitle || left) && (
        <div className={toolbarLeadingClass}>
          {(title || subtitle) && (
            <div className="min-w-0 lg:mr-2">
              {title && (
                <div className="text-lg font-semibold leading-tight tracking-normal text-foreground break-words">
                  {title}
                </div>
              )}
              {subtitle && (
                <div className="mt-1 text-sm leading-6 text-muted-foreground break-words">
                  {subtitle}
                </div>
              )}
            </div>
          )}
          {left && (
            <div className={cn(toolbarFilterGroupClass, leftClassName)}>
              {left}
            </div>
          )}
        </div>
      )}
      {right && (
        <div className={cn(toolbarActionGroupClass, rightClassName)}>{right}</div>
      )}
    </div>
  );

  if (variant === 'plain') {
    return (
      <div className={cn('w-full', className)}>
        <div className={cn('py-1', contentClassName)}>{content}</div>
      </div>
    );
  }

  return (
    <Card className={cn('border-border bg-card', className)}>
      <CardContent className={cn('px-4 py-3 sm:px-5 sm:py-3.5', contentClassName)}>
        {content}
      </CardContent>
    </Card>
  );
}

export default Toolbar;
