"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, X } from "lucide-react";

type ConfirmActionSheetProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
};

export function ConfirmActionSheet({
  open,
  onClose,
  onConfirm,
  title = "Confirmar ação",
  description = "Você está prestes a registrar uma atividade num dia específico (retroativo/diferente de hoje). Deseja continuar?",
}: ConfirmActionSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="sheet-backdrop"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            key="sheet-panel"
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[2rem] border-t border-zinc-200 bg-white px-5 pb-10 pt-5 shadow-[0_-24px_70px_rgba(15,23,42,0.14)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
          >
            {/* Handle bar */}
            <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-zinc-200" />

            {/* Title row */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-500">
                  Atenção
                </p>
                <h3 className="mt-0.5 text-xl font-bold text-zinc-950">
                  {title}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex size-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-700"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="mb-6 text-sm text-zinc-600">
              {description}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-zinc-200 bg-white font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onConfirm();
                }}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-black font-semibold text-white transition hover:bg-zinc-800"
              >
                <Check className="size-4" />
                Sim, continuar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
