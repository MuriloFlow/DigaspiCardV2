"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, CreditCard, Loader2, UserRound, X, AlertTriangle } from "lucide-react";
import { createRecordSchema } from "@/lib/records/schema";
import type {
  CreateRecordPayload,
  OperatorRecord,
} from "@/lib/records/types";
import {
  formatCurrencyInput,
  parseCurrencyInput,
} from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { CustomSelect } from "@/components/ui/custom-select";

type FieldErrors = Partial<
  Record<"operatorName" | "clientName" | "amountInCents", string>
>;

type AddRecordModalProps = {
  open: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onCreate: (payload: CreateRecordPayload) => Promise<OperatorRecord>;
  onCreated?: (record: OperatorRecord) => void;
};

type SimilarResult = { id: string; name: string; similarity: number };

function FieldError({ children }: { children?: string }) {
  return children ? (
    <p className="mt-2 text-sm font-medium text-rose-600">{children}</p>
  ) : null;
}

export function AddRecordModal({
  open,
  isSubmitting,
  onClose,
  onCreate,
  onCreated,
}: AddRecordModalProps) {
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [operatorName, setOperatorName] = useState("");
  const [clientName, setClientName] = useState("");
  const [amount, setAmount] = useState("");
  const [activated, setActivated] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [collaborators, setCollaborators] = useState<{ value: string; label: string }[]>([]);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);

  const amountInCents = useMemo(() => parseCurrencyInput(amount), [amount]);

  useEffect(() => {
    if (open && collaborators.length === 0) {
      setIsLoadingCollaborators(true);
      fetch("/api/collaborators")
        .then(r => r.json())
        .then(d => {
          if (d.collaborators) {
            // Filtra para pegar apenas os funcionários ativos
            const activeEmployees = (d.collaborators as { name: string; username: string; role: string; is_active: boolean }[])
              .filter(c => c.is_active && c.role === "EMPLOYEE")
              .map(c => ({
                value: c.name || c.username,
                label: c.name || c.username
              }));
            setCollaborators(activeEmployees);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingCollaborators(false));
    }
  }, [open, collaborators.length]);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => firstInputRef.current?.focus(), 80);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onClose, open]);

  useEffect(() => {
    if (open) {
      const timeout = window.setTimeout(() => {
        setErrors({});
        setApiError(null);
        setSaved(false);
      }, 0);
      return () => window.clearTimeout(timeout);
    }
    const timeout = window.setTimeout(() => {
      setOperatorName("");
      setClientName("");
      setAmount("");
      setActivated(false);
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApiError(null);
    setSaved(false);

    const validation = createRecordSchema.safeParse({
      operatorName,
      clientName,
      amountInCents,
      activated,
    });

    if (!validation.success) {
      const nextErrors: FieldErrors = {};
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FieldErrors | undefined;
        if (field) nextErrors[field] = issue.message;
      });
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    try {
      const record = await onCreate(validation.data);
      setSaved(true);
      onCreated?.(record);
      window.setTimeout(onClose, 420);
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar o registro.",
      );
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            aria-label="Fechar modal"
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            type="button"
            onClick={() => { if (!isSubmitting) onClose(); }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-record-title"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.22)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">Novo registro</p>
                <h2 id="new-record-title" className="mt-1 text-2xl font-semibold text-zinc-950">
                  Registrar cartao
                </h2>
              </div>
              <button
                type="button" aria-label="Fechar" disabled={isSubmitting} onClick={onClose}
                className="flex size-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition duration-300 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-5 px-6 py-6">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-zinc-800">Nome do Funcionário</span>
                <CustomSelect
                  options={collaborators}
                  value={operatorName}
                  onChange={setOperatorName}
                  placeholder={isLoadingCollaborators ? "Carregando funcionários..." : "Selecione o funcionário"}
                  disabled={isLoadingCollaborators}
                />
                <FieldError>{errors.operatorName}</FieldError>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-zinc-800">Nome do Cliente</span>
                <span className={cn(
                  "flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 transition duration-300 focus-within:border-zinc-950 focus-within:ring-4 focus-within:ring-zinc-950/10",
                  errors.clientName ? "border-rose-300" : "border-zinc-200",
                )}>
                  <UserRound aria-hidden="true" className="size-5 shrink-0 text-zinc-400" />
                  <input value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                    placeholder="Ex: Helena Prado"
                    className="min-w-0 flex-1 bg-transparent text-base text-zinc-950 outline-none placeholder:text-zinc-400"
                    autoComplete="off" />
                </span>
                <FieldError>{errors.clientName}</FieldError>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-zinc-800">Valor do Cartao</span>
                <span className={cn(
                  "flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 transition duration-300 focus-within:border-zinc-950 focus-within:ring-4 focus-within:ring-zinc-950/10",
                  errors.amountInCents ? "border-rose-300" : "border-zinc-200",
                )}>
                  <CreditCard aria-hidden="true" className="size-5 shrink-0 text-zinc-400" />
                  <input inputMode="numeric" value={amount}
                    onChange={(event) => setAmount(formatCurrencyInput(event.target.value))}
                    placeholder="R$ 0,00"
                    className="min-w-0 flex-1 bg-transparent text-base text-zinc-950 outline-none placeholder:text-zinc-400" />
                </span>
                <FieldError>{errors.amountInCents}</FieldError>
              </label>

              {/* Activated checkbox */}
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3.5 transition duration-300 hover:border-zinc-300 hover:bg-zinc-50">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={activated}
                    onChange={(e) => setActivated(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className={cn(
                    "flex size-6 items-center justify-center rounded-lg border-2 transition duration-200",
                    activated
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-zinc-300 bg-white"
                  )}>
                    {activated && <Check className="size-4 text-white" strokeWidth={3} />}
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-zinc-800">Cartão Ativado?</span>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {activated ? "✓ Cartão será registrado como ativo" : "Marque se o cliente confirmou a ativação"}
                  </p>
                </div>
                <span className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold transition",
                  activated ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-500"
                )}>
                  {activated ? "Ativo" : "Pendente"}
                </span>
              </label>

              {apiError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{apiError}</div>
              ) : null}

              {saved ? (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  <Check aria-hidden="true" className="size-4" />
                  Registro salvo com sucesso.
                </div>
              ) : null}

              <button type="submit" disabled={isSubmitting}
                className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(17,24,39,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-950/15 active:translate-y-0 disabled:cursor-wait disabled:opacity-75">
                {isSubmitting ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Check aria-hidden="true" className="size-4" />}
                {isSubmitting ? "Salvando..." : "Salvar registro"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
