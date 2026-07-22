"use client";

import { motion } from "motion/react";
import { 
  CreditCard, 
  Keyboard, 
  Users, 
  Percent, 
  CheckCircle, 
  Activity,
  TrendingUp,
  DollarSign,
  PieChart
} from "lucide-react";
import { formatCurrency, formatInteger } from "@/lib/utils/format";

type MonthAnalyticsProps = {
  totalCartoes: number;
  totalDigitacoes: number;
  totalClientes: number;
  taxaAproveitamento: number;
  taxaAprovacao: number;
  cartoesAtivosPerc: number;
  ticketMedio: number;
  crescimentoCartoes: number; // % month over month
  crescimentoValor: number; // % month over month
};

export function MonthAnalytics({
  totalCartoes,
  totalDigitacoes,
  totalClientes,
  taxaAproveitamento,
  taxaAprovacao,
  cartoesAtivosPerc,
  ticketMedio,
  crescimentoCartoes,
  crescimentoValor,
}: MonthAnalyticsProps) {
  const cards = [
    {
      title: "Total de Cartões",
      value: formatInteger(totalCartoes),
      icon: CreditCard,
      color: "bg-blue-500",
      description: "Cartões aprovados",
    },
    {
      title: "Total de Digitações",
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
      description: "Adesão vs Fluxo",
    },
    {
      title: "Tx. Aprovação",
      value: `${taxaAprovacao.toFixed(1)}%`,
      icon: CheckCircle,
      color: "bg-indigo-500",
      description: "Aprovados vs Digitações",
    },
    {
      title: "Cartões Ativos",
      value: `${cartoesAtivosPerc.toFixed(1)}%`,
      icon: Percent,
      color: "bg-pink-500",
      description: "Ativados no ato",
    },
    {
      title: "Cresc. Cartões (M/M)",
      value: `${crescimentoCartoes > 0 ? "+" : ""}${crescimentoCartoes.toFixed(1)}%`,
      icon: TrendingUp,
      color: crescimentoCartoes >= 0 ? "bg-emerald-500" : "bg-red-500",
      description: "Vs. mês anterior",
    },
    {
      title: "Cresc. Valor (M/M)",
      value: `${crescimentoValor > 0 ? "+" : ""}${crescimentoValor.toFixed(1)}%`,
      icon: PieChart,
      color: crescimentoValor >= 0 ? "bg-emerald-500" : "bg-red-500",
      description: "Vs. mês anterior",
    },
    {
      title: "Ticket Médio",
      value: formatCurrency(ticketMedio),
      icon: DollarSign,
      color: "bg-zinc-900",
      description: "Valor por cartão",
    },
  ];

  return (
    <div className="mb-8 grid gap-4 grid-cols-2 md:grid-cols-3">
      {cards.map((card, idx) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: idx * 0.05 }}
          className="group relative overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-[0_14px_42px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_20px_54px_rgba(15,23,42,0.06)] hover:-translate-y-1 hover:border-zinc-300"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition group-hover:scale-110 ${card.color}`}>
              <card.icon className="size-5" />
            </div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 leading-tight">
              {card.title}
            </h4>
          </div>
          <div>
            <p className="text-2xl font-black tracking-tight text-zinc-950">
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
