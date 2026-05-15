'use client';

import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';

export function Toaster() {
  const { toasts, removeToast } = useAppStore();

  const actionClass = (variant?: 'default' | 'secondary' | 'destructive') => {
    if (variant === 'destructive') {
      return 'border-red-500/40 bg-red-500/20 text-red-200 hover:bg-red-500/30';
    }

    if (variant === 'secondary') {
      return 'border-white/15 bg-white/5 text-[hsl(var(--muted))] hover:bg-white/10 hover:text-white';
    }

    return 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25';
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-white/10 bg-[#1A1A1A] p-4 shadow-2xl ring-1 ring-black/5"
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
              {toast.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white">{toast.title}</h3>
              {toast.description && (
                <p className="mt-1 text-xs text-[hsl(var(--muted))]">{toast.description}</p>
              )}
              {toast.actions && toast.actions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {toast.actions.map((action, idx) => (
                    <button
                      key={`${toast.id}-action-${idx}`}
                      onClick={() => {
                        action.onClick?.();
                        if (!action.keepOpen) {
                          removeToast(toast.id);
                        }
                      }}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${actionClass(action.variant)}`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 rounded-lg p-1 text-[hsl(var(--muted))] transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
