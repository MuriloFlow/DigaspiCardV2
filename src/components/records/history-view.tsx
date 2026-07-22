"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, CalendarDays, ChevronDown, RefreshCw, Search, X } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { useRecords } from "@/components/providers/records-provider";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { groupRecordsByMonth } from "@/lib/records/domain";
import { formatCurrency, formatInteger } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function HistoryView() {
  const { records, isLoading, error, refresh } = useRecords();
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const monthGroups = useMemo(() => groupRecordsByMonth(records), [records]);

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

  // Expand first month of the selected year by default
  useEffect(() => {
    if (selectedYear !== null) {
      const firstMonth = monthGroups.find((g) => g.year === selectedYear);
      if (firstMonth && !expandedMonth) {
        setExpandedMonth(firstMonth.monthKey);
      }
    }
  }, [selectedYear, monthGroups, expandedMonth]);

  const filteredMonths = useMemo(() => {
    if (!selectedYear) return [];

    const forYear = monthGroups.filter((g) => g.year === selectedYear);
    
    if (!search.trim()) return forYear;
    
    const query = search.toLowerCase();
    
    return forYear.map(monthGroup => {
      const matchMonth = monthGroup.label.toLowerCase().includes(query);
      
      const filteredDateGroups = monthGroup.dateGroups.map(dateGroup => {
        const matchDate = dateGroup.label.toLowerCase().includes(query) || dateGroup.dateKey.includes(query);
        
        const filteredRecords = dateGroup.records.filter(record => 
          record.operatorName.toLowerCase().includes(query) ||
          record.clientName.toLowerCase().includes(query)
        );
        
        if (matchDate || filteredRecords.length > 0) {
          return {
            ...dateGroup,
            records: matchDate ? dateGroup.records : filteredRecords,
            count: matchDate ? dateGroup.count : filteredRecords.length,
            totalInCents: (matchDate ? dateGroup.records : filteredRecords).reduce((acc, r) => acc + r.amountInCents, 0)
          };
        }
        return null;
      }).filter(Boolean) as typeof monthGroup.dateGroups;
      
      if (matchMonth || filteredDateGroups.length > 0) {
        return {
          ...monthGroup,
          dateGroups: matchMonth ? monthGroup.dateGroups : filteredDateGroups,
          count: matchMonth ? monthGroup.count : filteredDateGroups.reduce((acc, g) => acc + g.count, 0),
          totalInCents: matchMonth ? monthGroup.totalInCents : filteredDateGroups.reduce((acc, g) => acc + g.totalInCents, 0)
        };
      }
      return null;
    }).filter(Boolean) as typeof monthGroups;
  }, [monthGroups, search, selectedYear]);

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
        eyebrow="Histórico"
        title="Registros por data"
        description="Dias agrupados automaticamente por mês, com totais e detalhe analítico."
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

      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="flex flex-1 items-center gap-3 rounded-[1.5rem] border border-zinc-200 bg-white px-5 py-4 shadow-[0_4px_24px_rgba(15,23,42,0.02)] transition duration-300 focus-within:border-zinc-950 focus-within:ring-4 focus-within:ring-zinc-950/10">
          <Search className="size-5 shrink-0 text-zinc-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por data ou colaborador..."
            className="min-w-0 flex-1 bg-transparent text-base text-zinc-950 outline-none placeholder:text-zinc-400"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="text-zinc-400 hover:text-zinc-700">
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* Year Select */}
        <div className="flex shrink-0 items-center rounded-[1.5rem] border border-zinc-200 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.02)] transition duration-300 focus-within:border-zinc-950 focus-within:ring-4 focus-within:ring-zinc-950/10 relative">
          <select
            value={selectedYear ?? ""}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="h-full min-h-[56px] w-full appearance-none bg-transparent px-5 pr-10 text-base font-semibold text-zinc-950 outline-none sm:w-32"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-zinc-400" />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredMonths.map((monthGroup, index) => {
          const isExpanded = expandedMonth === monthGroup.monthKey;

          return (
            <motion.article
              key={monthGroup.monthKey}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.2) }}
              className="overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white shadow-[0_18px_54px_rgba(15,23,42,0.06)]"
            >
              {/* Month Header */}
              <button
                type="button"
                onClick={() => setExpandedMonth(isExpanded ? null : monthGroup.monthKey)}
                className="flex w-full flex-col gap-4 p-4 text-left transition hover:bg-zinc-50/50 sm:flex-row sm:items-center sm:justify-between sm:p-5 outline-none focus-visible:ring-4 focus-visible:ring-zinc-950/10"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-600 transition duration-300 group-hover:border-zinc-300 group-hover:bg-white group-hover:text-zinc-950">
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        "size-5 transition duration-300",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
                      Mês de
                    </p>
                    <h2 className="mt-1 truncate text-xl font-semibold text-zinc-950">
                      {monthGroup.label}
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                  <div className="rounded-2xl bg-zinc-50 px-3 py-2 border border-zinc-100">
                    <p className="text-xs font-medium text-zinc-500">Cartões</p>
                    <p className="text-sm font-semibold text-zinc-950">
                      {formatInteger(monthGroup.count)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 px-3 py-2 border border-zinc-100">
                    <p className="text-xs font-medium text-zinc-500">Total</p>
                    <p className="text-sm font-semibold text-zinc-950">
                      {formatCurrency(monthGroup.totalInCents)}
                    </p>
                  </div>
                </div>
              </button>

              {/* Days inside Month */}
              <AnimatePresence initial={false}>
                {isExpanded ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: "easeInOut" }}
                    className="overflow-hidden border-t border-zinc-100 bg-zinc-50/30"
                  >
                    <div className="grid gap-3 p-4 sm:p-5">
                      {monthGroup.dateGroups.map((dayGroup) => (
                        <div key={dayGroup.dateKey} className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
                          <Link
                            href={`/historico/${dayGroup.dateKey}`}
                            className="flex min-w-0 items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/15"
                          >
                            <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                              <CalendarDays className="size-4" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-zinc-500">
                                {dayGroup.relativeLabel}
                              </p>
                              <h3 className="text-base font-bold text-zinc-950">
                                {dayGroup.label}
                              </h3>
                            </div>
                          </Link>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-4 mr-2">
                              <div className="text-right">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Cartões</p>
                                <p className="text-sm font-semibold text-zinc-950">{formatInteger(dayGroup.count)}</p>
                              </div>
                              <div className="w-px h-6 bg-zinc-200" />
                              <div className="text-right">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Valor</p>
                                <p className="text-sm font-semibold text-zinc-950">{formatCurrency(dayGroup.totalInCents)}</p>
                              </div>
                            </div>
                            <Link
                              href={`/historico/${dayGroup.dateKey}`}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800"
                            >
                              Detalhes
                              <ArrowRight className="size-3" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.article>
          );
        })}

        {!filteredMonths.length ? (
          <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-white px-5 py-10 text-center text-sm font-medium text-zinc-500">
            {search ? "Nenhum resultado encontrado para este ano." : "Nenhum registro para este ano."}
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
}
