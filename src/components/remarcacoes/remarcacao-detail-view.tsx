"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  History,
  Maximize2,
  Tag,
  User,
  X,
  ZoomIn,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
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

type RemarcacaoDetailViewProps = {
  remarcacao: Remarcacao;
  historico: RemarcacaoHistorico[];
};

export function RemarcacaoDetailView({ remarcacao, historico }: RemarcacaoDetailViewProps) {
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  const statusColor = REMARCACAO_STATUS_COLOR[remarcacao.status];
  const statusLabel = REMARCACAO_STATUS_LABEL[remarcacao.status];
  const savingPct = formatSavingPercent(
    remarcacao.originalValueCents,
    remarcacao.remarkedValueCents,
  );

  // A foto e assinatura ficam como base64 (data:image/...) — exibidas direto no <img>

  const formatFullDate = (iso: string) =>
    format(parseISO(iso), "d 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-32 pt-6 sm:px-6 sm:pt-8">
      {/* Back */}
      <Link
        href="/remarcacao"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-zinc-900"
      >
        <ArrowLeft className="size-4" />
        Voltar para Remarcações
      </Link>

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
              Remarcação
            </p>
            <h1 className="text-3xl font-bold text-zinc-950">
              {remarcacao.barcode ?? "Sem código"}
            </h1>
          </div>
          <span
            className={`mt-2 rounded-full px-3 py-1.5 text-xs font-bold ${statusColor.bg} ${statusColor.text}`}
          >
            {statusLabel}
          </span>
        </div>
      </motion.div>

      <div className="grid gap-4">
        {/* Foto da etiqueta */}
        {remarcacao.labelPhotoB64 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-zinc-50"
          >
            <div className="relative">
              <img
                src={remarcacao.labelPhotoB64}
                alt="Foto da etiqueta"
                className="h-48 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setPhotoModalOpen(true)}
                className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
              >
                <Maximize2 className="size-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-4 py-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Camera className="size-3.5" />
                  Foto da Etiqueta
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Informações principais */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="overflow-hidden rounded-[1.5rem] border border-zinc-200/80 bg-white shadow-[0_14px_42px_rgba(15,23,42,0.05)]"
        >
          <div className="p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Valores
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-500">Valor Original</p>
                <p className="mt-1 text-xl font-bold text-zinc-400 line-through">
                  {remarcacao.originalValueCents != null
                    ? formatCurrency(remarcacao.originalValueCents)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Valor Remarcado</p>
                <p className="mt-1 text-xl font-bold text-zinc-950">
                  {remarcacao.remarkedValueCents != null
                    ? formatCurrency(remarcacao.remarkedValueCents)
                    : "—"}
                </p>
              </div>
            </div>
            {savingPct && (
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-bold text-emerald-700">
                  {savingPct}
                </span>
                <span className="text-sm text-zinc-500">de diferença</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Responsáveis */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="overflow-hidden rounded-[1.5rem] border border-zinc-200/80 bg-white shadow-[0_14px_42px_rgba(15,23,42,0.05)]"
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

        {/* Observações */}
        {remarcacao.notes && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="overflow-hidden rounded-[1.5rem] border border-zinc-200/80 bg-white p-5 shadow-[0_14px_42px_rgba(15,23,42,0.05)]"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Observações
            </p>
            <p className="text-sm text-zinc-700 leading-relaxed">{remarcacao.notes}</p>
          </motion.div>
        )}

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
                  className="h-28 w-full object-contain"
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
              <div className="relative">
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
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Modal de foto (tela cheia) */}
      <AnimatePresence>
        {photoModalOpen && remarcacao.labelPhotoB64 && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPhotoModalOpen(false)}
          >
            <button
              type="button"
              className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white"
              onClick={() => setPhotoModalOpen(false)}
            >
              <X className="size-5" />
            </button>
            <motion.img
              src={remarcacao.labelPhotoB64}
              alt="Etiqueta"
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
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSignatureModalOpen(false)}
          >
            <button
              type="button"
              className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white"
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
              <div className="overflow-hidden rounded-3xl bg-white p-6 shadow-2xl">
                <img
                  src={remarcacao.managerSignatureB64}
                  alt="Assinatura"
                  className="max-h-64 max-w-[80vw] object-contain"
                />
              </div>
              {remarcacao.managerName && (
                <p className="text-sm font-semibold text-white/70">
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
