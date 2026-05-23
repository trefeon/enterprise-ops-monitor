import type { InputHTMLAttributes } from "react";
import { BaseDatePicker } from "@/components/base";
import { cn } from "@/lib/utils";

export interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "value"> {
  value?: string | null;
  val?: string | null;
  onValueChange?: (value: string) => void;
  size?: "sm" | "default";
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
  return (
    <BaseDatePicker
      value={value ?? val ?? ""}
      onValueChange={(nextValue) => onValueChange?.(nextValue)}
      disabled={disabled}
      required={required}
      placeholder={placeholder}
      className={cn("w-full", className)}
      buttonClassName={cn(
        "border-border bg-card tabular-nums hover:border-border/80 focus-visible:border-primary/50 focus-visible:ring-primary/10",
        size === "sm" && "h-9 text-xs"
      )}
    />
  );
}

export default DatePicker;
