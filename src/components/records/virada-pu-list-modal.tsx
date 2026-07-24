"use client";

import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TrendingUp, X } from "lucide-react";
import { useRecords } from "@/components/providers/records-provider";
import type { ViradaPu } from "@/lib/records/viradas-pu-repository";

export function ViradaPuListModal({
  open,
  onClose,
  dateKey,
}: {
  open: boolean;
  onClose: () => void;
  dateKey: string;
}) {
  const { viradasPu, isLoading } = useRecords();

  // Aggregate scores for the specific dateKey
  const rankings = useMemo(() => {
    if (!viradasPu) return [];
    
    // Filter for the date
    const dateViradas = viradasPu.filter(v => v.dateKey === dateKey);

    // Group by collaborator
    const scoresMap = new Map<string, { id: string, name: string, score: number }>();
    
    dateViradas.forEach(v => {
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
    return sorted;
  }, [viradasPu, dateKey]);

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
                    Ranking de Viradas de PU do dia
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
              <div className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                  <div className="text-center text-sm text-zinc-500 py-4">Carregando...</div>
                ) : rankings.length === 0 ? (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center">
                    <TrendingUp className="mx-auto mb-2 size-8 text-zinc-400" />
                    <p className="text-sm font-medium text-zinc-900">
                      Nenhuma virada de PU registrada hoje.
                    </p>
                  </div>
                ) : (
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
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
