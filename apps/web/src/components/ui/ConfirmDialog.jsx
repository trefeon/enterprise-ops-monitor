import React from 'react';
import Button from './Button';
import Input from './Input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';

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
}) {
  const needsMatch = typeof confirmExpected === 'string';
  const canConfirm = !needsMatch || confirmValue === confirmExpected;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {desc && <DialogDescription>{desc}</DialogDescription>}
        </DialogHeader>
        {needsMatch && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">{confirmLabel}</label>
            <Input
              value={confirmValue || ''}
              onChange={(e) => onConfirmValueChange && onConfirmValueChange(e.target.value)}
              placeholder={confirmPlaceholder}
            />
          </div>
        )}

        {confirmHint && <div>{confirmHint}</div>}

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={confirmDisabled || !canConfirm}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
