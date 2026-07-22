"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, CalendarDays, ChevronDown, RefreshCw, Search, X } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { useRecords } from "@/components/providers/records-provider";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { groupRecordsByMonth } from "@/lib/records/domain";
import { formatCurrency, formatInteger } from "@/lib/utils/format";
import { MonthAnalytics } from "./month-analytics";

export function HistoryView() {
  const { records, digitacoes, dailyMetrics, isLoading, error, refresh } = useRecords();
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  
  // Controls which month is currently opened (drill-down state)
  const [activeMonthKey, setActiveMonthKey] = useState<string | null>(null);

  const monthGroups = useMemo(() => {
    return groupRecordsByMonth(records, digitacoes, dailyMetrics);
  }, [records, digitacoes, dailyMetrics]);

  const availableYears = useMemo(() => {
    const years = new Set(monthGroups.map((g) => g.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [monthGroups]);

  // Set default year if none selected
  useEffect(() => {
    if (selectedYear === null && availableYears.length > 0) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // Filter months for the year view
  const filteredMonths = useMemo(() => {
    if (!selectedYear) return [];
    const forYear = monthGroups.filter((g) => g.year === selectedYear);
    if (!search.trim()) return forYear;
    
    const query = search.toLowerCase();
    return forYear.filter(mg => mg.label.toLowerCase().includes(query));
  }, [monthGroups, search, selectedYear]);

  // When drilled down into a month, filter its days
  const activeMonth = useMemo(() => {
    if (!activeMonthKey) return null;
    return monthGroups.find(m => m.monthKey === activeMonthKey) || null;
  }, [activeMonthKey, monthGroups]);

  const filteredDays = useMemo(() => {
    if (!activeMonth) return [];
    if (!search.trim()) return activeMonth.dateGroups;

    const query = search.toLowerCase();
    return activeMonth.dateGroups.filter(dateGroup => {
      const matchDate = dateGroup.label.toLowerCase().includes(query) || dateGroup.dateKey.includes(query);
      const hasMatchingRecords = dateGroup.records.some(r => 
        r.operatorName.toLowerCase().includes(query) || r.clientName.toLowerCase().includes(query)
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

  // --- DRILL DOWN VIEW (Viewing Days inside a Month) ---
  if (activeMonth) {
    return (
      <PageContainer>
        <div className="mb-6">
          <button
            type="button"
            onClick={() => { setActiveMonthKey(null); setSearch(""); }}
            className="group flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-zinc-950"
          >
            <div className="flex size-8 items-center justify-center rounded-full bg-zinc-100 transition group-hover:bg-zinc-200">
              <ArrowLeft className="size-4" />
            </div>
          </button>
        </div>

        <PageHeader
          eyebrow="Dias Registrados"
          title={`Mês de ${activeMonth.label}`}
          description={`Total de ${activeMonth.count} cartões registrados neste mês.`}
        />

        {/* Analytics 9 Cards */}
        {(() => {
          const activeIndex = monthGroups.findIndex(g => g.monthKey === activeMonth.monthKey);
          const previousMonthGroup = monthGroups[activeIndex + 1];
          
          const totalCartoes = activeMonth.count;
          const totalDigitacoes = activeMonth.digitacoes.length;
          const totalClientes = activeMonth.totalCustomers;
          
          const taxaAproveitamento = totalClientes > 0 ? ((totalCartoes + totalDigitacoes) / totalClientes) * 100 : 0;
          const taxaAprovacao = (totalCartoes + totalDigitacoes) > 0 ? (totalCartoes / (totalCartoes + totalDigitacoes)) * 100 : 0;
          const cartoesAtivosPerc = totalCartoes > 0 ? (activeMonth.activeCount / totalCartoes) * 100 : 0;
          const ativosNoCaixaPerc = totalCartoes > 0 ? (activeMonth.activeLaterCount / totalCartoes) * 100 : 0;
          const ticketMedio = totalCartoes > 0 ? activeMonth.totalInCents / totalCartoes : 0;
          
          const prevCartoes = previousMonthGroup?.count || 0;
          const crescimentoCartoes = prevCartoes > 0 ? ((totalCartoes - prevCartoes) / prevCartoes) * 100 : totalCartoes > 0 ? 100 : 0;
          
          const prevValor = previousMonthGroup?.totalInCents || 0;
          const crescimentoValor = prevValor > 0 ? ((activeMonth.totalInCents - prevValor) / prevValor) * 100 : activeMonth.totalInCents > 0 ? 100 : 0;

          return (
            <MonthAnalytics 
              totalCartoes={totalCartoes}
              totalDigitacoes={totalDigitacoes}
              totalClientes={totalClientes}
              taxaAproveitamento={taxaAproveitamento}
              taxaAprovacao={taxaAprovacao}
              cartoesAtivosPerc={cartoesAtivosPerc}
              ativosNoCaixaPerc={ativosNoCaixaPerc}
              ticketMedio={ticketMedio}
              crescimentoCartoes={crescimentoCartoes}
              crescimentoValor={crescimentoValor}
            />
          );
        })()}

        <div className="mb-6 flex min-w-0 items-center rounded-[1.5rem] border border-zinc-200 bg-white px-4 py-3.5 shadow-sm transition duration-300 focus-within:border-zinc-950 focus-within:ring-4 focus-within:ring-zinc-950/10">
          <Search className="size-5 shrink-0 text-zinc-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar dia, cliente ou colaborador..."
            className="ml-3 min-w-0 flex-1 bg-transparent text-base text-zinc-950 outline-none placeholder:text-zinc-400"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="ml-2 text-zinc-400 hover:text-zinc-700">
              <X className="size-5" />
            </button>
          )}
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
              {/* Top: Icon + Date */}
              <div className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-zinc-100 bg-zinc-50 text-zinc-600 shadow-sm transition group-hover:bg-zinc-100 group-hover:text-zinc-900">
                  <CalendarDays className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    {dayGroup.relativeLabel}
                  </p>
                  <h3 className="text-lg font-bold text-zinc-950">
                    {dayGroup.label}
                  </h3>
                </div>
              </div>
              
              {/* Bottom: Metrics + Arrow */}
              <div className="flex w-full items-end justify-between">
                <div className="flex items-center">
                  <div className="text-right pr-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Cartões</p>
                    <p className="text-base font-bold text-zinc-950">{formatInteger(dayGroup.count)}</p>
                  </div>
                  <div className="w-px h-8 bg-zinc-200" />
                  <div className="text-left pl-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Valor</p>
                    <p className="text-base font-bold text-zinc-950">{formatCurrency(dayGroup.totalInCents)}</p>
                  </div>
                </div>

                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-sm transition group-hover:bg-zinc-800">
                  <ArrowRight className="size-5" />
                </div>
              </div>
            </Link>
            </motion.div>
          ))}

          {!filteredDays.length && (
            <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-white px-5 py-10 text-center text-sm font-medium text-zinc-500">
              Nenhum dia encontrado nesta busca.
            </div>
          )}
        </div>
      </PageContainer>
    );
  }

  // --- MAIN VIEW (Viewing Months) ---
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Histórico"
        title="Registros por data"
        description="Selecione o mês para ver os dias registrados."
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

      {/* Search and Year Select Container */}
      <div className="mb-6 flex items-stretch gap-3">
        {/* Search */}
        <div className="flex flex-1 min-w-0 items-center rounded-[1.5rem] border border-zinc-200 bg-white px-5 shadow-[0_4px_24px_rgba(15,23,42,0.02)] transition duration-300 focus-within:border-zinc-950 focus-within:ring-4 focus-within:ring-zinc-950/10">
          <Search className="size-5 shrink-0 text-zinc-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por mês..."
            className="ml-3 h-14 w-full min-w-0 flex-1 bg-transparent text-base text-zinc-950 outline-none placeholder:text-zinc-400"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="ml-2 text-zinc-400 hover:text-zinc-700">
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* Year Select */}
        <div className="relative shrink-0 w-[100px] sm:w-[110px] rounded-[1.5rem] border border-zinc-200 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.02)] transition duration-300 focus-within:border-zinc-950 focus-within:ring-4 focus-within:ring-zinc-950/10">
          <select
            value={selectedYear ?? ""}
            onChange={(e) => {
              setSelectedYear(Number(e.target.value));
              setSearch("");
            }}
            className="h-14 w-full appearance-none bg-transparent pl-4 pr-9 text-base font-semibold text-zinc-950 outline-none cursor-pointer"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-zinc-400" />
        </div>
      </div>

      {/* Months Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredMonths.map((monthGroup, index) => (
          <motion.button
            key={monthGroup.monthKey}
            type="button"
            onClick={() => {
              setActiveMonthKey(monthGroup.monthKey);
              setSearch("");
            }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.2) }}
            className="group flex flex-col items-start rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 text-left shadow-[0_14px_42px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-[0_20px_54px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-500/30"
          >
            <div className="flex w-full items-start justify-between">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-zinc-100 bg-zinc-50 text-zinc-600 shadow-sm transition group-hover:bg-zinc-100 group-hover:text-zinc-900">
                <CalendarDays className="size-5" />
              </div>
            </div>

            <div className="mt-5">
              <h2 className="text-xl font-bold text-zinc-950">
                {monthGroup.label}
              </h2>
              <p className="mt-1 text-sm font-medium text-zinc-500">
                {monthGroup.count} {monthGroup.count === 1 ? 'cartão registrado' : 'cartões registrados'}
              </p>
            </div>

            <div className="mt-6 flex w-full items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 border border-emerald-200/60">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {monthGroup.activeCount} ATIVOS
              </span>
              <div className="flex size-8 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-400 opacity-0 transition duration-300 group-hover:opacity-100 group-hover:text-zinc-700">
                <ArrowRight className="size-4" />
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {!filteredMonths.length ? (
        <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-white px-5 py-10 text-center text-sm font-medium text-zinc-500">
          {search ? "Nenhum resultado encontrado para esta busca." : "Nenhum registro para este ano."}
        </div>
      ) : null}
    </PageContainer>
  );
}
