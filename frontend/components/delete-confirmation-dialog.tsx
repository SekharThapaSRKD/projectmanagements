'use client';

import { AlertTriangle, Trash2, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type DeleteConfirmationDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  isPermanent?: boolean;
};

export function DeleteConfirmationDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  confirmLabel = 'Delete',
  isPermanent = false
}: DeleteConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-3 sm:items-center sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md overflow-hidden rounded-[24px] border border-white/10 bg-[hsl(var(--bg-elevated))] p-6 shadow-2xl sm:rounded-[40px] sm:p-10"
      >
        <div className="flex flex-col items-center text-center">
          <div className={isPermanent ? "mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10 text-red-500" : "mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-500"}>
            {isPermanent ? <Trash2 className="h-10 w-10" /> : <AlertTriangle className="h-10 w-10" />}
          </div>
          
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase">{title}</h2>
          <p className="mt-4 text-[hsl(var(--muted))] leading-relaxed">
            {description}
          </p>

          {isPermanent && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-red-500/5 border border-red-500/20 p-4 text-xs font-bold text-red-500">
              <AlertCircle className="h-5 w-5 shrink-0" />
              This action is permanent and cannot be reversed by the core system.
            </div>
          )}

          <div className="mt-10 flex w-full flex-col gap-3">
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={isPermanent 
                ? "w-full rounded-2xl bg-red-600 py-4 text-sm font-black uppercase tracking-widest text-white transition hover:bg-red-500 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-500/20"
                : "w-full rounded-2xl bg-[hsl(var(--accent))] py-4 text-sm font-black uppercase tracking-widest text-black transition hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[hsl(var(--accent)/0.2)]"
              }
            >
              {confirmLabel}
            </button>
            <button
              onClick={onClose}
              className="w-full rounded-2xl bg-white/5 py-4 text-sm font-black uppercase tracking-widest text-[hsl(var(--muted))] transition hover:bg-white/10 hover:text-white"
            >
              Cancel Operation
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
