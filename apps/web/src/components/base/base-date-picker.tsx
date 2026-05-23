import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BaseFormField } from "./base-form-field";
import { cn } from "@/lib/utils";

type DateValue = Date | string | undefined | null;

export interface BaseDatePickerProps {
  value?: DateValue;
  onChange?: (date: Date | undefined, value: string) => void;
  onValueChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  disabledDates?: (date: Date) => boolean;
  clearable?: boolean;
  className?: string;
  buttonClassName?: string;
}

function parseDate(value: DateValue) {
  if (!value) return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toDateInputValue(date: Date | undefined) {
  return date ? format(date, "yyyy-MM-dd") : "";
}

export function BaseDatePicker({
  value,
  onChange,
  onValueChange,
  label,
  placeholder = "Pick a date",
  error,
  required,
  disabled,
  disabledDates,
  clearable = true,
  className,
  buttonClassName,
}: BaseDatePickerProps) {
  const selected = parseDate(value);
  const [open, setOpen] = React.useState(false);

  const commit = (date: Date | undefined) => {
    const nextValue = toDateInputValue(date);
    onChange?.(date, nextValue);
    onValueChange?.(nextValue);
    setOpen(false);
  };

  const control = (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              data-empty={!selected}
              className={cn("h-9 w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground", buttonClassName)}
              aria-invalid={Boolean(error) || undefined}
            >
              <CalendarIcon data-icon="inline-start" />
              {selected ? format(selected, "PPP") : <span>{placeholder}</span>}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={commit}
            disabled={disabledDates}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      {clearable && selected && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => commit(undefined)}
          aria-label="Clear date"
        >
          <X />
        </Button>
      )}
    </div>
  );

  if (!label) return control;

  return (
    <BaseFormField label={label} error={error} required={required}>
      {control}
    </BaseFormField>
  );
}
