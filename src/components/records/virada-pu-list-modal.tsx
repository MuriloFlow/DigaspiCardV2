"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TrendingUp, X, Trash2, Loader2, ArrowRightLeft } from "lucide-react";
import { useRecords } from "@/components/providers/records-provider";
import { useAuth } from "@/components/providers/auth-provider";
import type { ViradaPu } from "@/lib/records/viradas-pu-repository";

export function ViradaPuListModal({
  open,
  onClose,
  dateKey,
  monthKey,
}: {
  open: boolean;
  onClose: () => void;
  dateKey?: string;
  monthKey?: string;
}) {
  const { viradasPu, refresh: refreshRecords, isLoading } = useRecords();
  const { user } = useAuth();
  
  const canDelete = user?.role === "GLOBAL_ADMIN" || user?.role === "TI_ADMIN" || user?.role === "REGIONAL_MANAGER" || user?.role === "MANAGER";
  
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter for the date or month
  const filteredViradas = useMemo(() => {
    if (!viradasPu) return [];
    if (monthKey) {
      return viradasPu.filter(v => v.dateKey.startsWith(monthKey));
    }
    if (dateKey) {
      return viradasPu.filter(v => v.dateKey === dateKey);
    }
    return [];
  }, [viradasPu, dateKey, monthKey]);

  // Aggregate scores for the specific period
  const rankings = useMemo(() => {
    const scoresMap = new Map<string, { id: string, name: string, score: number }>();
    
    filteredViradas.forEach(v => {
      const existing = scoresMap.get(v.collaboratorId);
      if (existing) {
        existing.score += 1;
      } else {
        scoresMap.set(v.collaboratorId, {
          id: v.collaboratorId,
          name: v.collaboratorName,
          score: 1
        });
      }
    });

    // Sort by score descending
    const sorted = Array.from(scoresMap.values()).sort((a, b) => b.score - a.score);
    // Take only top 3 for podium
    return sorted.slice(0, 3);
  }, [filteredViradas]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/viradas-pu?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "Erro ao deletar.");
      }
      setConfirmDeleteId(null);
      void refreshRecords();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao deletar.");
    } finally {
      setDeletingId(null);
    }
  };

  const periodLabel = monthKey ? "Mês" : "Dia";

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
              className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] bg-white sm:rounded-[2.5rem]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 p-6 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-zinc-950 flex items-center gap-2">
                    <TrendingUp className="size-5 text-emerald-500" /> Pontuação PU
                  </h2>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    Ranking de Viradas de PU do {periodLabel.toLowerCase()}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full bg-zinc-100 p-2 text-zinc-500 hover:bg-zinc-200"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {isLoading ? (
                  <div className="text-center text-sm text-zinc-500 py-4">Carregando...</div>
                ) : filteredViradas.length === 0 ? (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center">
                    <TrendingUp className="mx-auto mb-2 size-8 text-zinc-400" />
                    <p className="text-sm font-medium text-zinc-900">
                      Nenhuma virada de PU registrada neste {periodLabel.toLowerCase()}.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* PODIUM SECTION */}
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 mb-3 uppercase tracking-wider">Top 3 - Pódio</h3>
                      <div className="space-y-3">
                        {rankings.map((r, index) => {
                          let medal = "";
                          let medalColor = "";
                          if (index === 0) { medal = "1º"; medalColor = "bg-yellow-100 text-yellow-700 border-yellow-200"; }
                          else if (index === 1) { medal = "2º"; medalColor = "bg-slate-100 text-slate-700 border-slate-200"; }
                          else if (index === 2) { medal = "3º"; medalColor = "bg-orange-100 text-orange-700 border-orange-200"; }
                          else { medal = `${index + 1}º`; medalColor = "bg-zinc-100 text-zinc-600 border-zinc-200"; }

                          return (
                            <div
                              key={r.id}
                              className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`flex size-10 items-center justify-center rounded-full border font-bold ${medalColor}`}>
                                  {medal}
                                </div>
                                <p className="font-semibold text-zinc-900">{r.name}</p>
                              </div>
                              <div className="flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full">
                                <span>{r.score}</span>
                                <span className="text-xs uppercase tracking-wider">PU</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    <hr className="border-zinc-200" />
                    
                    {/* HISTORY LIST */}
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 mb-3 uppercase tracking-wider">Registros Individuais</h3>
                      
                      {error && (
                        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                          {error}
                        </div>
                      )}

                      <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                        {filteredViradas.map((v) => {
                          const dateObj = new Date(v.createdAt);
                          const time = dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                          const date = dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
                          const isDeleting = deletingId === v.id;
                          const isConfirming = confirmDeleteId === v.id;
                          
                          return (
                            <div key={v.id} className="flex items-center justify-between px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex size-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                  <TrendingUp className="size-4" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold text-zinc-900">
                                    {v.collaboratorName}
                                  </span>
                                  <span className="text-xs text-zinc-500">
                                    {monthKey ? `${date} às ${time}` : `Às ${time}`}
                                  </span>
                                </div>
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
                                        onClick={() => handleDelete(v.id)}
                                        disabled={isDeleting}
                                        className="rounded-lg bg-rose-500 px-2 py-1 text-xs font-bold text-white hover:bg-rose-600 transition disabled:opacity-50"
                                      >
                                        {isDeleting ? <Loader2 className="size-3 animate-spin" /> : "Confirmar"}
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => setConfirmDeleteId(v.id)}
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
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
