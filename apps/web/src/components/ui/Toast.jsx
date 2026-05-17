import React, { useCallback, useMemo, useState } from 'react';
import { ToastContext } from './ToastContext';

const variantStyles = {
  success: 'bg-status-success/15 text-status-success border-status-success/30',
  warning: 'bg-status-warning/15 text-status-warning border-status-warning/30',
  error: 'bg-status-error/15 text-status-error border-status-error/30',
  info: 'bg-status-info/15 text-status-info border-status-info/30',
  neutral: 'bg-muted text-foreground border-border',
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
            className={`rounded-lg border px-4 py-2 text-sm shadow-lg ${variantStyles[toast.variant] || variantStyles.neutral}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                {toast.title && <div className="font-semibold">{toast.title}</div>}
                {toast.message && <div className="text-muted-foreground">{toast.message}</div>}
              </div>
              <button
                className="text-muted-foreground hover:text-foreground"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
