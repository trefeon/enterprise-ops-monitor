import type { FormEvent, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { BaseAnimatedForm } from '@/components/base';
import { cn } from '@/lib/utils';

interface EntityFormDialogProps {
  open: boolean;
  title: string;
  description?: string;
  submitLabel: string;
  submitting?: boolean;
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onOpenChange: (open: boolean) => void;
}

interface EntityFormGridProps {
  children: ReactNode;
  className?: string;
}

interface EntityFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function EntityFormDialog({
  open,
  title,
  description,
  submitLabel,
  submitting = false,
  children,
  onSubmit,
  onOpenChange,
}: EntityFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-hidden p-0 sm:max-w-3xl">
        <BaseAnimatedForm
          onSubmit={onSubmit}
          className="flex max-h-[calc(100vh-2rem)] min-w-0 flex-col"
        >
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="text-lg">{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          <div className="min-h-0 overflow-y-auto px-5 py-4">{children}</div>

          <DialogFooter className="m-0 rounded-none border-t border-border bg-muted/60 px-5 py-4">
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              <span className="truncate">{submitLabel}</span>
            </Button>
          </DialogFooter>
        </BaseAnimatedForm>
      </DialogContent>
    </Dialog>
  );
}

export function EntityFormGrid({ children, className }: EntityFormGridProps) {
  return <div className={cn('grid min-w-0 gap-4 md:grid-cols-2', className)}>{children}</div>;
}

export function EntityField({
  label,
  htmlFor,
  required = false,
  hint,
  className,
  children,
}: EntityFieldProps) {
  return (
    <div className={cn('min-w-0 space-y-2', className)}>
      <Label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {hint && <p className="break-words text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default EntityFormDialog;
