import { Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { InputHTMLAttributes } from 'react';

export interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  onValueChange?: (value: string) => void;
  size?: 'sm' | 'default';
}

export function DatePicker({
  value,
  onValueChange,
  onChange,
  className,
  size = 'default',
  ...props
}: DatePickerProps) {
  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute left-3 inset-y-0 flex items-center text-muted-foreground z-10">
        <Calendar className={cn(size === 'sm' ? 'size-3.5' : 'size-4')} />
      </div>
      <Input
        type="date"
        value={value}
        onChange={(event) => {
          onChange?.(event);
          onValueChange?.(event.target.value);
        }}
        onClick={(e) => {
          // @ts-ignore – showPicker is a standard but missing from some type definitions
          if (typeof e.currentTarget.showPicker === 'function') {
            e.currentTarget.showPicker();
          }
        }}
        className={cn(
          'date-input-no-indicator pl-9 tabular-nums border-border bg-card hover:border-border/80 focus-visible:border-primary/50 focus-visible:ring-primary/10',
          size === 'sm' && 'min-h-0 h-9 py-1 text-xs pl-8',
          className
        )}
        {...props}
      />
    </div>
  );
}

export default DatePicker;
