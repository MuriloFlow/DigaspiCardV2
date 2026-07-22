"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, Trash2, X } from "lucide-react";
import type { OperatorRecord } from "@/lib/records/types";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/components/providers/auth-provider";
import { useRecords } from "@/components/providers/records-provider";

type EditRecordModalProps = {
  open: boolean;
  record: OperatorRecord | null;
  onClose: () => void;
};

export function EditRecordModal({
  open,
  record,
  onClose,
}: EditRecordModalProps) {
  const { user } = useAuth();
  const { refresh, deleteRecord } = useRecords();
  
  const [clientName, setClientName] = useState("");
  const [amount, setAmount] = useState("");
  const [activated, setActivated] = useState(false);
  const [amountUsed, setAmountUsed] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const clientInputRef = useRef<HTMLInputElement>(null);

  const amountInCents = useMemo(() => parseCurrencyInput(amount), [amount]);
  const amountUsedInCents = useMemo(() => parseCurrencyInput(amountUsed), [amountUsed]);
  
  const isManagerOrAdmin = user?.role === "MANAGER" || user?.role === "GLOBAL_ADMIN";
  const hasAmountUsed = record?.amountUsedInCents ? record.amountUsedInCents > 0 : false;
  const canToggleActive = isManagerOrAdmin || !hasAmountUsed;

  useEffect(() => {
    if (open && record) {
      setClientName(record.clientName);
      setAmount((record.amountInCents / 100).toString().replace(".", ","));
      setActivated(record.activated);
      setAmountUsed(record.amountUsedInCents ? (record.amountUsedInCents / 100).toString().replace(".", ",") : "");
      setErrorMsg(null);
      setIsSubmitting(false);
      setConfirmDelete(false);
      setIsDeleting(false);
      
      setTimeout(() => clientInputRef.current?.focus(), 400);
    }
  }, [open, record]);

  const handleDelete = async () => {
    if (!record) return;
    setIsDeleting(true);
    try {
      await deleteRecord(record.id);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao deletar.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!record || isSubmitting) return;

    if (clientName.trim().length < 2) {
      setErrorMsg("O nome deve ter pelo menos 2 caracteres.");
      return;
    }
    if (amountInCents <= 0) {
      setErrorMsg("Insira um valor válido.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload: any = {
        id: record.id,
        clientName: clientName.trim(),
        amountInCents,
        activated,
      };

      if (isManagerOrAdmin && activated && amountUsedInCents > 0) {
        payload.amountUsedInCents = amountUsedInCents;
      }

      const res = await fetch("/api/records", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Erro ao atualizar.");
      }

      await refresh();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro inesperado ao atualizar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && record && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isSubmitting && !isDeleting ? onClose : undefined}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
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
            >
              <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 p-5">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-zinc-900">Editar Registro</h2>
                  <p className="mt-1 text-sm text-zinc-500">Corrija os dados do cartão de {record.operatorName}</p>
                </div>
                <div className="flex items-center gap-2">
                  {(user?.role === "GLOBAL_ADMIN" || user?.role === "MANAGER") && !confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="flex size-10 items-center justify-center rounded-full text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition"
                      title="Deletar registro"
                    >
                      <Trash2 className="size-5" />
                    </button>
                  ) : confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
                      >
                        {isDeleting ? <Loader2 className="size-3 animate-spin" /> : "Confirmar"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="rounded-full bg-zinc-100 p-1.5 text-zinc-600 hover:bg-zinc-200"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : null}
                  {!confirmDelete && (
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting || isDeleting}
                      className="flex size-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-700"
                      aria-label="Fechar modal"
                    >
                      <X className="size-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:max-h-[70vh]">
                <form id="edit-form" onSubmit={handleSubmit} className="space-y-6">
                  {errorMsg && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                      {errorMsg}
                    </div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <label htmlFor="clientName" className="mb-1.5 block text-sm font-semibold text-zinc-700">
                        Nome do Cliente
                      </label>
                      <input
                        id="clientName"
                        ref={clientInputRef}
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Ex: Maria"
                        className="h-14 w-full rounded-2xl border border-zinc-200 bg-white px-5 text-lg font-medium text-zinc-900 outline-none transition duration-200 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
                        autoComplete="off"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="amount" className="mb-1.5 block text-sm font-semibold text-zinc-700">
                          Valor Liberado
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-zinc-400">
                            R$
                          </span>
                          <input
                            id="amount"
                            type="text"
                            inputMode="decimal"
                            value={amount}
                            onChange={(e) => setAmount(formatCurrencyInput(e.target.value))}
                            placeholder="0,00"
                            className="h-14 w-full rounded-2xl border border-zinc-200 bg-white pl-10 pr-4 text-lg font-medium text-zinc-900 outline-none transition duration-200 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="flex flex-col">
                        <label className="mb-1.5 block text-sm font-semibold text-zinc-700">Status</label>
                        <button
                          type="button"
                          disabled={!canToggleActive}
                          onClick={() => setActivated(!activated)}
                          className={cn(
                            "flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border-2 font-bold transition-all duration-300",
                            activated
                              ? "border-emerald-500 bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                              : "border-zinc-200 bg-white text-zinc-400 hover:border-zinc-300",
                            !canToggleActive && "opacity-60 cursor-not-allowed"
                          )}
                        >
                          <div
                            className={cn(
                              "flex size-5 items-center justify-center rounded-md border-2 transition-colors",
                              activated ? "border-white bg-white/20" : "border-zinc-300 bg-white"
                            )}
                          >
                            {activated && <Check className="size-3 text-white" strokeWidth={3} />}
                          </div>
                          Ativo
                        </button>
                      </div>
                    </div>
                    
                    {/* Campos extras para Gerentes/Admin se o cartão estiver Ativo */}
                    {isManagerOrAdmin && activated && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="pt-2 border-t border-zinc-100"
                      >
                        <label htmlFor="amountUsed" className="mb-1.5 block text-sm font-semibold text-zinc-700">
                          Valor Utilizado pelo Cliente (Opcional)
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-zinc-400">
                            R$
                          </span>
                          <input
                            id="amountUsed"
                            type="text"
                            inputMode="decimal"
                            value={amountUsed}
                            onChange={(e) => setAmountUsed(formatCurrencyInput(e.target.value))}
                            placeholder="0,00"
                            className="h-14 w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-lg font-medium text-zinc-900 outline-none transition duration-200 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10 focus:bg-white"
                          />
                        </div>
                        <p className="mt-2 text-xs text-zinc-500">
                          Informar o valor utilizado bloqueia a remoção do status "Ativo" por operadores.
                        </p>
                      </motion.div>
                    )}
                  </div>
                </form>
              </div>

              <div className="shrink-0 border-t border-zinc-100 bg-zinc-50/50 p-5">
                <button
                  type="submit"
                  form="edit-form"
                  disabled={isSubmitting || isDeleting}
                  className="group relative flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl bg-zinc-950 px-8 text-base font-semibold text-white shadow-lg shadow-zinc-900/20 transition-all hover:-translate-y-0.5 hover:bg-zinc-900 hover:shadow-xl hover:shadow-zinc-900/30 active:translate-y-0 active:shadow-md disabled:pointer-events-none disabled:opacity-70"
                >
                  <span className="relative flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-5 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Check className="size-5 transition-transform duration-300 group-hover:scale-110" />
                        Confirmar e Salvar
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
