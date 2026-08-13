"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  Ellipsis,
  Keyboard,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { useAuth } from "@/components/providers/auth-provider";
import { useRecords } from "@/components/providers/records-provider";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { sumDigitacoes } from "@/lib/records/digitacoes-utils";
import { groupRecordsByMonth } from "@/lib/records/domain";
import { formatCurrency, formatInteger } from "@/lib/utils/format";
import { DigitacoesListModal } from "./digitacoes-list-modal";
import { InsertDayModal } from "./insert-day-modal";
import { MonthAnalytics } from "./month-analytics";
import { PlanningValueModal } from "./planning-value-modal";
import { ViradaPuListModal } from "./virada-pu-list-modal";

type PlanningModalState =
  | { mode: "monthlyCardsGoal"; monthKey: string; currentValue: number | null }
  | { mode: "monthlySalesGoal"; monthKey: string; currentValue: number | null }
  | null;

function getMonthPlanning(monthKey: string, currentCards: number, cardsGoal: number | null) {
  if (!cardsGoal || cardsGoal <= 0) {
    return {
      cardsPerDayTarget: null,
      cardsPerDayRequired: null,
      cardsGoalRemaining: null,
    };
  }

  const [year, month] = monthKey.split("-").map(Number);
  const totalDays = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const remainingDays = isCurrentMonth
    ? Math.max(totalDays - today.getDate() + 1, 1)
    : totalDays;
  const remainingCards = Math.max(cardsGoal - currentCards, 0);

  return {
    cardsPerDayTarget: cardsGoal / totalDays,
    cardsPerDayRequired: remainingCards / remainingDays,
    cardsGoalRemaining: remainingCards,
  };
}

function getPerformancePercent(current: number, previous: number) {
  if (previous > 0) return (current / previous) * 100;
  return current > 0 ? 100 : 0;
}

