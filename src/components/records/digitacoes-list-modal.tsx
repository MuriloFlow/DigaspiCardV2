"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Keyboard, X } from "lucide-react";
import type { Digitacao } from "@/lib/records/digitacoes-repository";
import { getDigitacaoQuantity, sumDigitacoes } from "@/lib/records/digitacoes-utils";
import { formatTime } from "@/lib/utils/format";
import { EditDigitacaoModal } from "./edit-digitacao-modal";

type DigitacoesListModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  digitacoes: Digitacao[];
};

export function DigitacoesListModal({
  open,
  onClose,
  title,
  subtitle,
  digitacoes,
}: DigitacoesListModalProps) {
  const [selectedDigitacao, setSelectedDigitacao] = useState<Digitacao | null>(null);

  const operatorGroups = digitacoes.reduce((acc, curr) => {
    const operator = curr.operatorName || "Desconhecido";
    if (!acc[operator]) acc[operator] = [];
    acc[operator].push(curr);
    return acc;
  }, {} as Record<string, Digitacao[]>);

  const sortedOperators = Object.entries(operatorGroups).sort(
    (a, b) => sumDigitacoes(b[1]) - sumDigitacoes(a[1]),
  );

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-[50] bg-black/80 backdrop-blur-md"
              aria-hidden="true"
            />
            <div className="fixed inset-x-0 bottom-0 z-[50] flex justify-center sm:inset-0 sm:items-center">
              <motion.div
                initial={{ y: "100%", opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: "100%", opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-[2.5rem]"
                role="dialog"
                aria-modal="true"
              >
                <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 p-5">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-zinc-950">{title}</h2>
                    <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex size-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-700"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 pb-12 sm:p-6">
                  {sortedOperators.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-zinc-100">
                        <Keyboard className="size-8 text-zinc-400" />
                      </div>
                      <p className="text-lg font-bold text-zinc-950">Nenhuma digitacao</p>
                      <p className="mt-1 text-sm text-zinc-500">Nao ha registros para este periodo.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {sortedOperators.map(([operator, items]) => {
                        const operatorTotal = sumDigitacoes(items);

                        return (
                          <div key={operator} className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-zinc-900">{operator}</h3>
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                                {operatorTotal} {operatorTotal === 1 ? "digitacao" : "digitacoes"}
                              </span>
                            </div>
                            <div className="grid gap-2">
                              {items.map((dig) => {
                                const quantity = getDigitacaoQuantity(dig);

                                return (
                                  <button
                                    key={dig.id}
                                    type="button"
                                    onClick={() => setSelectedDigitacao(dig)}
                                    className="group flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 text-left transition hover:border-zinc-300 hover:bg-zinc-100"
                                  >
                                    <div className="flex min-w-0 items-center gap-3">
                                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                                        <Keyboard className="size-5" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-zinc-950">
                                          {dig.clientName}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                          {formatTime(dig.createdAt)}
                                          {quantity > 1 ? ` - ${quantity} digitacoes` : ""}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center text-zinc-400 transition group-hover:text-zinc-600">
                                      <span className="mr-2 text-xs font-medium">Detalhes</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <EditDigitacaoModal
        open={!!selectedDigitacao}
        digitacao={selectedDigitacao}
        onClose={() => setSelectedDigitacao(null)}
      />
    </>
  );
}
