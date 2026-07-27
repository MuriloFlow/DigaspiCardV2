"use client";


import Link from "next/link";
import { ArrowLeft, ArrowRightLeft, CreditCard, ListChecks, Users } from "lucide-react";
import { OperatorPieChart } from "@/components/charts/operator-pie-chart";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { useRecords } from "@/components/providers/records-provider";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/ui/metric-card";
import { getDateGroup } from "@/lib/records/domain";
import { getOperatorColor } from "@/lib/records/colors";
import { formatCurrency, formatInteger, toDateKey } from "@/lib/utils/format";
import { RecordCard } from "./record-card";
import { useAuth } from "@/components/providers/auth-provider";
import { DailyCustomersModal } from "./daily-customers-modal";
import { useState, useEffect, useMemo } from "react";
import { DailyMetricsModal } from "./daily-metrics-modal";
import { DigitacoesListModal } from "./digitacoes-list-modal";
import { TrocasListModal } from "./trocas-list-modal";
import { ViradaPuListModal } from "./virada-pu-list-modal";
import { ViradaPuModal } from "./virada-pu-modal";
import { ConfirmActionSheet } from "./confirm-action-sheet";
import { TrendingUp } from "lucide-react";
import { Activity, Keyboard } from "lucide-react";
import { sumDigitacoes, getDigitacaoQuantity } from "@/lib/records/digitacoes-utils";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { ActionSelectionSheet } from "./action-selection-sheet";
import { AddRecordModal } from "./add-record-modal";
import { AddDigitacaoModal } from "./add-digitacao-modal";
import { AddCaixaDigitacaoModal } from "./add-caixa-digitacao-modal";
import { AddTrocaModal } from "./add-troca-modal";

