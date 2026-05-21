import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  desc?: string;
  confirmText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  confirmValue?: string;
  confirmExpected?: string | null;
  onConfirmValueChange?: ((value: string) => void) | null;
  confirmLabel?: string;
  confirmPlaceholder?: string;
  confirmHint?: ReactNode;
  confirmDisabled?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  desc,
  confirmText = 'Confirm',
  danger = false,
  onConfirm,
  onClose,
  confirmValue = '',
  confirmExpected = null,
  onConfirmValueChange = null,
  confirmLabel = 'Type to confirm',
  confirmPlaceholder = '',
  confirmHint = null,
  confirmDisabled = false,
  loading = false,
}: ConfirmDialogProps) {
  const needsMatch = typeof confirmExpected === 'string';
  const canConfirm = !needsMatch || confirmValue === confirmExpected;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !loading) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md border-border bg-popover text-popover-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">{title}</DialogTitle>
          {desc && <DialogDescription className="text-sm text-muted-foreground">{desc}</DialogDescription>}
        </DialogHeader>

        {needsMatch && (
          <div className="space-y-2 py-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{confirmLabel}</label>
            <Input
              value={confirmValue || ''}
              onChange={(e) => onConfirmValueChange && onConfirmValueChange(e.target.value)}
              placeholder={confirmPlaceholder}
              disabled={loading}
              className="border-border bg-card hover:border-border/80 focus-visible:border-primary/50 focus-visible:ring-primary/10"
            />
          </div>
        )}

        {confirmHint && <div className="text-xs text-muted-foreground py-1">{confirmHint}</div>}

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button variant="secondary" onClick={onClose} disabled={loading} className="w-full sm:w-auto font-semibold">
            Cancel
          </Button>
          <Button
            variant={danger ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={confirmDisabled || !canConfirm || loading}
            className="w-full sm:w-auto font-semibold gap-1.5"
          >
            {loading && <Loader2 className="size-4 animate-spin shrink-0" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmDialog;
