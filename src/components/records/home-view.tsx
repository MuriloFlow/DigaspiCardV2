"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CreditCard, RefreshCw, TrendingUp, Users, Building, Target, Bug } from "lucide-react";
import { OperatorPieChart } from "@/components/charts/operator-pie-chart";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { useRecords } from "@/components/providers/records-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { MetricCard } from "@/components/ui/metric-card";
import { AddRecordModal } from "./add-record-modal";
import { RecordCard } from "./record-card";
import {
  aggregateByOperator,
  aggregateByStore,
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
  const { user } = useAuth();
  const isGlobalAdmin = user?.role === "GLOBAL_ADMIN";
  const [modalOpen, setModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [manualGoal, setManualGoal] = useState<number | null>(null);

  // Lógica de Reset às 00:00: Filtrar apenas registros de hoje para o gráfico
  const todayKey = toDateKey(new Date().toISOString());
  const todayRecords = useMemo(() => records.filter(r => toDateKey(r.createdAt) === todayKey), [records, todayKey]);
  const todayOperators = useMemo(() => {
    return isGlobalAdmin ? aggregateByStore(todayRecords) : aggregateByOperator(todayRecords);
  }, [todayRecords, isGlobalAdmin]);
  const todayCardsCount = todayRecords.length;

  useEffect(() => {
    fetch(`/api/goals?date=${todayKey}`)
      .then(res => res.json())
      .then(data => {
        if (typeof data.goal === "number") {
          setManualGoal(data.goal);
        } else {
          setManualGoal(null);
        }
      })
      .catch(() => setManualGoal(null));
  }, [todayKey]);

  const dailyGoal = useMemo(() => {
    // Para Admin Global, a meta base é a soma da meta de cada loja existente
    const storeCount = isGlobalAdmin 
      ? Math.max(1, new Set(records.map(r => r.storeName).filter(Boolean)).size)
      : 1;

    const day = new Date().getDay(); // 0 = Domingo, 1 = Segunda, ..., 5 = Sexta, 6 = Sábado
    let baseGoal = 12 * storeCount; // Padrão: Domingo a Quinta
    if (day === 5) baseGoal = 15 * storeCount; // Sexta-feira
    if (day === 6) baseGoal = 30 * storeCount; // Sábado

    if (records.length === 0) return baseGoal;

    // Pega a data do registro mais antigo e calcula os dias totais de uso do sistema
    const oldestDate = new Date(records[records.length - 1].createdAt);
    const msDiff = Date.now() - oldestDate.getTime();
    const daysSinceFirst = Math.max(1, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
    
    // Se for sistema novo (menos de 7 dias de histórico), usamos puramente a meta do dia
    if (daysSinceFirst <= 7) {
      return baseGoal;
    }

    // Média diária do período todo + 15% de meta de crescimento
    const avgDaily = records.length / daysSinceFirst;
    const dynamicGoal = Math.max(1, Math.ceil(avgDaily * 1.15));

    // A meta nunca pode ser inferior à meta padrão daquele dia
    return Math.max(baseGoal, dynamicGoal);
  }, [records]);

  const finalGoal = manualGoal ?? dailyGoal;
  const recentRecords = useMemo(() => getRecentRecords(records, 5), [records]);

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
        eyebrow={isGlobalAdmin ? "Visão Consolidada da Rede" : "Painel operacional"}
        title={isGlobalAdmin ? "Dashboard Global" : "Performance de operadores"}
        description={isGlobalAdmin
          ? "Visão agregada de todos os cartões da rede. Para registrar cartões, acesse uma unidade específica."
          : "Registros, valores e ranking em uma interface limpa para acompanhamento diario."
        }
      />

      {isGlobalAdmin && (
        <div className="mb-6 flex items-center gap-3 rounded-[1.5rem] bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
          <Building className="size-4 shrink-0" />
          <span>Você está no painel de <strong>Administrador Global</strong>. O registro de cartões é feito pelos operadores de cada unidade.</span>
        </div>
      )}

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
            label="Meta do Dia"
            value={`${formatInteger(todayCardsCount)} / ${formatInteger(finalGoal)}`}
            detail={todayCardsCount >= finalGoal ? "Meta atingida! 🎉" : `${Math.round((todayCardsCount / finalGoal) * 100)}% concluída`}
            icon={Target}
            tone={todayCardsCount >= finalGoal ? "green" : "blue"}
          />
          <MetricCard
            label="Valor total da rede"
            value={formatCurrency(summary.totalAmountInCents)}
            detail="Volume histórico"
            icon={CreditCard}
            tone="dark"
          />
          <MetricCard
            label={isGlobalAdmin ? "Loja Destaque" : "Líder Atual"}
            value={summary.topOperator?.operatorName ?? "Sem dados"}
            detail={
              summary.topOperator
                ? `${formatInteger(summary.topOperator.count)} cartões`
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

      {!isGlobalAdmin && (
        <>
          <FloatingActionButton onClick={() => setModalOpen(true)} />
          <AddRecordModal
            open={modalOpen}
            isSubmitting={isCreating}
            onClose={() => setModalOpen(false)}
            onCreate={createRecord}
            onCreated={(record) => showSuccess(record.operatorName)}
          />
        </>
      )}
    </PageContainer>
  );
}
