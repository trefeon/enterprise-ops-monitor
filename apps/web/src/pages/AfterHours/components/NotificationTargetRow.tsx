// ---------------------------------------------------------------------------
// AfterHours — NotificationTargetRow
// ---------------------------------------------------------------------------
import React from 'react';
import { Input } from '@/components/ui/input';
import { NOTIFICATION_FIELD_CLASS } from '../constants';

interface NotificationTargetRowProps {
  label: string;
  helperText: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: React.ReactNode;
}

export function NotificationTargetRow({
  label,
  helperText,
  value,
  onChange,
  placeholder,
  icon,
}: NotificationTargetRowProps) {
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-secondary/40 lg:grid-cols-2 lg:items-center">
      <div className="space-y-1">
        <p className="text-sm font-medium tracking-wide text-foreground">
          {label}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {helperText}
        </p>
      </div>
      <div className="relative w-full min-w-0">
        <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted-foreground">
          {icon}
        </div>
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${NOTIFICATION_FIELD_CLASS} !h-10 !pl-10 font-mono text-xs`}
        />
      </div>
    </div>
  );
}
