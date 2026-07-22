"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { MonthAnalytics } from "./month-analytics";

type DailyMetricsModalProps = {
  open: boolean;
  onClose: () => void;
  dateLabel: string;
  totalCartoes: number;
  totalDigitacoes: number;
  totalClientes: number;
  taxaAproveitamento: number;
  taxaAprovacao: number;
  cartoesAtivosPerc: number;
  ativosNoCaixaPerc: number;
  ticketMedio: number;
  crescimentoCartoes: number;
  crescimentoValor: number;
};

export function DailyMetricsModal({
  open,
  onClose,
  dateLabel,
  totalCartoes,
  totalDigitacoes,
  totalClientes,
  taxaAproveitamento,
  taxaAprovacao,
  cartoesAtivosPerc,
  ativosNoCaixaPerc,
  ticketMedio,
  crescimentoCartoes,
  crescimentoValor,
}: DailyMetricsModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md"
            aria-hidden="true"
          />
          <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-center sm:inset-0 sm:items-center">
            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="flex w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-[2.5rem]"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 p-5">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-zinc-950">Métricas do Dia</h2>
                  <p className="mt-1 text-sm text-zinc-500">{dateLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex size-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-700"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-12">
                <MonthAnalytics
                  totalCartoes={totalCartoes}
                  totalDigitacoes={totalDigitacoes}
                  totalClientes={totalClientes}
                  taxaAproveitamento={taxaAproveitamento}
                  taxaAprovacao={taxaAprovacao}
                  cartoesAtivosPerc={cartoesAtivosPerc}
                  ativosNoCaixaPerc={ativosNoCaixaPerc}
                  ticketMedio={ticketMedio}
                  crescimentoCartoes={crescimentoCartoes}
                  crescimentoValor={crescimentoValor}
                />
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
