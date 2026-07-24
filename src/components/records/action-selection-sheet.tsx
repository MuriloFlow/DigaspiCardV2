"use client";

import { AnimatePresence, motion } from "motion/react";
import { CreditCard, Keyboard, X, Store, ArrowRightLeft, TrendingUp } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

type ActionSelectionSheetProps = {
  open: boolean;
  onClose: () => void;
  onSelectCard: () => void;
  onSelectDigitacao: () => void;
  onSelectDigitacaoCaixa: () => void;
  onSelectTroca: () => void;
  onSelectViradaPu: () => void;
};

export function ActionSelectionSheet({
  open,
  onClose,
  onSelectCard,
  onSelectDigitacao,
  onSelectDigitacaoCaixa,
  onSelectTroca,
  onSelectViradaPu,
}: ActionSelectionSheetProps) {
  const { user } = useAuth();
  const isManagerOrAbove = user && ["MANAGER", "REGIONAL_MANAGER", "TI_ADMIN", "GLOBAL_ADMIN"].includes(user.role);
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
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Novo Registro
                </p>
                <h3 className="mt-0.5 text-xl font-bold text-zinc-950">
                  O que deseja registrar?
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

            {/* Options */}
            <div className="grid gap-3">
              {/* Registro de Cartão */}
              <motion.button
                type="button"
                onClick={() => { onClose(); setTimeout(onSelectCard, 80); }}
                whileTap={{ scale: 0.97 }}
                className="group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-left transition hover:border-zinc-300 hover:bg-zinc-100"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white transition group-hover:scale-105">
                  <CreditCard className="size-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-zinc-950">
                    Registro de Cartão
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    Cartão aprovado e valor confirmado
                  </p>
                </div>
              </motion.button>

              {/* Digitação */}
              <motion.button
                type="button"
                onClick={() => { onClose(); setTimeout(onSelectDigitacao, 80); }}
                whileTap={{ scale: 0.97 }}
                className="group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-left transition hover:border-zinc-300 hover:bg-zinc-100"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white transition group-hover:scale-105">
                  <Keyboard className="size-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-zinc-950">
                    Digitação
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    Tentativa não aprovada — registrar em lote
                  </p>
                </div>
              </motion.button>
              {/* Digitação Caixa */}
              <motion.button
                type="button"
                onClick={() => { onClose(); setTimeout(onSelectDigitacaoCaixa, 80); }}
                whileTap={{ scale: 0.97 }}
                className="group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-left transition hover:border-zinc-300 hover:bg-zinc-100"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white transition group-hover:scale-105">
                  <Store className="size-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-zinc-950">
                    Digitação Caixa
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    Registrar digitações direto no caixa
                  </p>
                </div>
              </motion.button>

              {/* Troca (Apenas Gerentes/Admin) */}
              {isManagerOrAbove && (
                <motion.button
                  type="button"
                  onClick={() => { onClose(); setTimeout(onSelectTroca, 80); }}
                  whileTap={{ scale: 0.97 }}
                  className="group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-left transition hover:border-zinc-300 hover:bg-zinc-100"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white transition group-hover:scale-105">
                    <ArrowRightLeft className="size-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-zinc-950">
                      Troca
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-500">
                      Registrar troca efetuada (Apenas Gerentes)
                    </p>
                  </div>
                </motion.button>
              )}

              {/* Virada de PU */}
              <motion.button
                type="button"
                onClick={() => { onClose(); setTimeout(onSelectViradaPu, 80); }}
                whileTap={{ scale: 0.97 }}
                className="group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-left transition hover:border-zinc-300 hover:bg-zinc-100"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white transition group-hover:scale-105">
                  <TrendingUp className="size-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-zinc-950">
                    Virada de PU
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    Registrar convers�o de produto �nico (Caixas)
                  </p>
                </div>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

