import type { ReactNode } from "react";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";

export interface BaseFormFieldProps {
  label?: ReactNode;
  htmlFor?: string;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

export function BaseFormField({
  label,
  htmlFor,
  description,
  error,
  required,
  disabled,
  children,
  className,
}: BaseFormFieldProps) {
  return (
    <Field
      data-invalid={Boolean(error) || undefined}
      data-disabled={disabled || undefined}
      className={cn(className)}
    >
      {label && (
        <FieldLabel htmlFor={htmlFor}>
          {label}
          {required && <span className="text-destructive">*</span>}
        </FieldLabel>
      )}
      {children}
      {description && !error && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
