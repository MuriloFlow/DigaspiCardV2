"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CreditCard, RefreshCw, TrendingUp, Users } from "lucide-react";
import { OperatorPieChart } from "@/components/charts/operator-pie-chart";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { useRecords } from "@/components/providers/records-provider";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { MetricCard } from "@/components/ui/metric-card";
import { AddRecordModal } from "./add-record-modal";
import { RecordCard } from "./record-card";
import {
  aggregateByOperator,
  getRecentRecords,
} from "@/lib/records/domain";
import { formatCurrency, formatInteger, toDateKey } from "@/lib/utils/format";

export function HomeView() {
  const {
    records,
    summary,
    isLoading,
    isCreating,
    error,
    refresh,
    createRecord,
  } = useRecords();
  const [modalOpen, setModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Lógica de Reset às 00:00: Filtrar apenas registros de hoje para o gráfico
  const todayKey = toDateKey(new Date().toISOString());
  const todayRecords = useMemo(() => records.filter(r => toDateKey(r.createdAt) === todayKey), [records, todayKey]);
  const todayOperators = useMemo(() => aggregateByOperator(todayRecords), [todayRecords]);
  const todayCardsCount = todayRecords.length;

  const recentRecords = useMemo(() => getRecentRecords(records, 6), [records]);

  function showSuccess(operatorName: string) {
    setSuccessMessage(`Registro de ${operatorName} salvo.`);
    window.setTimeout(() => setSuccessMessage(null), 2600);
  }

  if (isLoading) {
    return (
      <PageContainer>
        <DashboardSkeleton />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Painel operacional"
        title="Performance de operadores"
        description="Registros, valores e ranking em uma interface limpa para acompanhamento diario."
      />

      {error ? (
        <div className="mb-5 flex flex-col gap-3 rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-3 py-2 text-rose-700 shadow-sm transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Atualizar
          </button>
        </div>
      ) : null}

      <AnimatePresence>
        {successMessage ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-5 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
          >
            {successMessage}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-stretch">
        <OperatorPieChart
          operators={todayOperators}
          centerLabel="Hoje"
          centerValue={formatInteger(todayCardsCount)}
          className="min-h-[420px]"
        />

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <MetricCard
            label="Valor total"
            value={formatCurrency(summary.totalAmountInCents)}
            detail="Volume histórico"
            icon={CreditCard}
            tone="dark"
          />
          <MetricCard
            label="Operadores"
            value={formatInteger(summary.operatorCount)}
            detail="Com registros ativos"
            icon={Users}
            tone="blue"
          />
          <MetricCard
            label="Lider atual"
            value={summary.topOperator?.operatorName ?? "Sem dados"}
            detail={
              summary.topOperator
                ? `${formatInteger(summary.topOperator.count)} cartoes`
                : "Aguardando registros"
            }
            icon={TrendingUp}
            tone="green"
          />
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500">
              Atividade
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-950">
              Registros recentes
            </h2>
          </div>
          <span className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-500">
            {formatInteger(recentRecords.length)}
          </span>
        </div>

        {recentRecords.length ? (
          <div className="grid gap-3">
            {recentRecords.map((record, index) => (
              <RecordCard key={record.id} record={record} index={index} />
            ))}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-white px-5 py-10 text-center text-sm font-medium text-zinc-500">
            Nenhum registro encontrado.
          </div>
        )}
      </section>

      <FloatingActionButton onClick={() => setModalOpen(true)} />

      <AddRecordModal
        open={modalOpen}
        isSubmitting={isCreating}
        onClose={() => setModalOpen(false)}
        onCreate={createRecord}
        onCreated={(record) => showSuccess(record.operatorName)}
      />
    </PageContainer>
  );
}
