import React from 'react';
import Button from './Button';

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
  if (!open) return null;
  const needsMatch = typeof confirmExpected === 'string';
  const canConfirm = !needsMatch || confirmValue === confirmExpected;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl">
        <div className="text-lg font-semibold text-foreground">{title}</div>
        {desc && <div className="mt-2 text-sm text-muted-foreground">{desc}</div>}

        {needsMatch && (
          <div className="mt-4 space-y-2">
            <label className="text-xs text-muted-foreground">{confirmLabel}</label>
            <input
              value={confirmValue || ''}
              onChange={(e) => onConfirmValueChange && onConfirmValueChange(e.target.value)}
              placeholder={confirmPlaceholder}
              className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
          </div>
        )}

        {confirmHint && <div className="mt-3">{confirmHint}</div>}

        <div className="mt-6 flex justify-end gap-4">
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
        </div>
      </div>
    </div>
  );
}
