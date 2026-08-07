"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Tag, Calendar, User, CheckCircle2, SearchX } from "lucide-react";
import type { Remarcacao, RemarcacaoItem } from "@/lib/remarcacoes/types";
import { formatCurrency, formatTime } from "@/lib/utils/format";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type BarcodeHistoryModalProps = {
  barcode: string | null;
  remarcacoes: Remarcacao[]; // Todos os lotes disponíveis localmente
  onClose: () => void;
};

type HistoryEntry = {
  item: RemarcacaoItem;
  remarcacao: Remarcacao;
};

export function BarcodeHistoryModal({ barcode, remarcacoes, onClose }: BarcodeHistoryModalProps) {
  
  const entries = useMemo(() => {
    if (!barcode) return [];
    
    const found: HistoryEntry[] = [];
    
    // Procura o barcode em todos os itens de todos os lotes
    for (const r of remarcacoes) {
      if (r.itens) {
        for (const item of r.itens) {
          if (item.barcode.toLowerCase() === barcode.toLowerCase()) {
            found.push({ item, remarcacao: r });
          }
        }
      }
    }
    
    // Ordena do mais recente para o mais antigo (pela data do item)
    return found.sort((a, b) => new Date(b.item.createdAt).getTime() - new Date(a.item.createdAt).getTime());
  }, [barcode, remarcacoes]);

  if (!barcode) return null;

  const formatFullDate = (iso: string) =>
    format(parseISO(iso), "d 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-full max-w-md flex flex-col max-h-[85vh] rounded-[2rem] bg-white shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Histórico da Peça
              </p>
              <h2 className="text-xl font-bold font-mono text-zinc-950 mt-1">
                {barcode}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="flex size-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-900"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <SearchX className="mb-3 size-12 text-zinc-300" />
                <p className="text-lg font-bold text-zinc-800">Peça não registrada</p>
                <p className="mt-2 text-sm text-zinc-500">
                  Nenhum registro de remarcação encontrado para este código de barras no sistema.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Última remarcação (Mais recente) */}
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-2">
                    <CheckCircle2 className="size-4" />
                    Última Remarcação
                  </p>
                  
                  <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/30 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          {entries[0].remarcacao.operatorName}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 flex items-center gap-1.5">
                          <Calendar className="size-3" />
                          {formatFullDate(entries[0].item.createdAt)}
                        </p>
                      </div>
                      
                      {entries[0].item.labelPhotoB64 && (
                        <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden border border-zinc-200">
                          <img src={entries[0].item.labelPhotoB64} alt="Foto" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between rounded-xl bg-white p-3 border border-emerald-100 shadow-sm">
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-zinc-400">Era</p>
                        <p className="text-sm font-bold text-zinc-400 line-through">{formatCurrency(entries[0].item.originalValueCents)}</p>
                      </div>
                      <div className="h-6 w-px bg-zinc-200" />
                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase text-emerald-600">Agora</p>
                        <p className="text-sm font-bold text-emerald-600">{formatCurrency(entries[0].item.remarkedValueCents)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Histórico Anterior */}
                {entries.length > 1 && (
                  <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Remarcações Anteriores
                    </p>
                    <div className="space-y-3">
                      {entries.slice(1).map((entry, idx) => (
                        <div key={entry.item.id + idx} className="rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300">
                           <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-2">
                               <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-100">
                                 <User className="size-3.5 text-zinc-500" />
                               </div>
                               <p className="text-sm font-medium text-zinc-800">{entry.remarcacao.operatorName}</p>
                             </div>
                             <p className="text-xs text-zinc-400">{formatFullDate(entry.item.createdAt)}</p>
                           </div>
                           
                           <div className="flex items-center gap-4 text-xs font-medium pl-9">
                             <span className="text-zinc-400 line-through">{formatCurrency(entry.item.originalValueCents)}</span>
                             <span className="text-zinc-300">→</span>
                             <span className="text-zinc-700">{formatCurrency(entry.item.remarkedValueCents)}</span>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="border-t border-zinc-100 p-4">
            <button
              onClick={onClose}
              className="w-full flex h-12 items-center justify-center gap-2 rounded-xl bg-zinc-950 font-bold text-white shadow-md transition hover:bg-zinc-800"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
