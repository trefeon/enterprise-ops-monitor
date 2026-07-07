import * as React from "react";
import type { InputHTMLAttributes } from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DateValue = Date | string | undefined | null;

export interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "value"> {
  value?: string | null;
  val?: string | null;
  onValueChange?: (value: string) => void;
  size?: "sm" | "default";
}

function parseDate(value: string | null | undefined) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toDateInputValue(date: Date | undefined) {
  return date ? format(date, "yyyy-MM-dd") : "";
}

export function DatePicker({
  value,
  val,
  onValueChange,
  className,
  size = "default",
  disabled,
  required,
  placeholder,
}: DatePickerProps) {
  const resolvedValue = value ?? val ?? "";
  const selected = parseDate(resolvedValue);
  const [open, setOpen] = React.useState(false);

  const commit = (date: Date | undefined) => {
    const nextValue = toDateInputValue(date);
    onValueChange?.(nextValue);
    setOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-2 w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              data-empty={!selected}
              className={cn(
                "h-9 w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
                "border-border bg-card tabular-nums hover:border-border/80 focus-visible:border-primary/50 focus-visible:ring-primary/10",
                size === "sm" && "h-9 text-xs",
                "w-full"
              )}
              aria-invalid={required && !resolvedValue ? true : undefined}
            >
              <CalendarIcon data-icon="inline-start" />
              {selected ? format(selected, "PPP") : <span>{placeholder || "Pick a date"}</span>}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={commit}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      {selected && !disabled && (
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
}

export default DatePicker;
