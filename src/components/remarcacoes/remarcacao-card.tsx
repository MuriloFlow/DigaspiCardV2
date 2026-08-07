"use client";

import { motion } from "motion/react";
import { Tag, Timer, ChevronRight, User } from "lucide-react";
import type { Remarcacao } from "@/lib/remarcacoes/types";
import {
  REMARCACAO_STATUS_COLOR,
  REMARCACAO_STATUS_LABEL,
  formatSavingPercent,
} from "@/lib/remarcacoes/domain";
import { formatCurrency, formatTime } from "@/lib/utils/format";
import { getOperatorColor } from "@/lib/records/colors";
import Link from "next/link";

export function RemarcacaoCard({
  remarcacao,
  index = 0,
}: {
  remarcacao: Remarcacao;
  index?: number;
}) {
  const color = getOperatorColor(remarcacao.operatorName, index);
  const statusColor = REMARCACAO_STATUS_COLOR[remarcacao.status];
  const statusLabel = REMARCACAO_STATUS_LABEL[remarcacao.status];

  const savingPct = formatSavingPercent(
    remarcacao.originalValueCents,
    remarcacao.remarkedValueCents,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.035, 0.18) }}
    >
      <Link
        href={`/remarcacao/${remarcacao.id}`}
        className="group relative flex items-center gap-4 overflow-hidden rounded-[1.5rem] border border-zinc-200/80 bg-white p-4 shadow-[0_14px_42px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_20px_54px_rgba(15,23,42,0.08)]"
      >
        {/* Avatar com inicial do operador */}
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-[0_12px_26px_rgba(15,23,42,0.12)]"
          style={{ backgroundColor: color }}
        >
          {remarcacao.operatorName.slice(0, 1).toUpperCase()}
        </div>

        {/* Conteúdo */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 truncate text-sm font-semibold text-zinc-950">
                <User className="size-3.5 shrink-0 text-zinc-400" />
                {remarcacao.operatorName}
              </h3>
              {remarcacao.barcode && (
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-zinc-500">
                  <Tag className="size-3 shrink-0" />
                  {remarcacao.barcode}
                </p>
              )}
            </div>

            {/* Valores */}
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              {remarcacao.remarkedValueCents != null && (
                <p className="text-sm font-bold text-zinc-950">
                  {formatCurrency(remarcacao.remarkedValueCents)}
                </p>
              )}
              {remarcacao.originalValueCents != null && (
                <p className="text-xs text-zinc-400 line-through">
                  {formatCurrency(remarcacao.originalValueCents)}
                </p>
              )}
              {savingPct && (
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  {savingPct}
                </span>
              )}
            </div>
          </div>

          {/* Rodapé do card */}
          <div className="mt-3 flex items-center gap-3 text-xs font-medium text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <Timer className="size-3.5" />
              {formatTime(remarcacao.createdAt)}
            </span>

            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor.bg} ${statusColor.text}`}
            >
              {statusLabel}
            </span>

            {remarcacao.managerName && (
              <span className="truncate text-zinc-400">
                Ger: {remarcacao.managerName}
              </span>
            )}
          </div>
        </div>

        {/* Seta de navegação */}
        <ChevronRight className="size-4 shrink-0 text-zinc-300 transition duration-200 group-hover:text-zinc-500" />
      </Link>
    </motion.div>
  );
}