export function HistoryDetailView({ dateKey }: { dateKey: string }) {
  const { user, selectedStoreId } = useAuth();
  const { records, digitacoes, dailyMetrics, trocas, viradasPu, isLoading } = useRecords();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [metricsModalOpen, setMetricsModalOpen] = useState(false);
  const [digitacoesModalOpen, setDigitacoesModalOpen] = useState(false);
  const [trocasModalOpen, setTrocasModalOpen] = useState(false);
  const [viradasPuModalOpen, setViradasPuModalOpen] = useState(false);
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [digitacaoModalOpen, setDigitacaoModalOpenAction] = useState(false);
  const [caixaModalOpen, setCaixaModalOpen] = useState(false);
  const [trocaModalOpen, setTrocaModalOpenAction] = useState(false);
  const [viradaPuModalOpen, setViradaPuModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"card" | "caixa" | "troca" | "viradaPu" | null>(null);
  const { createRecord, isCreating } = useRecords();

  const isGlobalOrRegional = user?.role === "GLOBAL_ADMIN" || user?.role === "TI_ADMIN" || user?.role === "REGIONAL_MANAGER";
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (isGlobalOrRegional) {
      fetch("/api/stores")
        .then((res) => res.json())
        .then((data) => setStores(data.stores ?? []))
        .catch(() => {});
    }
  }, [isGlobalOrRegional]);

  const group = useMemo(
    () => getDateGroup(records, dateKey, digitacoes, dailyMetrics, trocas, viradasPu),
    [dateKey, records, digitacoes, dailyMetrics, trocas, viradasPu],
  );

  const dayDigitacoes = useMemo(() => {
    return digitacoes.filter((d) => toDateKey(d.createdAt) === dateKey);
  }, [digitacoes, dateKey]);

  const dayDigitacaoOperators = useMemo(() => {
    const map = new Map<string, { count: number; collaboratorId: string; subRole?: string }>();
    dayDigitacoes.forEach((d) => {
      const cur = map.get(d.operatorName) ?? { count: 0, collaboratorId: d.collaboratorId, subRole: d.subRole };
      map.set(d.operatorName, { count: cur.count + getDigitacaoQuantity(d), collaboratorId: d.collaboratorId, subRole: cur.subRole ?? d.subRole });
    });
    
    const total = sumDigitacoes(dayDigitacoes);
    return Array.from(map.entries())
      .map(([name, data], idx) => ({
        operatorName: name,
        collaboratorId: data.collaboratorId,
        subRole: data.subRole,
        count: data.count,
        totalInCents: 0,
        averageInCents: 0,
        percentage: total ? (data.count / total) * 100 : 0,
        color: getOperatorColor(name, idx),
      }))
      .sort((a, b) => b.count - a.count);
  }, [dayDigitacoes]);

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
        description="Participação percentual, volume e valor por operador no dia selecionado."
      >
        <div className="flex flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0">
          {user?.role && ["MANAGER", "GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(user.role) && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="group flex w-full sm:w-auto justify-center h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-950/10"
            >
              <Users className="size-4 text-blue-500" />
              Registrar Caixa
            </button>
          )}
          <button
            onClick={() => setMetricsModalOpen(true)}
            className="group flex w-full sm:w-auto justify-center h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 :bg-zinc-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-950/10 :ring-zinc-50/10"
          >
            <Activity className="size-4 text-emerald-500" />
            Ver métricas
          </button>
          <button
            onClick={() => setDigitacoesModalOpen(true)}
            className="group flex w-full sm:w-auto justify-center h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-950/10"
          >
            <Keyboard className="size-4 text-purple-500" />
            {sumDigitacoes(dayDigitacoes)} Digitações
          </button>
          <button
            onClick={() => setTrocasModalOpen(true)}
            className="group flex w-full sm:w-auto justify-center h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-950/10"
          >
            <ArrowRightLeft className="size-4 text-orange-500" />
            Ver Trocas
          </button>
          <button
            onClick={() => setViradasPuModalOpen(true)}
            className="group flex w-full sm:w-auto justify-center h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-950/10"
          >
            <TrendingUp className="size-4 text-emerald-500" />
            Pontuação PU
          </button>
        </div>
      </PageHeader>

      <DailyCustomersModal 
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          dateKey={dateKey}
          storeId={isGlobalOrRegional ? (selectedStoreId ?? undefined) : (user?.storeId ?? undefined)}
        />

      <TrocasListModal
        open={trocasModalOpen}
        onClose={() => setTrocasModalOpen(false)}
        dateKey={dateKey}
      />
      <ViradaPuListModal
        open={viradasPuModalOpen}
        onClose={() => setViradasPuModalOpen(false)}
        dateKey={dateKey}
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-6">
          <OperatorPieChart
            operators={group.operators}
            centerLabel="Cartões"
            centerValue={formatInteger(group.count)}
            bare
          />
          <div className="my-4 border-t border-dashed border-zinc-200" />
          <OperatorPieChart
            operators={dayDigitacaoOperators}
            centerLabel="DIGITAÇÕES"
            centerValue={formatInteger(sumDigitacoes(dayDigitacoes))}
            tooltipLabel="digitações"
            bare
          />
        </div>

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
                      {formatInteger(operator.count)} cartões registrados
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
                  Media por cartão: {formatCurrency(operator.averageInCents)}
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
        const totalDigitacoes = sumDigitacoes(dailyDigs);
        
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
              crescimentoCartoes={0}
              crescimentoValor={0}
              trocasCount={group.trocasCount ?? 0}
              totalUsedInCents={group.totalUsedInCents ?? 0}
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

        <FloatingActionButton onClick={() => setSheetOpen(true)} />
        <ActionSelectionSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onSelectCard={() => { setSheetOpen(false); setPendingAction("card"); }}
          onSelectDigitacao={() => { setSheetOpen(false); setDigitacaoModalOpenAction(true); }}
          onSelectDigitacaoCaixa={() => { setSheetOpen(false); setPendingAction("caixa"); }}
          onSelectTroca={() => { setSheetOpen(false); setPendingAction("troca"); }}
          onSelectViradaPu={() => { setSheetOpen(false); setPendingAction("viradaPu"); }}
        />
        <ConfirmActionSheet
          open={!!pendingAction}
          onClose={() => setPendingAction(null)}
          onConfirm={() => {
            if (pendingAction === "card") setCardModalOpen(true);
            else if (pendingAction === "caixa") setCaixaModalOpen(true);
            else if (pendingAction === "troca") setTrocaModalOpenAction(true);
            else if (pendingAction === "viradaPu") setViradaPuModalOpen(true);
            setPendingAction(null);
          }}
        />
        <AddRecordModal
          open={cardModalOpen}
          isSubmitting={isCreating}
          onClose={() => setCardModalOpen(false)}
          onCreate={createRecord}
          dateKey={dateKey}
        />
        <AddDigitacaoModal
          open={digitacaoModalOpen}
          onClose={() => setDigitacaoModalOpenAction(false)}
          dateKey={dateKey}
          stores={stores}
        />
        <AddCaixaDigitacaoModal
          open={caixaModalOpen}
          onClose={() => setCaixaModalOpen(false)}
          dateKey={dateKey}
          stores={stores}
        />
        <AddTrocaModal
          open={trocaModalOpen}
          onClose={() => setTrocaModalOpenAction(false)}
          dateKey={dateKey}
          stores={stores}
        />
        <ViradaPuModal
          open={viradaPuModalOpen}
          onClose={() => setViradaPuModalOpen(false)}
          dateKey={dateKey}
          stores={stores}
        />
      </PageContainer>
    );

}
