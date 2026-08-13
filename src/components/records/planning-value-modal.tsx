"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, Target, X } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useRecords } from "@/components/providers/records-provider";
import { cn } from "@/lib/utils/cn";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/utils/format";
import type { RecordsPayload } from "@/lib/records/types";
import { notifyRecordsChanged } from "@/lib/records/realtime-client";

type PlanningMode = "monthlyCardsGoal" | "monthlySalesGoal" | "dailySale";

type PlanningValueModalProps = {
  open: boolean;
  mode: PlanningMode;
  monthKey?: string;
  dateKey?: string;
  currentValue?: number | null;
  onClose: () => void;
};

const configs = {
  monthlyCardsGoal: {
    eyebrow: "Meta mensal",
    title: "Definir meta de cartoes",
    label: "Quantidade de cartoes",
    placeholder: "Ex: 120",
    action: "monthly-cards-goal",
    icon: Target,
    isCurrency: false,
  },
  monthlySalesGoal: {
    eyebrow: "Meta mensal",
    title: "Definir meta de venda",
    label: "Valor da venda",
    placeholder: "R$ 0,00",
    action: "monthly-sales-goal",
    icon: Target,
    isCurrency: true,
  },
  dailySale: {
    eyebrow: "Venda diaria",
    title: "Adicionar meta valor",
    label: "Valor vendido no dia",
    placeholder: "R$ 0,00",
    action: "daily-sale",
    icon: Target,
    isCurrency: true,
  },
} satisfies Record<PlanningMode, {
  eyebrow: string;
  title: string;
  label: string;
  placeholder: string;
  action: string;
  icon: typeof Target;
  isCurrency: boolean;
}>;

export function PlanningValueModal({
  open,
  mode,
  monthKey,
  dateKey,
  currentValue = null,
  onClose,
}: PlanningValueModalProps) {
  const { selectedStoreId, user } = useAuth();
  const { applyPayload } = useRecords();
  const config = configs[mode];
  const Icon = config.icon;
  const targetStoreId = selectedStoreId ?? user?.storeId ?? null;
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void Promise.resolve().then(() => {
      setError(null);
      setIsSubmitting(false);
      if (currentValue && currentValue > 0) {
        setValue(config.isCurrency ? formatCurrencyInput(String(currentValue)) : String(currentValue));
      } else {
        setValue("");
      }
    });
  }, [config.isCurrency, currentValue, open]);

  const numericValue = useMemo(() => {
    if (config.isCurrency) return parseCurrencyInput(value);
    return Number(value);
  }, [config.isCurrency, value]);
  const isMonthlyGoal = mode === "monthlyCardsGoal" || mode === "monthlySalesGoal";

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (isSubmitting) return;

    if (!targetStoreId) {
      setError("Selecione uma unidade antes de continuar.");
      return;
    }

    if (!Number.isFinite(numericValue) || numericValue < 0 || (!isMonthlyGoal && numericValue <= 0)) {
      setError(config.isCurrency ? "Informe um valor valido." : "Informe uma quantidade valida.");
      return;
    }

    const body: Record<string, unknown> = {
      action: config.action,
      storeId: targetStoreId,
    };

    if (mode === "dailySale") {
      if (!dateKey) {
        setError("Data nao identificada.");
        return;
      }
      body.dateKey = dateKey;
      body.amountInCents = numericValue;
    } else {
      if (!monthKey) {
        setError("Mes nao identificado.");
        return;
      }
      body.monthKey = monthKey;
      if (mode === "monthlyCardsGoal") body.cardsGoal = numericValue;
      if (mode === "monthlySalesGoal") body.salesGoalInCents = numericValue;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as
        | (Partial<RecordsPayload> & { message?: string })
        | { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "Nao foi possivel salvar.");
      }

      applyPayload(data as Partial<RecordsPayload>);
      notifyRecordsChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isSubmitting ? onClose : undefined}
          />
          <div className="fixed inset-x-0 bottom-0 z-[70] flex justify-center sm:inset-0 sm:items-center">
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ y: "100%", opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="flex w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2.5rem]"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      {config.eyebrow}
                    </p>
                    <h2 className="truncate text-lg font-bold text-zinc-950">
                      {config.title}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 p-6">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-zinc-800">
                    {config.label}
                  </span>
                  <input
                    type={config.isCurrency ? "text" : "number"}
                    min={config.isCurrency ? undefined : 0}
                    step={config.isCurrency ? undefined : 1}
                    inputMode={config.isCurrency ? "decimal" : "numeric"}
                    value={value}
                    onChange={(event) => {
                      setError(null);
                      setValue(
                        config.isCurrency
                          ? formatCurrencyInput(event.target.value)
                          : event.target.value,
                      );
                    }}
                    placeholder={config.placeholder}
                    disabled={isSubmitting}
                    className={cn(
                      "h-14 w-full rounded-2xl border bg-white px-5 text-xl font-bold text-zinc-950 outline-none transition focus:ring-4",
                      error
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/15"
                        : "border-zinc-200 focus:border-zinc-950 focus:ring-zinc-950/10",
                    )}
                    autoComplete="off"
                  />
                </label>

                {isMonthlyGoal ? (
                  <p className="-mt-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Digite 0 para apagar a meta deste mes.
                  </p>
                ) : null}

                {error ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting || !value.trim()}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Salvar
                </button>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
