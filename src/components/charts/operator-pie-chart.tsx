"use client";

import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { motion } from "motion/react";
import { formatInteger } from "@/lib/utils/format";
import type { OperatorSummary } from "@/lib/records/types";
import { cn } from "@/lib/utils/cn";
import { SubRoleTag } from "@/components/ui/sub-role-tag";

type OperatorPieChartProps = {
  operators: OperatorSummary[];
  centerLabel: string;
  centerValue: string;
  tooltipLabel?: string;
  className?: string;
};

export function OperatorPieChart({
  operators,
  centerLabel,
  centerValue,
  tooltipLabel = "cartões",
  className,
}: OperatorPieChartProps) {
  const hasData = operators.length > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={cn(
        "overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-6",
        className,
      )}
    >
      <div className="relative mx-auto aspect-square w-full max-w-[360px]">
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase text-zinc-500">
              {centerLabel}
            </p>
            <p className="mt-2 text-4xl font-semibold text-zinc-950 sm:text-5xl">
              {centerValue}
            </p>
          </div>
        </div>

        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                cursor={false}
                wrapperStyle={{ zIndex: 100 }}
                formatter={(value, name) => [
                  `${formatInteger(Number(value))} ${tooltipLabel}`,
                  String(name),
                ]}
                contentStyle={{
                  borderRadius: 18,
                  border: "1px solid rgba(212, 212, 216, 0.9)",
                  boxShadow: "0 18px 50px rgba(15, 23, 42, 0.12)",
                }}
              />
              <Pie
                data={operators}
                dataKey="count"
                nameKey="operatorName"
                innerRadius="58%"
                outerRadius="82%"
                paddingAngle={3}
                cornerRadius={10}
                isAnimationActive
                animationDuration={900}
                animationEasing="ease-out"
                stroke="none"
              >
                {operators.map((operator) => (
                  <Cell key={operator.operatorName} fill={operator.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="absolute inset-[12%] rounded-full border border-dashed border-zinc-300 bg-transparent" />
        )}
      </div>

      <div className="mt-5 grid max-h-[140px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-200">
        {operators.map((operator) => (
          <div
            key={operator.operatorName}
            className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/80 px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: operator.color }}
              />
              <span className="truncate text-sm font-medium text-zinc-800">
                {operator.operatorName}
              </span>
              <SubRoleTag subRole={operator.subRole} />
            </div>
            <span className="shrink-0 text-sm font-semibold text-zinc-950">
              {formatInteger(operator.count)} {operator.count === 1 ? tooltipLabel.replace(/s$/, "") : tooltipLabel}
            </span>
          </div>
        ))}
      </div>
    </motion.section>
  );
}