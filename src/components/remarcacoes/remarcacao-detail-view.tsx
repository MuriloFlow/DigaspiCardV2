"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  History,
  Maximize2,
  Search,
  User,
  X,
  ZoomIn,
  Plus,
  Trash2,
  Unlock,
  Package,
} from "lucide-react";
import Link from "next/link";
import type { Remarcacao, RemarcacaoHistorico } from "@/lib/remarcacoes/types";
import {
  REMARCACAO_STATUS_COLOR,
  REMARCACAO_STATUS_LABEL,
  HISTORICO_ACTION_LABEL,
  formatSavingPercent,
} from "@/lib/remarcacoes/domain";
import { formatCurrency, formatTime } from "@/lib/utils/format";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/components/providers/auth-provider";
import { useRemarcacoes } from "@/components/providers/remarcacoes-provider";
import { useRouter } from "next/navigation";
import { NewRemarcacaoFlow } from "./new-remarcacao-flow";

type RemarcacaoDetailViewProps = {
  remarcacao: Remarcacao;
  historico: RemarcacaoHistorico[];
};

export function RemarcacaoDetailView({ remarcacao: initialRemarcacao, historico }: RemarcacaoDetailViewProps) {
  const { user } = useAuth();
  const { deleteRemarcacao, reopenRemarcacao, remarcacoes } = useRemarcacoes();
  const router = useRouter();

  const remarcacao = remarcacoes.find((r) => r.id === initialRemarcacao.id) ?? initialRemarcacao;

  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFlowOpen, setIsFlowOpen] = useState(false);

  const isAdminOrManager = ["MANAGER", "REGIONAL_MANAGER", "TI_ADMIN", "GLOBAL_ADMIN"].includes(user?.role ?? "");
  const canReopen = isAdminOrManager && (remarcacao.status === "completed" || remarcacao.status === "pending_approval");
  const canDelete = ["REGIONAL_MANAGER", "TI_ADMIN", "GLOBAL_ADMIN"].includes(user?.role ?? "");
  const canEdit = remarcacao.status === "draft" || remarcacao.status === "pending_approval";

  const statusColor = REMARCACAO_STATUS_COLOR[remarcacao.status];
  const statusLabel = REMARCACAO_STATUS_LABEL[remarcacao.status];

  const formatFullDate = (iso: string) =>
    format(parseISO(iso), "d 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR });

  const filteredItens = useMemo(() => {
    if (!remarcacao.itens) return [];
    if (!searchQuery) return remarcacao.itens;
    const q = searchQuery.toLowerCase();
    return remarcacao.itens.filter(i => i.barcode.toLowerCase().includes(q) || (i.internalCode && i.internalCode.toLowerCase().includes(q)));
  }, [remarcacao.itens, searchQuery]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-32 pt-6 sm:px-6 sm:pt-8">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/remarcacao"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-zinc-900"
        >
          <ArrowLeft className="size-4" />
          Voltar para Lotes
        </Link>

        {/* Ações de Admin/Manager */}
        <div className="flex items-center gap-3">
          {canReopen && (
            <button
              onClick={async () => {
                if (!confirm("Tem certeza que deseja reabrir este lote para edição? A assinatura atual será removida e o operador poderá adicionar mais itens.")) return;
                setIsReopening(true);
                try {
                  await reopenRemarcacao(remarcacao.id);
                  alert("Lote reaberto. Você ou o operador já podem editá-lo.");
                } catch (err: any) {
                  alert(err.message);
                } finally {
                  setIsReopening(false);
                }
              }}
              disabled={isReopening}
              className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
            >
              <Unlock className="size-3.5" />
              {isReopening ? "Reabrindo..." : "Reabrir Lote"}
            </button>
          )}

          {canDelete && (
            <button
              onClick={async () => {
                if (!confirm("Tem certeza que deseja EXCLUIR PERMANENTEMENTE este lote inteiro?")) return;
                setIsDeleting(true);
                try {
                  await deleteRemarcacao(remarcacao.id);
                  router.push("/remarcacao");
                } catch (err: any) {
                  alert(err.message);
                  setIsDeleting(false);
                }
              }}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
              {isDeleting ? "Excluindo..." : "Excluir Lote"}
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Lote de Remarcação
            </p>
            <h1 className="text-3xl font-bold text-zinc-950">
              #{remarcacao.id.split("-")[0].toUpperCase()}
            </h1>
            <p className="mt-1 text-sm font-medium text-zinc-500">
              {remarcacao.itens?.length || 0} {(remarcacao.itens?.length === 1) ? "item remarcado" : "itens remarcados"}
            </p>
          </div>
          <span
            className={`mt-2 rounded-full px-3 py-1.5 text-xs font-bold ${statusColor.bg} ${statusColor.text}`}
          >
            {statusLabel}
          </span>
        </div>
      </motion.div>

      <div className="grid gap-4">
        {/* Pesquisa e Lista de Itens */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-col gap-4"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm focus-within:border-zinc-400">
            <Search className="size-5 shrink-0 text-zinc-400" />
            <input
              type="text"
              placeholder="Pesquisar por código de barras no lote..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-zinc-400 hover:text-zinc-600">
                <X className="size-4" />
              </button>
            )}
          </div>

          {filteredItens.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-zinc-200 bg-zinc-50 py-12 text-center">
              <Package className="mb-3 size-10 text-zinc-300" />
              <p className="text-sm font-medium text-zinc-600">Nenhum item encontrado.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredItens.map((item) => (
                <div key={item.id} className="group relative flex overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:border-zinc-300 hover:shadow-sm">
                  {/* Info Esquerda */}
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <p className="font-mono text-xs font-bold text-zinc-900 tracking-wider">
                        {item.barcode}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <p className="text-xs font-semibold text-zinc-400 line-through">
                          {formatCurrency(item.originalValueCents)}
                        </p>
                        <p className="text-sm font-bold text-emerald-600">
                          {formatCurrency(item.remarkedValueCents)}
                        </p>
                      </div>
                    </div>
                    {item.notes && (
                      <p className="mt-2 text-[10px] leading-tight text-zinc-500 line-clamp-2">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Foto Direita */}
                  {item.labelPhotoB64 && (
                    <button 
                      onClick={() => setSelectedPhotoUrl(item.labelPhotoB64)}
                      className="relative w-24 shrink-0 overflow-hidden bg-zinc-100"
                    >
                      <img
                        src={item.labelPhotoB64}
                        alt={`Foto etiqueta ${item.barcode}`}
                        className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                        <Maximize2 className="size-5 text-white opacity-0 transition group-hover:opacity-100" />
                      </div>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Responsáveis */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="overflow-hidden rounded-[1.5rem] border border-zinc-200/80 bg-white shadow-[0_14px_42px_rgba(15,23,42,0.05)] mt-4"
        >
          <div className="divide-y divide-zinc-100 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Responsáveis
            </p>

            {/* Operador */}
            <div className="flex items-center gap-3 py-3 first:pt-0">
              <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-100">
                <User className="size-4 text-zinc-500" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Operador</p>
                <p className="font-semibold text-zinc-900">{remarcacao.operatorName}</p>
              </div>
            </div>

            {/* Gerente */}
            {remarcacao.managerName && (
              <div className="flex items-center gap-3 py-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-blue-100">
                  <CheckCircle2 className="size-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Gerente Aprovador</p>
                  <p className="font-semibold text-zinc-900">{remarcacao.managerName}</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Datas */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="overflow-hidden rounded-[1.5rem] border border-zinc-200/80 bg-white shadow-[0_14px_42px_rgba(15,23,42,0.05)]"
        >
          <div className="divide-y divide-zinc-100 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Datas
            </p>
            <div className="flex items-center gap-3 py-3 first:pt-0">
              <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-100">
                <Calendar className="size-4 text-zinc-500" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Criada em</p>
                <p className="font-semibold text-zinc-900">{formatFullDate(remarcacao.createdAt)}</p>
              </div>
            </div>
            {remarcacao.completedAt && (
              <div className="flex items-center gap-3 py-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-100">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Concluída em</p>
                  <p className="font-semibold text-zinc-900">{formatFullDate(remarcacao.completedAt)}</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Assinatura do gerente */}
        {remarcacao.managerSignatureB64 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="overflow-hidden rounded-[1.5rem] border border-zinc-200/80 bg-white shadow-[0_14px_42px_rgba(15,23,42,0.05)]"
          >
            <div className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Assinatura do Gerente
                </p>
                <button
                  type="button"
                  onClick={() => setSignatureModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50"
                >
                  <ZoomIn className="size-3.5" />
                  Ver em tela cheia
                </button>
              </div>
              <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50 p-2">
                <img
                  src={remarcacao.managerSignatureB64}
                  alt={`Assinatura de ${remarcacao.managerName}`}
                  className="h-28 w-full object-contain mix-blend-multiply"
                />
              </div>
              {remarcacao.managerName && (
                <p className="mt-2 text-center text-xs font-medium text-zinc-500">
                  {remarcacao.managerName}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Histórico */}
        {historico.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="overflow-hidden rounded-[1.5rem] border border-zinc-200/80 bg-white shadow-[0_14px_42px_rgba(15,23,42,0.05)]"
          >
            <div className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <History className="size-4 text-zinc-400" />
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Histórico de Alterações
                </p>
              </div>
              <div className="relative mt-4">
                {/* Linha vertical */}
                <div className="absolute left-3.5 top-0 bottom-0 w-px bg-zinc-100" />
                <div className="space-y-4">
                  {historico.map((entry, i) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.04 }}
                      className="flex items-start gap-3 pl-8 relative"
                    >
                      {/* Dot */}
                      <div className="absolute left-2 top-1 size-3 rounded-full border-2 border-zinc-300 bg-white" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-800">
                          {HISTORICO_ACTION_LABEL[entry.action] ?? entry.action}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {entry.changedByName} · {formatTime(entry.createdAt)}
                        </p>
                        {entry.newValue && entry.action === "added_item" && (
                          <p className="mt-1 text-xs font-mono bg-zinc-100 inline-block px-2 py-0.5 rounded text-zinc-600">{entry.newValue}</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* FAB para Adicionar mais itens ao Lote */}
      <AnimatePresence>
        {canEdit && !isFlowOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-24 right-4 z-40 sm:bottom-8 sm:right-8"
          >
            <button
              onClick={() => setIsFlowOpen(true)}
              className="group flex size-14 items-center justify-center rounded-full bg-amber-400 text-black shadow-xl shadow-amber-400/20 transition hover:bg-amber-500 hover:scale-105 active:scale-95"
            >
              <Plus className="size-6 transition group-hover:rotate-90" strokeWidth={2.5} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <NewRemarcacaoFlow 
        open={isFlowOpen} 
        onClose={() => setIsFlowOpen(false)} 
        initialBatchId={remarcacao.id} 
        onCreated={() => setIsFlowOpen(false)}
      />

      {/* Modal de foto individual (tela cheia) */}
      <AnimatePresence>
        {selectedPhotoUrl && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhotoUrl(null)}
          >
            <button
              type="button"
              className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white"
              onClick={() => setSelectedPhotoUrl(null)}
            >
              <X className="size-5" />
            </button>
            <motion.img
              src={selectedPhotoUrl}
              alt="Etiqueta Ampliada"
              className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de assinatura (tela cheia) */}
      <AnimatePresence>
        {signatureModalOpen && remarcacao.managerSignatureB64 && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSignatureModalOpen(false)}
          >
            <button
              type="button"
              className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-900"
              onClick={() => setSignatureModalOpen(false)}
            >
              <X className="size-5" />
            </button>
            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-zinc-200">
                <img
                  src={remarcacao.managerSignatureB64}
                  alt="Assinatura"
                  className="max-h-64 max-w-[80vw] object-contain mix-blend-multiply"
                />
              </div>
              {remarcacao.managerName && (
                <p className="text-sm font-semibold text-zinc-600">
                  Assinado por {remarcacao.managerName}
                  {remarcacao.completedAt && ` · ${formatFullDate(remarcacao.completedAt)}`}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
