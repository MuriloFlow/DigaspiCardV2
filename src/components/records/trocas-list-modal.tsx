"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRightLeft, Loader2, Trash2, User, X, AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils/cn";

type Troca = {
  id: string;
  storeId: string;
  managerId: string;
  managerName: string;
  dateKey: string;
  createdAt: string;
};

type TrocasByManager = {
  managerId: string;
  managerName: string;
  count: number;
  trocas: Troca[];
};

export function TrocasListModal({
  open,
  onClose,
  storeId,
  dateKey,
}: {
  open: boolean;
  onClose: () => void;
  storeId?: string | null;
  dateKey?: string | null;
}) {
  const { user } = useAuth();
  const [trocas, setTrocas] = useState<Troca[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canDelete = user?.role === "GLOBAL_ADMIN" || user?.role === "TI_ADMIN" || user?.role === "REGIONAL_MANAGER" || user?.role === "MANAGER";

  const fetchTrocas = useCallback(async (signal?: AbortSignal) => {
    if (!open) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (storeId) params.set("storeId", storeId);
      if (dateKey) params.set("dateKey", dateKey);
      const query = params.toString();
      const res = await fetch(`/api/digitacoes/troca${query ? `?${query}` : ""}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "Erro ao carregar trocas.");
      }
      const data = await res.json();
      setTrocas(data.trocas ?? []);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [open, storeId, dateKey]);

  useEffect(() => {
    if (!open) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
      setError("Tempo esgotado ao carregar trocas. Verifique a conexao e tente atualizar.");
      setLoading(false);
    }, 15000);

    void fetchTrocas(controller.signal);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [fetchTrocas]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/digitacoes/troca?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "Erro ao deletar troca.");
      }
      setTrocas((prev) => prev.filter((t) => t.id !== id));
      setConfirmDeleteId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao deletar.");
    } finally {
      setDeletingId(null);
    }
  };

  // Group by manager
  const byManager: TrocasByManager[] = Object.values(
    trocas.reduce<Record<string, TrocasByManager>>((acc, t) => {
      if (!acc[t.managerId]) {
        acc[t.managerId] = { managerId: t.managerId, managerName: t.managerName, count: 0, trocas: [] };
      }
      acc[t.managerId].count++;
      acc[t.managerId].trocas.push(t);
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="flex w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-[2.5rem]"
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-orange-100">
                    <ArrowRightLeft className="size-5 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-950">Trocas do Dia</h2>
                    <p className="text-xs text-zinc-500">{dateKey ?? "Hoje"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-orange-100 px-2.5 text-sm font-bold text-orange-700">
                    {trocas.length}
                  </span>
                  <button
                    onClick={onClose}
                    className="flex size-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-zinc-500">
                    <Loader2 className="size-6 animate-spin" />
                    <p className="text-sm font-medium">Carregando trocas...</p>
                  </div>
                ) : error ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex items-start gap-2">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                ) : trocas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-zinc-500">
                    <ArrowRightLeft className="size-8 text-zinc-300" />
                    <p className="text-sm font-medium">Nenhuma troca registrada</p>
                    <p className="text-xs text-zinc-400 text-center">
                      {dateKey ? `Nenhuma troca em ${dateKey}` : "Nenhuma troca encontrada."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary by manager */}
                    {byManager.map((group) => (
                      <div key={group.managerId} className="rounded-2xl border border-zinc-100 bg-zinc-50 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-full bg-orange-100">
                              <User className="size-4 text-orange-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-zinc-950">{group.managerName}</p>
                              <p className="text-xs text-zinc-500">Gerente</p>
                            </div>
                          </div>
                          <div className="flex size-7 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                            {group.count}
                          </div>
                        </div>
                        <div className="divide-y divide-zinc-100">
                          {group.trocas.map((troca) => {
                            const time = new Date(troca.createdAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                            const isDeleting = deletingId === troca.id;
                            const isConfirming = confirmDeleteId === troca.id;
                            return (
                              <div key={troca.id} className="flex items-center justify-between px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <ArrowRightLeft className="size-3.5 text-zinc-400" />
                                  <span className="text-xs text-zinc-600">
                                    Troca às <span className="font-semibold">{time}</span>
                                  </span>
                                </div>
                                {canDelete && (
                                  <div className="flex items-center gap-1">
                                    {isConfirming ? (
                                      <>
                                        <button
                                          onClick={() => setConfirmDeleteId(null)}
                                          className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 transition"
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          onClick={() => handleDelete(troca.id)}
                                          disabled={isDeleting}
                                          className="rounded-lg bg-rose-500 px-2 py-1 text-xs font-bold text-white hover:bg-rose-600 transition disabled:opacity-50"
                                        >
                                          {isDeleting ? <Loader2 className="size-3 animate-spin" /> : "Confirmar"}
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => setConfirmDeleteId(troca.id)}
                                        disabled={!!deletingId}
                                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-500 transition disabled:opacity-30"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {trocas.length > 0 && (
                <div className="shrink-0 border-t border-zinc-100 bg-zinc-50 px-6 py-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Total de trocas:</span>
                    <span className="font-bold text-zinc-950">{trocas.length} trocas</span>
                  </div>
                  {byManager.length > 1 && (
                    <div className="mt-2 space-y-1">
                      {byManager.map((g) => (
                        <div key={g.managerId} className="flex items-center justify-between text-xs text-zinc-500">
                          <span>{g.managerName}</span>
                          <span className="font-semibold text-zinc-700">{g.count} troca{g.count !== 1 ? "s" : ""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
