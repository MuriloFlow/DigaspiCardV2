"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, Trash2, X } from "lucide-react";
import type { Digitacao } from "@/lib/records/digitacoes-repository";
import { useAuth } from "@/components/providers/auth-provider";
import { useRecords } from "@/components/providers/records-provider";

type EditDigitacaoModalProps = {
  open: boolean;
  digitacao: Digitacao | null;
  onClose: () => void;
};

export function EditDigitacaoModal({
  open,
  digitacao,
  onClose,
}: EditDigitacaoModalProps) {
  const { user } = useAuth();
  const { refresh } = useRecords();
  
  const [clientName, setClientName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const clientInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && digitacao) {
      setClientName(digitacao.clientName);
      setErrorMsg(null);
      setIsSubmitting(false);
      setConfirmDelete(false);
      setIsDeleting(false);
      
      setTimeout(() => clientInputRef.current?.focus(), 400);
    }
  }, [open, digitacao]);

  const handleDelete = async () => {
    if (!digitacao) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/digitacoes?id=${digitacao.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Erro ao deletar.");
      }
      await refresh();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao deletar.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!digitacao || isSubmitting) return;

    if (clientName.trim().length < 2) {
      setErrorMsg("O nome deve ter pelo menos 2 caracteres.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/digitacoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: digitacao.id,
          clientName: clientName.trim(),
        })
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
      {open && digitacao && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isSubmitting && !isDeleting ? onClose : undefined}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md"
            aria-hidden="true"
          />
          <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-center sm:inset-0 sm:items-center">
            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="flex w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] bg-white dark:bg-zinc-950 shadow-2xl sm:rounded-[2.5rem]"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 dark:border-zinc-800 p-5">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white">Editar Digitação</h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Altere os dados ou exclua o registro</p>
                </div>
                <div className="flex items-center gap-2">
                  {(user?.role === "GLOBAL_ADMIN" || user?.role === "MANAGER") && !confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="flex size-10 items-center justify-center rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition"
                      title="Deletar digitação"
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
                        className="rounded-full bg-zinc-100 dark:bg-zinc-800 p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-white"
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
                      className="flex size-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-white"
                      aria-label="Fechar modal"
                    >
                      <X className="size-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:max-h-[70vh]">
                <form id="edit-dig-form" onSubmit={handleSubmit} className="space-y-6">
                  {errorMsg && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                      {errorMsg}
                    </div>
                  )}

                  <div>
                    <label htmlFor="digClientName" className="mb-1.5 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Nome do Cliente
                    </label>
                    <input
                      id="digClientName"
                      ref={clientInputRef}
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex: Maria"
                      className="h-14 w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-5 text-lg font-medium text-zinc-900 dark:text-zinc-100 outline-none transition duration-200 focus:border-zinc-900 dark:focus:border-white focus:ring-4 focus:ring-zinc-900/10 dark:focus:ring-white/10"
                      autoComplete="off"
                      required
                    />
                  </div>
                </form>
              </div>

              <div className="shrink-0 border-t border-zinc-100 dark:border-zinc-800 p-5">
                <button
                  type="submit"
                  form="edit-dig-form"
                  disabled={isSubmitting || isDeleting}
                  className="group relative flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl bg-zinc-900 dark:bg-white px-8 text-base font-semibold text-white dark:text-zinc-950 shadow-lg transition-all hover:-translate-y-0.5 hover:bg-zinc-800 dark:hover:bg-zinc-100 hover:shadow-xl active:translate-y-0 active:shadow-md disabled:pointer-events-none disabled:opacity-70"
                >
                  <div className="absolute inset-0 flex items-center justify-center transition-all duration-300">
                    <span className={isSubmitting || isDeleting ? "translate-y-8 opacity-0" : "translate-y-0 opacity-100"}>
                      Salvar Alterações
                    </span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center transition-all duration-300">
                    <span className={isSubmitting || isDeleting ? "translate-y-0 opacity-100" : "-translate-y-8 opacity-0"}>
                      Processando...
                    </span>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
