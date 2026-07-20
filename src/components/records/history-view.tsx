"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, CalendarDays, ChevronDown, RefreshCw, Search, X } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { useRecords } from "@/components/providers/records-provider";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { groupRecordsByDate } from "@/lib/records/domain";
import { formatCurrency, formatInteger } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { RecordCard } from "./record-card";

export function HistoryView() {
  const { records, isLoading, error, refresh } = useRecords();
  const [search, setSearch] = useState("");
  const groups = useMemo(() => groupRecordsByDate(records), [records]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const activeExpanded = expanded ?? groups[0]?.dateKey ?? "";

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    
    const query = search.toLowerCase();
    
    return groups.map(group => {
      const matchDate = group.label.toLowerCase().includes(query) || group.dateKey.includes(query);
      
      const filteredRecords = group.records.filter(record => 
        record.operatorName.toLowerCase().includes(query) ||
        record.clientName.toLowerCase().includes(query)
      );
      
      if (matchDate || filteredRecords.length > 0) {
        return {
          ...group,
          records: matchDate ? group.records : filteredRecords,
          count: matchDate ? group.count : filteredRecords.length,
          totalInCents: (matchDate ? group.records : filteredRecords).reduce((acc, r) => acc + r.amountInCents, 0)
        };
      }
      return null;
    }).filter(Boolean) as typeof groups;
  }, [groups, search]);

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
        eyebrow="Historico"
        title="Registros por data"
        description="Dias agrupados automaticamente com totais, operadores e detalhe analitico."
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

      <div className="mb-6 flex items-center gap-3 rounded-[1.5rem] border border-zinc-200 bg-white px-5 py-4 shadow-[0_4px_24px_rgba(15,23,42,0.02)] transition duration-300 focus-within:border-zinc-950 focus-within:ring-4 focus-within:ring-zinc-950/10">
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

      <div className="grid gap-4">
        {filteredGroups.map((group, index) => {
          const isExpanded = activeExpanded === group.dateKey;

          return (
            <motion.article
              key={group.dateKey}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.2) }}
              className="overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white shadow-[0_18px_54px_rgba(15,23,42,0.06)]"
            >
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="flex min-w-0 items-center gap-4">
                  <button
                    type="button"
                    aria-label={isExpanded ? "Recolher data" : "Expandir data"}
                    onClick={() =>
                      setExpanded(isExpanded ? "" : group.dateKey)
                    }
                    className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-600 transition duration-300 hover:border-zinc-300 hover:bg-white hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/15"
                  >
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        "size-5 transition duration-300",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </button>

                  <Link
                    href={`/historico/${group.dateKey}`}
                    className="min-w-0 rounded-2xl outline-none transition focus-visible:ring-2 focus-visible:ring-zinc-950/15"
                  >
                    <p className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
                      <CalendarDays aria-hidden="true" className="size-4" />
                      {group.relativeLabel}
                    </p>
                    <h2 className="mt-1 truncate text-xl font-semibold text-zinc-950">
                      {group.label}
                    </h2>
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                  <div className="rounded-2xl bg-zinc-50 px-3 py-2">
                    <p className="text-xs font-medium text-zinc-500">Cartoes</p>
                    <p className="text-sm font-semibold text-zinc-950">
                      {formatInteger(group.count)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 px-3 py-2">
                    <p className="text-xs font-medium text-zinc-500">Total</p>
                    <p className="text-sm font-semibold text-zinc-950">
                      {formatCurrency(group.totalInCents)}
                    </p>
                  </div>
                  <Link
                    href={`/historico/${group.dateKey}`}
                    className="col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-950/15 sm:col-span-1"
                  >
                    Detalhes
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isExpanded ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: "easeInOut" }}
                    className="overflow-hidden border-t border-zinc-100"
                  >
                    <div className="grid gap-3 p-4 sm:p-5 max-h-[600px] overflow-y-auto">
                      {group.records.map((record, recordIndex) => (
                        <RecordCard
                          key={record.id}
                          record={record}
                          index={recordIndex}
                        />
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.article>
          );
        })}

        {!filteredGroups.length ? (
          <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-white px-5 py-10 text-center text-sm font-medium text-zinc-500">
            {search ? "Nenhum resultado encontrado." : "Nenhum dia registrado."}
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
}
