"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarPlus, Check, Loader2, X } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useRecords } from "@/components/providers/records-provider";
import type { RecordsPayload } from "@/lib/records/types";
import { notifyRecordsChanged } from "@/lib/records/realtime-client";

type InsertDayModalProps = {
  open: boolean;
  monthKey: string;
  onClose: () => void;
};

export function InsertDayModal({ open, monthKey, onClose }: InsertDayModalProps) {
  const { selectedStoreId } = useAuth();
  const { applyPayload } = useRecords();
  const [dateKey, setDateKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const minDate = `${monthKey}-01`;
  const maxDate = `${monthKey}-${String(lastDay).padStart(2, "0")}`;

  useEffect(() => {
    if (!open) return;
    void Promise.resolve().then(() => {
      setDateKey(`${monthKey}-01`);
      setError(null);
      setIsSubmitting(false);
    });
  }, [monthKey, open]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (isSubmitting) return;

    if (!selectedStoreId) {
      setError("Selecione uma unidade antes de inserir o dia.");
      return;
    }

    if (!dateKey.startsWith(`${monthKey}-`)) {
      setError("Escolha uma data dentro do mes selecionado.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/history-days", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ dateKey, storeId: selectedStoreId }),
      });
      const data = (await response.json().catch(() => ({}))) as
        | (Partial<RecordsPayload> & { message?: string })
        | { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "Nao foi possivel inserir o dia.");
      }

      applyPayload(data as Partial<RecordsPayload>);
      notifyRecordsChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isSubmitting ? onClose : undefined}
          />
          <div className="fixed inset-x-0 bottom-0 z-[70] flex justify-center sm:inset-0 sm:items-center">
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ y: "100%", opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="flex w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2.5rem]"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                    <CalendarPlus className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Historico
                    </p>
                    <h2 className="truncate text-lg font-bold text-zinc-950">
                      Inserir dia vazio
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 p-6">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-zinc-800">
                    Dia que deve aparecer no historico
                  </span>
                  <input
                    type="date"
                    value={dateKey}
                    min={minDate}
                    max={maxDate}
                    onChange={(event) => {
                      setError(null);
                      setDateKey(event.target.value);
                    }}
                    disabled={isSubmitting}
                    className="h-14 w-full rounded-2xl border border-zinc-200 bg-white px-5 text-base font-bold text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
                  />
                </label>

                {error ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting || !dateKey}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Inserir dia
                </button>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
