import { Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { InputHTMLAttributes } from 'react';

interface DatePickerProps extends InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (value: string) => void;
}

export function DatePicker({
  value,
  onValueChange,
  onChange,
  className,
  ...props
}: DatePickerProps) {
  return (
    <div className={cn('relative', className)}>
      <div className="pointer-events-none absolute left-3 inset-y-0 flex items-center text-muted-foreground">
        <Calendar className="size-5" />
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
        className="date-input-no-indicator pl-10 tabular-nums"
        {...props}
      />
    </div>
  );
}
