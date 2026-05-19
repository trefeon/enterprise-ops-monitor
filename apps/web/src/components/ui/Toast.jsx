import React, { useCallback, useMemo, useState } from 'react';
import { ToastContext } from './ToastContext';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const variantStyles = {
  success: 'border-l-status-success text-status-success',
  warning: 'border-l-status-warning text-status-warning',
  error: 'border-l-status-error text-status-error',
  info: 'border-l-status-info text-status-info',
  neutral: 'border-l-muted-foreground text-foreground',
};

const iconMap = {
  success: <CheckCircle2 className="size-4 shrink-0" />,
  warning: <AlertTriangle className="size-4 shrink-0" />,
  error: <AlertCircle className="size-4 shrink-0" />,
  info: <Info className="size-4 shrink-0" />,
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((toast) => {
    const id = toast.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const entry = { variant: 'neutral', duration: 4000, ...toast, id };
    setToasts((prev) => [...prev, entry]);

    if (entry.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, entry.duration);
    }
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, variant = 'neutral') => {
      push({ variant, message });
    },
    [push]
  );

  const value = useMemo(() => ({ push, dismiss, showToast }), [push, dismiss, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-full sm:max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'animate-in rounded-md border border-border border-l-4 bg-popover px-4 py-3 text-sm shadow-[0_8px_32px_rgb(0_0_0_/_0.5)] duration-300 slide-in-from-right-full',
              variantStyles[toast.variant] || variantStyles.neutral
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{iconMap[toast.variant]}</div>
                <div className="space-y-1">
                  {toast.title && <div className="font-bold tracking-tight">{toast.title}</div>}
                  {toast.message && (
                    <div className="text-xs opacity-90 leading-relaxed">{toast.message}</div>
                  )}
                </div>
              </div>
              <button
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
