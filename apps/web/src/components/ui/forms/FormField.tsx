"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";

export interface FormFieldWrapperProps {
  /** Visible label text */
  label: string;
  /** Field name for error binding (used internally) */
  name: string;
  /** The form control children (Input, Select, etc.) */
  children: React.ReactNode;
  /** Whether the field is required */
  required?: boolean;
  /** Helper text shown below the control */
  description?: string;
  /** Additional classes for the FormItem wrapper */
  className?: string;
}

/**
 * Wraps a form control with a label, optional description, and error message.
 * Uses shadcn Form primitives (FormItem, FormLabel, FormControl,
 * FormDescription, FormMessage).
 *
 * @example
 * ```tsx
 * <FormFieldWrapper label="Email" name="email" required>
 *   <Input placeholder="you@example.com" />
 * </FormFieldWrapper>
 * ```
 */
export function FormFieldWrapper({
  label,
  name,
  children,
  required = false,
  description,
  className,
}: FormFieldWrapperProps) {
  return (
    <FormItem className={cn(className)}>
      <FormLabel>
        {label}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </FormLabel>
      <FormControl>{children}</FormControl>
      {description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormItem>
  );
}

export default FormFieldWrapper;
