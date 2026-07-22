"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Keyboard, X } from "lucide-react";
import type { Digitacao } from "@/lib/records/digitacoes-repository";
import { formatTime } from "@/lib/utils/format";
import { EditDigitacaoModal } from "./edit-digitacao-modal";
import { useAuth } from "@/components/providers/auth-provider";

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
  const { user } = useAuth();
  const [selectedDigitacao, setSelectedDigitacao] = useState<Digitacao | null>(null);

  // Agrupar digitações por operador
  const operatorGroups = digitacoes.reduce((acc, curr) => {
    const op = curr.operatorName || "Desconhecido";
    if (!acc[op]) acc[op] = [];
    acc[op].push(curr);
    return acc;
  }, {} as Record<string, Digitacao[]>);

  const sortedOperators = Object.entries(operatorGroups).sort((a, b) => b[1].length - a[1].length);

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
                className="flex w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] bg-zinc-950 shadow-2xl sm:max-h-[85vh] sm:rounded-[2.5rem]"
                role="dialog"
                aria-modal="true"
              >
                <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 p-5">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
                    <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex size-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition hover:bg-zinc-700 hover:text-white"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-12">
                  {digitacoes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="flex size-16 items-center justify-center rounded-full bg-zinc-900 mb-4">
                        <Keyboard className="size-8 text-zinc-700" />
                      </div>
                      <p className="text-base font-medium text-white">Nenhuma digitação</p>
                      <p className="text-sm text-zinc-500 mt-1">Não há registros para este período.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {sortedOperators.map(([operator, items]) => (
                        <div key={operator} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-zinc-300">{operator}</h3>
                            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
                              {items.length} {items.length === 1 ? 'digitação' : 'digitações'}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {items.map((dig) => (
                              <button
                                key={dig.id}
                                onClick={() => setSelectedDigitacao(dig)}
                                className="w-full group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-left transition hover:border-zinc-700 hover:bg-zinc-800"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-purple-400">
                                    <Keyboard className="size-5" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-zinc-100">{dig.clientName}</p>
                                    <p className="text-xs text-zinc-500">{formatTime(dig.createdAt)}</p>
                                  </div>
                                </div>
                                {(user?.role === "GLOBAL_ADMIN" || user?.role === "MANAGER") && (
                                  <div className="text-xs font-medium text-zinc-500 opacity-0 transition group-hover:opacity-100">
                                    Editar
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
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
