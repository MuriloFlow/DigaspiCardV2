"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, Users, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatInteger } from "@/lib/utils/format";
import { useRecords } from "@/components/providers/records-provider";

type DailyCustomersModalProps = {
  open: boolean;
  dateKey: string;
  onClose: () => void;
};

export function DailyCustomersModal({
  open,
  dateKey,
  onClose,
}: DailyCustomersModalProps) {
  const { refresh } = useRecords();
  const [customersCount, setCustomersCount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCustomersCount("");
      setErrorMsg(null);
      setIsSubmitting(false);
      // Focus on input after animation
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const count = parseInt(customersCount, 10);
    if (isNaN(count) || count < 0) {
      setErrorMsg("Digite um valor válido para o total de clientes.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/daily-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateKey, totalCustomers: count }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Erro ao salvar fluxo do caixa.");
      }

      await refresh();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isSubmitting ? onClose : undefined}
            className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-sm"
            aria-hidden="true"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center sm:inset-0 sm:items-center">
            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="flex w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2.5rem]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-100 px-6">
                <h2 id="modal-title" className="text-lg font-bold text-zinc-950">
                  Fluxo de Caixa (Clientes do dia)
                </h2>
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex size-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                <p className="mb-6 text-sm text-zinc-500">
                  Insira o número total de clientes que passaram no caixa neste dia. Essa métrica será usada para calcular a Taxa de Aproveitamento.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label
                      htmlFor="customers"
                      className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-700"
                    >
                      <Users className="size-4 text-zinc-400" />
                      Total de clientes
                    </label>
                    <div className="relative">
                      <input
                        ref={inputRef}
                        id="customers"
                        type="number"
                        min="0"
                        value={customersCount}
                        onChange={(e) => {
                          setCustomersCount(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        className={cn(
                          "w-full rounded-2xl border-2 bg-transparent px-5 py-4 text-xl font-bold text-zinc-950 transition placeholder:font-medium placeholder:text-zinc-300 focus:outline-none focus:ring-4",
                          errorMsg
                            ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
                            : "border-zinc-200 focus:border-zinc-950 focus:ring-zinc-950/10",
                        )}
                        placeholder="Ex: 150"
                        disabled={isSubmitting}
                        autoComplete="off"
                        inputMode="numeric"
                        pattern="[0-9]*"
                      />
                    </div>
                    <AnimatePresence>
                      {errorMsg && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 overflow-hidden text-sm font-medium text-red-500"
                        >
                          {errorMsg}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </form>
              </div>

              <div className="shrink-0 border-t border-zinc-100 p-6">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !customersCount}
                  className="group relative flex w-full h-[52px] items-center justify-center gap-2 overflow-hidden rounded-2xl bg-zinc-950 px-6 font-semibold text-white transition disabled:opacity-50"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {isSubmitting ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <>
                        Confirmar e Salvar
                        <Check className="size-4 transition group-hover:scale-110" />
                      </>
                    )}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
