"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { Crown, Medal, RefreshCw, Trophy } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { useRecords } from "@/components/providers/records-provider";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { aggregateByOperator, aggregateByStore } from "@/lib/records/domain";
import type { OperatorSummary } from "@/lib/records/types";
import { formatCurrency, formatInteger } from "@/lib/utils/format";
import { SubRoleTag } from "@/components/ui/sub-role-tag";

const medals = ["🥇", "🥈", "🥉"];

function RankList({ title, subtitle, ranking, itemName }: { title: string; subtitle: string; ranking: OperatorSummary[]; itemName: string }) {
  const topThree = ranking.slice(0, 3);
  const remaining = ranking.slice(3);
  const leaderCount = ranking[0]?.count ?? 1;

  if (!ranking.length) {
    return (
      <div className="mt-8 mb-12 rounded-[1.5rem] border border-dashed border-zinc-300 bg-white px-5 py-10 text-center">
        <Medal aria-hidden="true" className="mx-auto size-8 text-zinc-400" />
        <p className="mt-3 text-sm font-medium text-zinc-500">
          Nenhum {itemName} ranqueado ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-12">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-zinc-950">{title}</h2>
        <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        {topThree.map((operator, index) => (
          <motion.article
            key={operator.operatorName}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="relative overflow-hidden rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(15,23,42,0.12)]"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex size-14 items-center justify-center rounded-[1.25rem] bg-zinc-950 text-2xl shadow-[0_16px_36px_rgba(17,24,39,0.18)]">
                {medals[index]}
              </div>
              <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-600">
                <Crown aria-hidden="true" className="size-4" />
                Top {index + 1}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-2xl font-semibold text-zinc-950 truncate" title={operator.operatorName}>
                {operator.operatorName}
              </h3>
              <SubRoleTag subRole={operator.subRole} />
            </div>
            <p className="mt-0 text-sm text-zinc-500">
              {formatInteger(operator.count)} cartões registrados
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-zinc-50 p-3">
                <p className="text-xs font-medium text-zinc-500">Total</p>
                <p className="mt-1 text-base font-semibold text-zinc-950">
                  {formatCurrency(operator.totalInCents)}
                </p>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-3">
                <p className="text-xs font-medium text-zinc-500">Média</p>
                <p className="mt-1 text-base font-semibold text-zinc-950">
                  {formatCurrency(operator.averageInCents)}
                </p>
              </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${(operator.count / leaderCount) * 100}%`,
                  backgroundColor: operator.color,
                }}
              />
            </div>
          </motion.article>
        ))}
      </section>

      {remaining.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-zinc-500">Lista geral</p>
              <h3 className="mt-1 text-xl font-semibold text-zinc-950">Demais posições</h3>
            </div>
            <div className="flex size-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-600">
              <Trophy aria-hidden="true" className="size-5" />
            </div>
          </div>

          <div className="grid gap-3">
            {remaining.map((operator, index) => (
              <article
                key={operator.operatorName}
                className="flex flex-col gap-4 rounded-[1.5rem] border border-zinc-200/80 bg-white p-4 shadow-[0_14px_42px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_54px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-sm font-semibold text-zinc-700">
                    {index + 4}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: operator.color }}
                      />
                      <h4 className="truncate text-base font-semibold text-zinc-950" title={operator.operatorName}>
                        {operator.operatorName}
                      </h4>
                      <SubRoleTag subRole={operator.subRole} />
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      {formatInteger(operator.count)} cartões
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:min-w-80">
                  <div className="rounded-2xl bg-zinc-50 px-3 py-2">
                    <p className="text-xs font-medium text-zinc-500">Total</p>
                    <p className="text-sm font-semibold text-zinc-950">
                      {formatCurrency(operator.totalInCents)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 px-3 py-2">
                    <p className="text-xs font-medium text-zinc-500">Participação</p>
                    <p className="text-sm font-semibold text-zinc-950">
                      {operator.percentage.toFixed(0)}%
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function RankingView() {
  const { records, isLoading, error, refresh } = useRecords();
  const { user } = useAuth();
  const isGlobalAdmin = user?.role === "GLOBAL_ADMIN";
  
  const operatorRanking = useMemo(() => aggregateByOperator(records), [records]);
  const storeRanking = useMemo(() => aggregateByStore(records), [records]);

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
        eyebrow="Ranking"
        title="Melhores desempenhos"
        description="Classificação por quantidade de cartões registrados, com valor total como critério secundário."
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

      {isGlobalAdmin ? (
        <>
          <RankList 
            title="Rank de Lojas" 
            subtitle="As unidades com melhor desempenho na rede." 
            ranking={storeRanking} 
            itemName="loja" 
          />
          <RankList 
            title="Rank de Operadores" 
            subtitle="Os funcionários com mais registros consolidados." 
            ranking={operatorRanking} 
            itemName="operador" 
          />
        </>
      ) : (
        <RankList 
          title="Melhores Operadores" 
          subtitle="Os funcionários com mais registros nesta unidade." 
          ranking={operatorRanking} 
          itemName="operador" 
        />
      )}
    </PageContainer>
  );
}
