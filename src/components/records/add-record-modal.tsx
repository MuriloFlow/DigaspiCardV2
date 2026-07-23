"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  ChevronLeft,
  CreditCard,
  Loader2,
  UserRound,
  X,
} from "lucide-react";
import { createRecordSchema } from "@/lib/records/schema";
import type { CreateRecordPayload, OperatorRecord } from "@/lib/records/types";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { CustomSelect } from "@/components/ui/custom-select";
import { useAuth } from "@/components/providers/auth-provider";
import { StoreSelector } from "./store-selector";

type Step = "select-collab" | "client-name" | "value-activated";
type Collaborator = { value: string; label: string; icon?: React.ReactNode };

type AddRecordModalProps = {
  open: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onCreate: (payload: CreateRecordPayload) => Promise<OperatorRecord>;
  onCreated?: (record: OperatorRecord) => void;
  stores?: { id: string; name: string }[];
  dateKey?: string;
};

export function AddRecordModal({
  open,
  isSubmitting,
  onClose,
  onCreate,
  onCreated,
  stores = [],
  dateKey,
}: AddRecordModalProps) {
  const [step, setStep] = useState<Step>("select-collab");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoadingCollabs, setIsLoadingCollabs] = useState(false);
  const { user, selectedStoreId } = useAuth();
  const [localStoreId, setLocalStoreId] = useState<string | null>(null);
  
  const isGlobalOrRegional = user?.role === "GLOBAL_ADMIN" || user?.role === "TI_ADMIN" || user?.role === "REGIONAL_MANAGER";
  const userStoreId = user?.storeId ?? null;

  const [selectedCollabId, setSelectedCollabId] = useState("");
  const [selectedCollabName, setSelectedCollabName] = useState("");
  const [clientName, setClientName] = useState("");
  const [amount, setAmount] = useState("");
  const [activated, setActivated] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const clientInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const amountInCents = useMemo(() => parseCurrencyInput(amount), [amount]);

  // Effective store: global/regional use selectedStoreId or localStoreId; others use their storeId directly
  const effectiveStoreId = isGlobalOrRegional ? (selectedStoreId || localStoreId) : (userStoreId || selectedStoreId || localStoreId);

  // Reset state on open
  useEffect(() => {
    if (!open) return;
    setStep("select-collab");
    setSelectedCollabId("");
    setSelectedCollabName("");
    setClientName("");
    setAmount("");
    setActivated(false);
    setErrorMsg(null);
    setApiError(null);
    setLocalStoreId(null);
  }, [open]);

  // Load collaborators when effectiveStoreId changes
  useEffect(() => {
    if (!open) return;
    
    if (!effectiveStoreId) {
      setCollaborators([]);
      return; // Force selecting a store first
    }

    setIsLoadingCollabs(true);

    const storeQuery = effectiveStoreId ? `?storeId=${effectiveStoreId}` : "";

    Promise.all([
      fetch(`/api/collaborators${storeQuery}`).then((r) => r.json()),
      fetch(`/api/managers${storeQuery}`).then((r) => r.json()).catch(() => ({ managers: [] })),
    ])
      .then(([collabData, managerData]) => {
        type RoleConfig = { label: string; groupLabel: string; cls: string; order: number };
        const roleConfig: Record<string, RoleConfig> = {
          "Funcionario Operacional": { label: "Operador", groupLabel: "Operadores", cls: "bg-purple-100 text-purple-700", order: 0 },
          Caixa: { label: "Caixa", groupLabel: "Caixa", cls: "bg-blue-100 text-blue-700", order: 1 },
          "Lider de Caixa": { label: "Líder de Caixa", groupLabel: "Líder de Caixa", cls: "bg-rose-100 text-rose-700", order: 2 },
          VM: { label: "VM", groupLabel: "VM", cls: "bg-pink-100 text-pink-700", order: 3 },
          Vendedor: { label: "Vendedor", groupLabel: "Vendedores", cls: "bg-emerald-100 text-emerald-700", order: 4 },
        };
        const result: Collaborator[] = [];
        if (collabData.collaborators) {
          const active = (collabData.collaborators as { id: string; name: string; subRole?: string; isActive: boolean }[]).filter((c) => c.isActive);
          active.sort((a, b) => {
            const oA = roleConfig[a.subRole ?? ""]?.order ?? 99;
            const oB = roleConfig[b.subRole ?? ""]?.order ?? 99;
            return oA !== oB ? oA - oB : a.name.localeCompare(b.name, "pt-BR");
          });
          let lastGroup = "";
          for (const c of active) {
            const cfg = roleConfig[c.subRole ?? ""];
            result.push({
              value: c.id, 
              label: c.name,
              icon: cfg ? (
                <span className={`inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.cls}`}>
                  {cfg.label}
                </span>
              ) : undefined,
            });
          }
        }
        const managers = (managerData.managers ?? []) as { id: string; name: string; role: string }[];
        if (managers.length > 0) {
          managers.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
          for (const m of managers) {
            result.push({
              value: m.id,
              label: m.name,
              icon: (
                <span className="inline-flex shrink-0 rounded-md bg-yellow-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-yellow-700">
                  {m.role === "VM" ? "VM" : "Gerente"}
                </span>
              ),
            });
          }
        }
        setCollaborators(result);
      })
      .finally(() => setIsLoadingCollabs(false));
  }, [open, effectiveStoreId, selectedStoreId]);

  // Auto-focus on step transitions
  useEffect(() => {
    if (step === "client-name") setTimeout(() => clientInputRef.current?.focus(), 120);
    if (step === "value-activated") setTimeout(() => amountInputRef.current?.focus(), 120);
  }, [step]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !isSubmitting) onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, isSubmitting, onClose]);

  // ── Step handlers ──────────────────────────────────────────────

  function handleStep1() {
    if (!selectedCollabId || selectedCollabId.startsWith("__header_")) {
      setErrorMsg("Selecione um funcionário."); return;
    }
    const collab = collaborators.find((c) => c.value === selectedCollabId);
    setSelectedCollabName(collab?.label ?? "");
    setErrorMsg(null);
    setStep("client-name");
  }

  function handleStep2() {
    if (!clientName.trim()) { setErrorMsg("Digite o nome do cliente."); return; }
    setErrorMsg(null);
    setStep("value-activated");
  }

  async function handleSubmit() {
    setApiError(null);
    const validation = createRecordSchema.safeParse({
      collaboratorId: selectedCollabId,
      clientName,
      amountInCents,
      activated,
    });
    if (!validation.success) {
      const issue = validation.error.issues[0];
      setApiError(issue?.message ?? "Dados inválidos.");
      return;
    }
    try {
      const payload = validation.data;
      if (dateKey) payload.dateKey = dateKey;
      const record = await onCreate(payload);
      onCreated?.(record);
      setTimeout(onClose, 400);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Não foi possível salvar o registro.");
    }
  }

  function goBack() {
    setErrorMsg(null);
    if (step === "client-name") setStep("select-collab");
    if (step === "value-activated") setStep("client-name");
  }

  // Step label for header eyebrow
  const stepLabel = step === "select-collab" ? "Passo 1 de 3" : step === "client-name" ? "Passo 2 de 3" : "Passo 3 de 3";
  const stepTitle = step === "select-collab"
    ? "Quem está registrando?"
    : step === "client-name"
      ? selectedCollabName
      : selectedCollabName;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="rc-backdrop"
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { if (!isSubmitting) onClose(); }}
          />
          <motion.div
            key="rc-panel"
            className="fixed bottom-0 left-0 right-0 z-[60] flex w-full flex-col overflow-visible rounded-t-[2rem] bg-white shadow-2xl"
            initial={{ y: "100%", opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
          >
            <div className="mx-auto mt-4 h-1 w-12 rounded-full bg-zinc-200 " />

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
              {step !== "select-collab" && (
                <button type="button" onClick={goBack}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 :bg-zinc-800">
                  <ChevronLeft className="size-4" />
                </button>
              )}
              <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-900 text-[#ffffff] shrink-0">
                <CreditCard className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 ">
                  {step === "select-collab" ? "Passo 1 de 3" : step === "client-name" ? "Passo 2 de 3" : "Passo 3 de 3"}
                </p>
                <h3 className="text-base font-bold text-zinc-950 truncate">
                  {step === "select-collab" ? "Quem está registrando?" : selectedCollabName}
                </h3>
              </div>
              <button type="button" onClick={() => { if (!isSubmitting) onClose(); }}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-400 transition hover:bg-zinc-50 :bg-zinc-800 hover:text-zinc-700 :text-zinc-300">
                <X className="size-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5 pb-10">
              <AnimatePresence mode="wait">

                {/* ── Step 1: Select Collaborator ── */}
                {step === "select-collab" && (
                  <motion.div key="s1"
                    initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.2 }}
                    className="grid gap-4"
                  >
                    {!selectedStoreId && stores.length > 0 && (
                      <StoreSelector
                        stores={stores}
                        selectedStoreId={localStoreId}
                        onChange={setLocalStoreId}
                        allowAll={false}
                      />
                    )}
                    <label className={cn("grid gap-2", !effectiveStoreId && !selectedStoreId ? "opacity-50 pointer-events-none" : "")}>
                      <span className="text-sm font-semibold text-zinc-800 ">Funcionário</span>
                      <CustomSelect
                        options={collaborators}
                        value={selectedCollabId}
                        onChange={(v) => { setSelectedCollabId(v); setErrorMsg(null); }}
                        placeholder={isLoadingCollabs ? "Carregando..." : (!effectiveStoreId && !selectedStoreId ? "Selecione uma unidade primeiro" : "Selecione o funcionário")}
                        disabled={isLoadingCollabs || (!effectiveStoreId && !selectedStoreId)}
                      />
                      {errorMsg && <p className="text-sm font-medium text-rose-600 ">{errorMsg}</p>}
                    </label>
                    <button type="button" onClick={handleStep1}
                      disabled={!selectedCollabId || selectedCollabId.startsWith("__header_")}
                      className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-black px-5 text-sm font-bold text-[#ffffff] shadow-md transition hover:bg-zinc-800 :bg-zinc-200 disabled:opacity-50 active:scale-[0.98]">
                      Continuar →
                    </button>
                  </motion.div>
                )}

                {/* ── Step 2: Client Name ── */}
                {step === "client-name" && (
                  <motion.div key="s2"
                    initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}
                    className="grid gap-4"
                  >
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-zinc-800 ">Nome do Cliente</span>
                      <span className={cn(
                        "flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 transition duration-200 focus-within:border-zinc-950 :border-white focus-within:ring-4 focus-within:ring-zinc-950/10 :ring-white/10",
                        errorMsg ? "border-rose-300 " : "border-zinc-200 ",
                      )}>
                        <UserRound className="size-5 shrink-0 text-zinc-400 " />
                        <input
                          ref={clientInputRef}
                          value={clientName}
                          onChange={(e) => { setClientName(e.target.value); setErrorMsg(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleStep2(); } }}
                          placeholder="Ex: Helena Prado"
                          className="min-w-0 flex-1 bg-transparent text-base text-zinc-950 outline-none placeholder:text-zinc-400 :text-zinc-500"
                          autoComplete="off"
                        />
                      </span>
                      {errorMsg && <p className="text-sm font-medium text-rose-600 ">{errorMsg}</p>}
                    </label>
                    <button type="button" onClick={handleStep2}
                      disabled={!clientName.trim()}
                      className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-black px-5 text-sm font-bold text-[#ffffff] shadow-md transition hover:bg-zinc-800 :bg-zinc-200 disabled:opacity-50 active:scale-[0.98]">
                      Continuar →
                    </button>
                  </motion.div>
                )}

                {/* ── Step 3: Value + Activated ── */}
                {step === "value-activated" && (
                  <motion.div key="s3"
                    initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}
                    className="grid gap-4"
                  >
                    <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 ">
                      <span className="font-semibold text-zinc-800 ">{selectedCollabName}</span>
                      {" · "}
                      <span>{clientName}</span>
                    </div>

                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-zinc-800 ">Valor do Cartão</span>
                      <span className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 transition duration-200 focus-within:border-zinc-950 :border-white focus-within:ring-4 focus-within:ring-zinc-950/10 :ring-white/10">
                        <CreditCard className="size-5 shrink-0 text-zinc-400 " />
                        <input
                          ref={amountInputRef}
                          inputMode="numeric"
                          value={amount}
                          onChange={(e) => setAmount(formatCurrencyInput(e.target.value))}
                          placeholder="R$ 0,00"
                          className="min-w-0 flex-1 bg-transparent text-base text-zinc-950 outline-none placeholder:text-zinc-400 :text-zinc-500"
                        />
                      </span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3.5 transition hover:border-zinc-300 :border-zinc-700 hover:bg-zinc-50 :bg-zinc-800">
                      <div className="relative">
                        <input type="checkbox" checked={activated} onChange={(e) => setActivated(e.target.checked)} className="peer sr-only" />
                        <div className={cn(
                          "flex size-6 items-center justify-center rounded-lg border-2 transition duration-200",
                          activated ? "border-emerald-500 bg-emerald-500" : "border-zinc-300 bg-white "
                        )}>
                          {activated && <Check className="size-4 text-[#ffffff]" strokeWidth={3} />}
                        </div>
                      </div>
                      <div className="flex-1">
                        <span className="block text-sm font-bold text-zinc-900 ">Cartão Ativado</span>
                        <span className="block text-xs text-zinc-500 ">Ativação realizada junto ao caixa</span>
                      </div>
                    </label>

                    {apiError && (
                      <p className="text-sm font-medium text-rose-600 ">{apiError}</p>
                    )}

                    <button type="button" onClick={handleSubmit} disabled={isSubmitting}
                      className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-black px-5 text-sm font-bold text-[#ffffff] shadow-md transition hover:bg-zinc-800 :bg-zinc-200 disabled:opacity-50 active:scale-[0.98]">
                      {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      {isSubmitting ? "Salvando..." : "Salvar Registro"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
