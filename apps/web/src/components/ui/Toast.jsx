import React, { useCallback, useMemo, useState } from 'react';
import { ToastContext } from './ToastContext';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const variantStyles = {
  success: 'bg-status-success/15 text-status-success border-status-success/30',
  warning: 'bg-status-warning/15 text-status-warning border-status-warning/30',
  error: 'bg-status-error/15 text-status-error border-status-error/30',
  info: 'bg-status-info/15 text-status-info border-status-info/30',
  neutral: 'bg-muted text-foreground border-border',
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

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-full sm:max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'rounded-xl border px-4 py-3 text-sm shadow-xl animate-in slide-in-from-right-full duration-300',
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
                className="text-muted-foreground hover:text-foreground p-1 hover:bg-black/5 rounded transition-colors"
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
