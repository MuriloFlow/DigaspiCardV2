"use client";

import { motion } from "motion/react";
import {
  Activity,
  ArrowRightLeft,
  CheckCircle,
  CreditCard,
  DollarSign,
  Gauge,
  Keyboard,
  Percent,
  PieChart,
  ShoppingCart,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { formatCurrency, formatInteger } from "@/lib/utils/format";

type MonthAnalyticsProps = {
  totalCartoes: number;
  totalDigitacoes: number;
  totalClientes: number;
  taxaAproveitamento: number;
  taxaAprovacao: number;
  cartoesAtivosPerc: number;
  ativosNoCaixaPerc: number;
  ticketMedio: number;
  crescimentoCartoes: number;
  crescimentoValor: number;
  trocasCount: number;
  totalUsedInCents: number;
  cardsGoal?: number | null;
  salesGoalInCents?: number | null;
  salesInCents?: number;
  cardsPerDayTarget?: number | null;
  cardsPerDayRequired?: number | null;
  cardsGoalRemaining?: number | null;
};

export function MonthAnalytics({
  totalCartoes,
  totalDigitacoes,
  totalClientes,
  taxaAproveitamento,
  taxaAprovacao,
  cartoesAtivosPerc,
  ativosNoCaixaPerc,
  ticketMedio,
  crescimentoCartoes,
  crescimentoValor,
  trocasCount,
  totalUsedInCents,
  cardsGoal = null,
  salesGoalInCents = null,
  salesInCents = 0,
  cardsPerDayTarget = null,
  cardsPerDayRequired = null,
  cardsGoalRemaining = null,
}: MonthAnalyticsProps) {
  const formatPercent = (value: number) => `${Math.max(0, value).toFixed(1)}%`;
  const formatPerDay = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "--";
    return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)}/dia`;
  };

  const cardsGoalProgress = cardsGoal && cardsGoal > 0 ? (totalCartoes / cardsGoal) * 100 : 0;
  const salesGoalProgress =
    salesGoalInCents && salesGoalInCents > 0
      ? (salesInCents / salesGoalInCents) * 100
      : 0;

  const cards = [
    {
      title: "Total de Cartoes",
      value: formatInteger(totalCartoes),
      icon: CreditCard,
      color: "bg-blue-500",
      description: "Cartoes aprovados",
    },
    {
      title: "Total de Digitacoes",
      value: formatInteger(totalDigitacoes),
      icon: Keyboard,
      color: "bg-purple-500",
      description: "Tentativas registradas",
    },
    {
      title: "Fluxo de Clientes",
      value: formatInteger(totalClientes),
      icon: Users,
      color: "bg-orange-500",
      description: "Passaram no caixa",
    },
    {
      title: "Tx. Aproveitamento",
      value: `${taxaAproveitamento.toFixed(1)}%`,
      icon: Activity,
      color: "bg-emerald-500",
      description: "Adesao vs fluxo",
    },
    {
      title: "Tx. Aprovacao",
      value: `${taxaAprovacao.toFixed(1)}%`,
      icon: CheckCircle,
      color: "bg-indigo-500",
      description: "Aprovados vs digitacoes",
    },
    {
      title: "Ativados no Ato",
      value: `${cartoesAtivosPerc.toFixed(1)}%`,
      icon: Percent,
      color: "bg-pink-500",
      description: "Ativados na adesao",
    },
    {
      title: "Ativados no Caixa",
      value: `${ativosNoCaixaPerc.toFixed(1)}%`,
      icon: Percent,
      color: "bg-fuchsia-500",
      description: "Ativados pos-adesao",
    },
    {
      title: "Desemp. Cartoes M/M",
      value: formatPercent(crescimentoCartoes),
      icon: TrendingUp,
      color: crescimentoCartoes >= 100 ? "bg-emerald-500" : "bg-amber-500",
      description: "% do mes anterior",
    },
    {
      title: "Desemp. Valor M/M",
      value: formatPercent(crescimentoValor),
      icon: PieChart,
      color: crescimentoValor >= 100 ? "bg-emerald-500" : "bg-amber-500",
      description: "% do mes anterior",
    },
    {
      title: "Meta de Cartoes",
      value: cardsGoal ? `${formatInteger(totalCartoes)}/${formatInteger(cardsGoal)}` : "--",
      icon: Target,
      color: cardsGoalProgress >= 100 ? "bg-emerald-500" : "bg-sky-500",
      description: cardsGoal ? `${formatPercent(cardsGoalProgress)} concluido` : "Defina no menu do mes",
    },
    {
      title: "Ritmo Necessario",
      value: formatPerDay(cardsPerDayRequired ?? cardsPerDayTarget),
      icon: Gauge,
      color:
        cardsGoal && cardsGoalProgress >= 100
          ? "bg-emerald-500"
          : cardsPerDayRequired && cardsPerDayTarget && cardsPerDayRequired > cardsPerDayTarget
            ? "bg-amber-500"
            : "bg-cyan-500",
      description:
        cardsGoalRemaining !== null && cardsGoalRemaining !== undefined
          ? cardsGoalRemaining > 0
            ? `Faltam ${formatInteger(cardsGoalRemaining)} cartoes`
            : "Meta batida"
          : "Cartoes por dia",
    },
    {
      title: "Vendas Registradas",
      value: formatCurrency(salesInCents),
      icon: ShoppingCart,
      color: "bg-lime-600",
      description: salesGoalInCents ? `${formatPercent(salesGoalProgress)} da meta` : "Venda do periodo",
    },
    {
      title: "Meta de Venda",
      value: salesGoalInCents ? formatCurrency(salesGoalInCents) : "--",
      icon: Target,
      color: salesGoalProgress >= 100 ? "bg-emerald-500" : "bg-violet-500",
      description: salesGoalInCents ? "Objetivo do periodo" : "Defina no menu do mes",
    },
    {
      title: "Qnt. de Trocas",
      value: formatInteger(trocasCount),
      icon: ArrowRightLeft,
      color: "bg-amber-600",
      description: "Trocas de gerentes",
    },
    {
      title: "Valor Utilizado",
      value: formatCurrency(totalUsedInCents),
      icon: DollarSign,
      color: "bg-teal-500",
      description: "Cartoes ativados",
    },
    {
      title: "Ticket Medio",
      value: formatCurrency(ticketMedio),
      icon: DollarSign,
      color: "bg-zinc-900",
      description: "Valor por cartao",
    },
  ];

  return (
    <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3">
      {cards.map((card, idx) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: idx * 0.035 }}
          className="group relative overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-[0_14px_42px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-1 hover:border-zinc-300 hover:shadow-[0_20px_54px_rgba(15,23,42,0.06)]"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition group-hover:scale-110 ${card.color}`}>
              <card.icon className="size-5" />
            </div>
            <h4 className="text-[10px] font-bold uppercase leading-tight tracking-wider text-zinc-500">
              {card.title}
            </h4>
          </div>
          <div>
            <p className="break-words text-2xl font-black tracking-tight text-zinc-950">
              {card.value}
            </p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
              {card.description}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