export function HistoryView() {
  const { user, selectedStoreId } = useAuth();
  const {
    records,
    digitacoes,
    dailyMetrics,
    trocas,
    viradasPu,
    monthlyGoals,
    dailySales,
    isLoading,
    error,
    refresh,
  } = useRecords();

  const [search, setSearch] = useState("");
  const [digitacoesModalOpen, setDigitacoesModalOpen] = useState(false);
  const [viradasPuModalOpen, setViradasPuModalOpen] = useState(false);
  const [insertDayModalOpen, setInsertDayModalOpen] = useState(false);
  const [planningModal, setPlanningModal] = useState<PlanningModalState>(null);
  const [openMonthMenu, setOpenMonthMenu] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [activeMonthKey, setActiveMonthKey] = useState<string | null>(null);

  const canInsertDay = user?.role === "GLOBAL_ADMIN" || user?.role === "TI_ADMIN";
  const canManageMonthGoals = user
    ? ["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER", "MANAGER"].includes(user.role)
    : false;

  const monthGroups = useMemo(() => {
    return groupRecordsByMonth(
      records,
      digitacoes,
      dailyMetrics,
      trocas,
      viradasPu,
      monthlyGoals,
      dailySales,
    );
  }, [dailyMetrics, dailySales, digitacoes, monthlyGoals, records, trocas, viradasPu]);

  const availableYears = useMemo(() => {
    const years = new Set(monthGroups.map((group) => group.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [monthGroups]);

  useEffect(() => {
    if (selectedYear === null && availableYears.length > 0) {
      void Promise.resolve().then(() => setSelectedYear(availableYears[0]));
    }
  }, [availableYears, selectedYear]);

  const filteredMonths = useMemo(() => {
    if (!selectedYear) return [];
    const yearMonths = monthGroups.filter((group) => group.year === selectedYear);
    if (!search.trim()) return yearMonths;

    const query = search.toLowerCase();
    return yearMonths.filter((month) => month.label.toLowerCase().includes(query));
  }, [monthGroups, search, selectedYear]);

  const yearMetrics = useMemo(() => {
    if (!selectedYear || !filteredMonths.length) return null;

    let totalCartoes = 0;
    let totalDigitacoes = 0;
    let totalClientes = 0;
    let activeCount = 0;
    let activeLaterCount = 0;
    let totalInCents = 0;
    let trocasCount = 0;
    let totalUsedInCents = 0;
    let cardsGoal = 0;
    let salesGoalInCents = 0;
    let salesInCents = 0;

    for (const month of filteredMonths) {
      totalCartoes += month.count;
      totalDigitacoes += sumDigitacoes(month.digitacoes);
      totalClientes += month.totalCustomers;
      activeCount += month.activeCount;
      activeLaterCount += month.activeLaterCount;
      totalInCents += month.totalInCents;
      trocasCount += month.trocasCount ?? 0;
      totalUsedInCents += month.totalUsedInCents ?? 0;
      cardsGoal += month.monthlyCardsGoal ?? 0;
      salesGoalInCents += month.monthlySalesGoalInCents ?? 0;
      salesInCents += month.salesInCents ?? 0;
    }

    const taxaAproveitamento = totalClientes > 0 ? ((totalCartoes + totalDigitacoes) / totalClientes) * 100 : 0;
    const taxaAprovacao = totalCartoes + totalDigitacoes > 0 ? (totalCartoes / (totalCartoes + totalDigitacoes)) * 100 : 0;
    const cartoesAtivosPerc = totalCartoes > 0 ? (activeCount / totalCartoes) * 100 : 0;
    const ativosNoCaixaPerc = totalCartoes > 0 ? (activeLaterCount / totalCartoes) * 100 : 0;
    const ticketMedio = totalCartoes > 0 ? totalInCents / totalCartoes : 0;

    return {
      totalCartoes,
      totalDigitacoes,
      totalClientes,
      taxaAproveitamento,
      taxaAprovacao,
      cartoesAtivosPerc,
      ativosNoCaixaPerc,
      ticketMedio,
      crescimentoCartoes: 0,
      crescimentoValor: 0,
      trocasCount,
      totalUsedInCents,
      cardsGoal: cardsGoal || null,
      salesGoalInCents: salesGoalInCents || null,
      salesInCents,
      ...getMonthPlanning(`${selectedYear}-01`, totalCartoes, cardsGoal || null),
    };
  }, [filteredMonths, selectedYear]);

  const activeMonth = useMemo(() => {
    if (!activeMonthKey) return null;
    return monthGroups.find((month) => month.monthKey === activeMonthKey) ?? null;
  }, [activeMonthKey, monthGroups]);

  const filteredDays = useMemo(() => {
    if (!activeMonth) return [];
    if (!search.trim()) return activeMonth.dateGroups;

    const query = search.toLowerCase();
    return activeMonth.dateGroups.filter((dateGroup) => {
      const matchDate = dateGroup.label.toLowerCase().includes(query) || dateGroup.dateKey.includes(query);
      const hasMatchingRecords = dateGroup.records.some((record) =>
        record.operatorName.toLowerCase().includes(query) ||
        record.clientName.toLowerCase().includes(query),
      );
      return matchDate || hasMatchingRecords;
    });
  }, [activeMonth, search]);

  if (isLoading) {
    return (
      <PageContainer>
        <DashboardSkeleton />
      </PageContainer>
    );
  }

  if (activeMonth) {
    const activeIndex = monthGroups.findIndex((group) => group.monthKey === activeMonth.monthKey);
    const previousMonthGroup = monthGroups[activeIndex + 1];
    const totalCartoes = activeMonth.count;
    const totalDigitacoes = sumDigitacoes(activeMonth.digitacoes);
    const totalClientes = activeMonth.totalCustomers;
    const taxaAproveitamento = totalClientes > 0 ? ((totalCartoes + totalDigitacoes) / totalClientes) * 100 : 0;
    const taxaAprovacao = totalCartoes + totalDigitacoes > 0 ? (totalCartoes / (totalCartoes + totalDigitacoes)) * 100 : 0;
    const cartoesAtivosPerc = totalCartoes > 0 ? (activeMonth.activeCount / totalCartoes) * 100 : 0;
    const ativosNoCaixaPerc = totalCartoes > 0 ? (activeMonth.activeLaterCount / totalCartoes) * 100 : 0;
    const ticketMedio = totalCartoes > 0 ? activeMonth.totalInCents / totalCartoes : 0;
    const planning = getMonthPlanning(
      activeMonth.monthKey,
      totalCartoes,
      activeMonth.monthlyCardsGoal,
    );

    return (
      <PageContainer>
        <div className="mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveMonthKey(null);
              setSearch("");
            }}
            className="group flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-zinc-950"
          >
            <div className="flex size-8 items-center justify-center rounded-full bg-zinc-100 transition group-hover:bg-zinc-200">
              <ArrowLeft className="size-4" />
            </div>
          </button>
        </div>

        <PageHeader
          eyebrow="Dias registrados"
          title={`Mes de ${activeMonth.label}`}
          description={`Total de ${activeMonth.count} cartoes registrados neste mes.`}
        >
          <div className="mt-4 flex w-full flex-col gap-2 sm:mt-0 sm:w-auto sm:flex-row">
            <button
              onClick={() => setDigitacoesModalOpen(true)}
              className="group flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-950/10 sm:w-auto"
            >
              <Keyboard className="size-4 text-purple-500" />
              Ver digitacoes
            </button>
            <button
              onClick={() => setViradasPuModalOpen(true)}
              className="group flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-950/10 sm:w-auto"
            >
              <TrendingUp className="size-4 text-emerald-500" />
              Virada de PU
            </button>
            {canInsertDay ? (
              <button
                onClick={() => setInsertDayModalOpen(true)}
                className="group flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-950/10 sm:w-auto"
              >
                <CalendarPlus className="size-4 text-sky-500" />
                Inserir dia
              </button>
            ) : null}
          </div>
        </PageHeader>

        <MonthAnalytics
          totalCartoes={totalCartoes}
          totalDigitacoes={totalDigitacoes}
          totalClientes={totalClientes}
          taxaAproveitamento={taxaAproveitamento}
          taxaAprovacao={taxaAprovacao}
          cartoesAtivosPerc={cartoesAtivosPerc}
          ativosNoCaixaPerc={ativosNoCaixaPerc}
          ticketMedio={ticketMedio}
          crescimentoCartoes={getPerformancePercent(totalCartoes, previousMonthGroup?.count ?? 0)}
          crescimentoValor={getPerformancePercent(activeMonth.totalInCents, previousMonthGroup?.totalInCents ?? 0)}
          trocasCount={activeMonth.trocasCount ?? 0}
          totalUsedInCents={activeMonth.totalUsedInCents ?? 0}
          cardsGoal={activeMonth.monthlyCardsGoal}
          salesGoalInCents={activeMonth.monthlySalesGoalInCents}
          salesInCents={activeMonth.salesInCents}
          {...planning}
        />

        <div className="mb-6 flex min-w-0 items-center rounded-[1.5rem] border border-zinc-200 bg-white px-4 py-3.5 shadow-sm transition duration-300 focus-within:border-zinc-950 focus-within:ring-4 focus-within:ring-zinc-950/10">
          <Search className="size-5 shrink-0 text-zinc-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar dia, cliente ou colaborador..."
            className="ml-3 min-w-0 flex-1 bg-transparent text-base text-zinc-950 outline-none placeholder:text-zinc-400"
          />
          {search ? (
            <button type="button" onClick={() => setSearch("")} className="ml-2 text-zinc-400 hover:text-zinc-700">
              <X className="size-5" />
            </button>
          ) : null}
        </div>

        <div className="grid gap-3">
          {filteredDays.map((dayGroup, index) => (
            <motion.div
              key={dayGroup.dateKey}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.25) }}
            >
              <Link
                href={`/historico/${dayGroup.dateKey}`}
                className="group flex flex-col gap-6 rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 shadow-[0_14px_42px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-[0_20px_54px_rgba(15,23,42,0.06)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-500/30"
              >
                <div className="flex items-center gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-zinc-100 bg-zinc-50 text-zinc-600 shadow-sm transition group-hover:bg-zinc-100 group-hover:text-zinc-900">
                    <CalendarDays className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      {dayGroup.relativeLabel}
                    </p>
                    <h3 className="text-lg font-bold text-zinc-950">{dayGroup.label}</h3>
                  </div>
                </div>

                <div className="flex w-full items-end justify-between">
                  <div className="flex flex-wrap items-center gap-y-3">
                    <div className="pr-4 text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Cartoes</p>
                      <p className="text-base font-bold text-zinc-950">{formatInteger(dayGroup.count)}</p>
                    </div>
                    <div className="h-8 w-px bg-zinc-200" />
                    <div className="pl-4 text-left">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Valor</p>
                      <p className="text-base font-bold text-zinc-950">{formatCurrency(dayGroup.totalInCents)}</p>
                    </div>
                    {dayGroup.salesInCents > 0 ? (
                      <>
                        <div className="mx-4 h-8 w-px bg-zinc-200" />
                        <div className="text-left">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Venda</p>
                          <p className="text-base font-bold text-zinc-950">{formatCurrency(dayGroup.salesInCents)}</p>
                        </div>
                      </>
                    ) : null}
                  </div>

                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-sm transition group-hover:bg-zinc-800">
                    <ArrowRight className="size-5" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}

          {!filteredDays.length ? (
            <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-white px-5 py-10 text-center text-sm font-medium text-zinc-500">
              Nenhum dia encontrado nesta busca.
            </div>
          ) : null}
        </div>

        <DigitacoesListModal
          open={digitacoesModalOpen}
          onClose={() => setDigitacoesModalOpen(false)}
          title="Digitacoes do Mes"
          subtitle={activeMonth.label}
          digitacoes={activeMonth.digitacoes}
        />
        <ViradaPuListModal
          open={viradasPuModalOpen}
          onClose={() => setViradasPuModalOpen(false)}
          monthKey={activeMonth.monthKey}
        />
        <InsertDayModal
          open={insertDayModalOpen}
          onClose={() => setInsertDayModalOpen(false)}
          monthKey={activeMonth.monthKey}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Historico"
        title="Registros por data"
        description="Selecione o mes para ver os dias registrados."
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

      <div className="mb-6 flex items-stretch gap-3">
        <div className="flex min-w-0 flex-1 items-center rounded-[1.5rem] border border-zinc-200 bg-white px-5 shadow-[0_4px_24px_rgba(15,23,42,0.02)] transition duration-300 focus-within:border-zinc-950 focus-within:ring-4 focus-within:ring-zinc-950/10">
          <Search className="size-5 shrink-0 text-zinc-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar por mes..."
            className="ml-3 h-14 min-w-0 flex-1 bg-transparent text-base text-zinc-950 outline-none placeholder:text-zinc-400"
          />
          {search ? (
            <button type="button" onClick={() => setSearch("")} className="ml-2 text-zinc-400 hover:text-zinc-700">
              <X className="size-5" />
            </button>
          ) : null}
        </div>

        <div className="relative w-[100px] shrink-0 rounded-[1.5rem] border border-zinc-200 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.02)] transition duration-300 focus-within:border-zinc-950 focus-within:ring-4 focus-within:ring-zinc-950/10 sm:w-[110px]">
          <select
            value={selectedYear ?? ""}
            onChange={(event) => {
              setSelectedYear(Number(event.target.value));
              setSearch("");
            }}
            className="h-14 w-full cursor-pointer appearance-none bg-transparent pl-4 pr-9 text-base font-semibold text-zinc-950 outline-none"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {yearMetrics && !search ? (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-bold tracking-tight text-zinc-950">
            Resumo do Ano ({selectedYear})
          </h2>
          <MonthAnalytics {...yearMetrics} />
        </div>
      ) : null}

      {!selectedStoreId && user && ["GLOBAL_ADMIN", "REGIONAL_MANAGER", "TI_ADMIN"].includes(user.role) ? (
        <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-white px-5 py-10 text-center text-sm font-medium text-zinc-500">
          Selecione uma unidade no topo para visualizar os registros de cada mes.
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMonths.map((monthGroup, index) => (
              <motion.article
                key={monthGroup.monthKey}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.2) }}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setActiveMonthKey(monthGroup.monthKey);
                  setSearch("");
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  setActiveMonthKey(monthGroup.monthKey);
                  setSearch("");
                }}
                className="group relative cursor-pointer rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 text-left shadow-[0_14px_42px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-[0_20px_54px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-500/30"
                aria-label={`Abrir ${monthGroup.label}`}
              >
                <div className="relative flex w-full items-start justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-zinc-100 bg-zinc-50 text-zinc-600 shadow-sm transition group-hover:bg-zinc-100 group-hover:text-zinc-900">
                      <CalendarDays className="size-5" />
                    </div>
                    {monthGroup.monthlyCardsGoal ? (
                      <span className="truncate text-sm font-black tracking-tight text-zinc-950">
                        {formatInteger(monthGroup.count)}/{formatInteger(monthGroup.monthlyCardsGoal)}
                      </span>
                    ) : null}
                  </div>
                  {canManageMonthGoals ? (
                    <div
                      className="relative z-10"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMonthMenu((current) =>
                            current === monthGroup.monthKey ? null : monthGroup.monthKey,
                          );
                        }}
                        className="flex size-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-950"
                        aria-label={`Opcoes de ${monthGroup.label}`}
                      >
                        <Ellipsis className="size-4" />
                      </button>

                      <AnimatePresence>
                        {openMonthMenu === monthGroup.monthKey ? (
                          <>
                            <button
                              type="button"
                              className="fixed inset-0 z-20 cursor-default"
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenMonthMenu(null);
                              }}
                              aria-label="Fechar menu"
                            />
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 8, scale: 0.98 }}
                              transition={{ duration: 0.16 }}
                              className="absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-[0_20px_54px_rgba(15,23,42,0.16)]"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMonthMenu(null);
                                  setPlanningModal({
                                    mode: "monthlyCardsGoal",
                                    monthKey: monthGroup.monthKey,
                                    currentValue: monthGroup.monthlyCardsGoal,
                                  });
                                }}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-950"
                              >
                                <Target className="size-4 text-sky-500" />
                                Definir meta de cartoes
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMonthMenu(null);
                                  setPlanningModal({
                                    mode: "monthlySalesGoal",
                                    monthKey: monthGroup.monthKey,
                                    currentValue: monthGroup.monthlySalesGoalInCents,
                                  });
                                }}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-950"
                              >
                                <Target className="size-4 text-violet-500" />
                                Definir meta de venda
                              </button>
                            </motion.div>
                          </>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  ) : null}
                </div>

                <div className="relative mt-5">
                  <h2 className="text-xl font-bold text-zinc-950">{monthGroup.label}</h2>
                  <p className="mt-1 text-sm font-medium text-zinc-500">
                    {monthGroup.count} {monthGroup.count === 1 ? "cartao registrado" : "cartoes registrados"}
                  </p>
                </div>

                <div className="relative mt-6 flex w-full items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    {monthGroup.activeCount} ativos
                  </span>
                  <div className="flex size-8 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-400 opacity-0 transition duration-300 group-hover:opacity-100 group-hover:text-zinc-700">
                    <ArrowRight className="size-4" />
                  </div>
                </div>
              </motion.article>
            ))}
          </div>

          {!filteredMonths.length ? (
            <div className="mt-4 rounded-[1.5rem] border border-dashed border-zinc-300 bg-white px-5 py-10 text-center text-sm font-medium text-zinc-500">
              {search ? "Nenhum resultado encontrado para esta busca." : "Nenhum registro para este ano."}
            </div>
          ) : null}
        </>
      )}

      <PlanningValueModal
        open={planningModal !== null}
        mode={planningModal?.mode ?? "monthlyCardsGoal"}
        monthKey={planningModal?.monthKey}
        currentValue={planningModal?.currentValue ?? null}
        onClose={() => setPlanningModal(null)}
      />
    </PageContainer>
  );
}
