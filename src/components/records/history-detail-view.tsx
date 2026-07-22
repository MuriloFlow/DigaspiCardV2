"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, ListChecks, Users } from "lucide-react";
import { OperatorPieChart } from "@/components/charts/operator-pie-chart";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { useRecords } from "@/components/providers/records-provider";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/ui/metric-card";
import { getDateGroup } from "@/lib/records/domain";
import { formatCurrency, formatInteger } from "@/lib/utils/format";
import { RecordCard } from "./record-card";
import { useAuth } from "@/components/providers/auth-provider";
import { DailyCustomersModal } from "./daily-customers-modal";
import { useState } from "react";
import { DailyMetricsModal } from "./daily-metrics-modal";
import { DigitacoesListModal } from "./digitacoes-list-modal";
import { Activity, Keyboard } from "lucide-react";

export function HistoryDetailView({ dateKey }: { dateKey: string }) {
  const { user } = useAuth();
  const { records, digitacoes, dailyMetrics, isLoading } = useRecords();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [metricsModalOpen, setMetricsModalOpen] = useState(false);
  const [digitacoesModalOpen, setDigitacoesModalOpen] = useState(false);
  const group = useMemo(
    () => getDateGroup(records, dateKey),
    [dateKey, records],
  );

  if (isLoading) {
    return (
      <PageContainer>
        <DashboardSkeleton />
      </PageContainer>
    );
  }

  if (!group) {
    return (
      <PageContainer>
        <Link
          href="/historico"
          className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/15"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar
        </Link>
        <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
          <h1 className="text-2xl font-semibold text-zinc-950">
            Data nao encontrada
          </h1>
          <p className="mt-3 text-sm text-zinc-500">
            Nenhum registro foi localizado para este periodo.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link
        href="/historico"
        className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/15"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Voltar
      </Link>

      <PageHeader
        eyebrow={group.relativeLabel}
        title={group.label}
        description="Participacao percentual, volume e valor por operador no dia selecionado."
      >
        <div className="flex flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0">
          {(user?.role === "MANAGER" || user?.role === "GLOBAL_ADMIN") && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="group flex w-full sm:w-auto justify-center h-11 items-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-950/20"
            >
              <Users className="size-4" />
              Total de Clientes
            </button>
          )}
          <button
            onClick={() => setMetricsModalOpen(true)}
            className="group flex w-full sm:w-auto justify-center h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-950/10"
          >
            <Activity className="size-4 text-emerald-500" />
            Ver métricas
          </button>
          <button
            onClick={() => setDigitacoesModalOpen(true)}
            className="group flex w-full sm:w-auto justify-center h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-950/10"
          >
            <Keyboard className="size-4 text-purple-500" />
            Digitações
          </button>
        </div>
      </PageHeader>

      <DailyCustomersModal 
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        dateKey={dateKey}
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <OperatorPieChart
          operators={group.operators}
          centerLabel="Cartoes"
          centerValue={formatInteger(group.count)}
          className="min-h-[420px]"
        />

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <MetricCard
            label="Valor do dia"
            value={formatCurrency(group.totalInCents)}
            detail="Soma dos registros"
            icon={CreditCard}
            tone="dark"
          />
          <MetricCard
            label="Operadores"
            value={formatInteger(group.operators.length)}
            detail="Ativos no periodo"
            icon={Users}
            tone="blue"
          />
          <MetricCard
            label="Registros"
            value={formatInteger(group.count)}
            detail="Cartoes cadastrados"
            icon={ListChecks}
            tone="green"
          />
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase text-zinc-500">
              Timeline
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-950">
              Cartoes do dia
            </h2>
          </div>

          <div className="grid gap-3">
            {group.records.map((record, index) => (
              <RecordCard key={record.id} record={record} index={index} />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase text-zinc-500">
              Operadores
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-950">
              Resultado do dia
            </h2>
          </div>

          <div className="grid gap-3">
            {group.operators.map((operator) => (
              <article
                key={operator.operatorName}
                className="rounded-[1.5rem] border border-zinc-200/80 bg-white p-4 shadow-[0_14px_42px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: operator.color }}
                      />
                      <h3 className="truncate text-base font-semibold text-zinc-950">
                        {operator.operatorName}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm text-zinc-500">
                      {formatInteger(operator.count)} cartoes registrados
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-base font-semibold text-zinc-950">
                      {formatInteger(operator.count)} {operator.count === 1 ? 'cartão' : 'cartões'}
                    </p>
                    <p className="mt-1 text-sm font-medium text-zinc-500">
                      {operator.percentage.toFixed(0)}%
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${operator.percentage}%`,
                      backgroundColor: operator.color,
                    }}
                  />
                </div>
                <p className="mt-3 text-xs font-medium text-zinc-500">
                  Media por cartao: {formatCurrency(operator.averageInCents)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
      
      {(() => {
        const dailyDigs = digitacoes.filter(d => d.createdAt.startsWith(dateKey));
        const dailyTotalClientes = dailyMetrics.find(m => m.dateKey === dateKey)?.totalCustomers || 0;
        
        const totalCartoes = group.count;
        const totalDigitacoes = dailyDigs.length;
        
        const taxaAproveitamento = dailyTotalClientes > 0 ? ((totalCartoes + totalDigitacoes) / dailyTotalClientes) * 100 : 0;
        const taxaAprovacao = (totalCartoes + totalDigitacoes) > 0 ? (totalCartoes / (totalCartoes + totalDigitacoes)) * 100 : 0;
        const activeCount = group.records.filter(r => r.activated).length;
        const activeLaterCount = group.records.filter(r => r.activatedLater).length;
        const cartoesAtivosPerc = totalCartoes > 0 ? (activeCount / totalCartoes) * 100 : 0;
        const ativosNoCaixaPerc = totalCartoes > 0 ? (activeLaterCount / totalCartoes) * 100 : 0;
        const ticketMedio = totalCartoes > 0 ? group.totalInCents / totalCartoes : 0;
        
        return (
          <>
            <DailyMetricsModal
              open={metricsModalOpen}
              onClose={() => setMetricsModalOpen(false)}
              dateLabel={group.label}
              totalCartoes={totalCartoes}
              totalDigitacoes={totalDigitacoes}
              totalClientes={dailyTotalClientes}
              taxaAproveitamento={taxaAproveitamento}
              taxaAprovacao={taxaAprovacao}
              cartoesAtivosPerc={cartoesAtivosPerc}
              ativosNoCaixaPerc={ativosNoCaixaPerc}
              ticketMedio={ticketMedio}
              crescimentoCartoes={0} // Sem cálculo dia a dia por enquanto
              crescimentoValor={0}
            />
            <DigitacoesListModal
              open={digitacoesModalOpen}
              onClose={() => setDigitacoesModalOpen(false)}
              title="Digitações do Dia"
              subtitle={group.label}
              digitacoes={dailyDigs}
            />
          </>
        );
      })()}
    </PageContainer>
  );
}
