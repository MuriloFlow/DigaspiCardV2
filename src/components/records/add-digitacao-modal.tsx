"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  ChevronLeft,
  Keyboard,
  Loader2,
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useDigitacoes } from "@/components/providers/digitacoes-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { CustomSelect } from "@/components/ui/custom-select";
import { cn } from "@/lib/utils/cn";
import { StoreSelector } from "./store-selector";
import { notifyRecordsChanged } from "@/lib/records/realtime-client";

type Step = "select-collab" | "add-clients";

type Collaborator = { value: string; label: string; icon?: React.ReactNode };

export function AddDigitacaoModal({
  open,
  onClose,
  stores = [],
  dateKey,
}: {
  open: boolean;
  onClose: () => void;
  stores?: { id: string; name: string }[];
  dateKey?: string;
}) {
  const { createDigitacao, isCreating, refresh } = useDigitacoes();
  const { user, selectedStoreId } = useAuth();
  
  const isGlobalOrRegional = user?.role === "GLOBAL_ADMIN" || user?.role === "TI_ADMIN" || user?.role === "REGIONAL_MANAGER";
  // For non-global users (EMPLOYEE, MANAGER, VM), use their fixed storeId
  const userStoreId = user?.storeId ?? null;

  const [step, setStep] = useState<Step>("select-collab");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoadingCollabs, setIsLoadingCollabs] = useState(false);
  const [localStoreId, setLocalStoreId] = useState<string | null>(null);
  
  const [selectedCollabId, setSelectedCollabId] = useState("");
  const [selectedCollabName, setSelectedCollabName] = useState("");
  const [clientName, setClientName] = useState("");
  const [registeredNames, setRegisteredNames] = useState<{id: string, name: string}[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successFlash, setSuccessFlash] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Effective store: global/regional use selectedStoreId or localStoreId; others use their storeId directly
  const effectiveStoreId = isGlobalOrRegional ? (selectedStoreId || localStoreId) : (userStoreId || selectedStoreId || localStoreId);

  // Reset state on open
  useEffect(() => {
    if (!open) return;
    setStep("select-collab");
    setSelectedCollabId("");
    setSelectedCollabName("");
    setClientName("");
    setRegisteredNames([]);
    setErrorMsg(null);
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

  useEffect(() => {
    if (step === "add-clients") setTimeout(() => inputRef.current?.focus(), 120);
  }, [step]);

  function handleCollabConfirm() {
    if (!selectedCollabId || selectedCollabId.startsWith("__header_")) {
      setErrorMsg("Selecione um funcionário.");
      return;
    }
    const collab = collaborators.find((c) => c.value === selectedCollabId);
    setSelectedCollabName(collab?.label ?? "");
    setErrorMsg(null);
    setStep("add-clients");
  }

  async function handleAddClient() {
    if (isCreating) return;
    const name = clientName.trim();
    if (!name) return;
    setErrorMsg(null);
    try {
      const newDig = await createDigitacao(selectedCollabId, name, dateKey);
      setRegisteredNames((prev) => [{id: newDig.id, name}, ...prev]);
      setClientName("");
      setSuccessFlash(true);
      setTimeout(() => setSuccessFlash(false), 800);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  async function handleDeleteDigitacao(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/digitacoes?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao deletar");
      setRegisteredNames((prev) => prev.filter(item => item.id !== id));
      await refresh();
      notifyRecordsChanged();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); void handleAddClient(); }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="dig-backdrop"
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key="dig-panel"
            initial={{ y: "100%", opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[60] flex w-full flex-col overflow-visible rounded-t-[2rem] bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="mx-auto mt-4 h-1 w-12 rounded-full bg-zinc-200 " />

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
              {step === "add-clients" && (
                <button type="button" onClick={() => setStep("select-collab")}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 :bg-zinc-800">
                  <ChevronLeft className="size-4" />
                </button>
              )}
              {/* Ícone neutro (sem cor amarela) */}
              <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-900 text-[#ffffff] shrink-0">
                <Keyboard className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 ">
                  {step === "select-collab" ? "Nova Digitação" : "Adicionando para"}
                </p>
                <h3 className="text-base font-bold text-zinc-950 truncate">
                  {step === "select-collab" ? "Selecione o Funcionário" : selectedCollabName}
                </h3>
              </div>
              <button type="button" onClick={onClose}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-400 transition hover:bg-zinc-50 :bg-zinc-800 hover:text-zinc-700 :text-zinc-300">
                <X className="size-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5 pb-10">
              <AnimatePresence mode="wait">
                {/* Step 1 — Select Collaborator */}
                {step === "select-collab" && (
                  <motion.div key="step-collab"
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
                      {errorMsg && <p className="text-sm font-medium text-rose-600">{errorMsg}</p>}
                    </label>
                    <button type="button" onClick={handleCollabConfirm}
                      disabled={!selectedCollabId || selectedCollabId.startsWith("__header_")}
                      className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-black px-5 text-sm font-bold text-[#ffffff] shadow-md transition hover:bg-zinc-800 disabled:opacity-50 active:scale-[0.98]">
                      Continuar →
                    </button>
                  </motion.div>
                )}

                {/* Step 2 — Add clients in batch */}
                {step === "add-clients" && (
                  <motion.div key="step-clients"
                    initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}
                    className="grid gap-4"
                  >
                    {/* Count badge — único elemento com cor de destaque */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 border border-emerald-200">
                        <Check className="size-3.5" />
                        {registeredNames.length} digitação{registeredNames.length !== 1 ? "ões" : ""} registrada{registeredNames.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-zinc-800">Nome do Cliente</span>
                      <span className={cn(
                        "flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 transition duration-200 focus-within:border-zinc-950 focus-within:ring-4 focus-within:ring-zinc-950/10",
                        successFlash ? "border-emerald-400 bg-emerald-50" : "border-zinc-200",
                      )}>
                        <UserRound className="size-5 shrink-0 text-zinc-400" />
                        <input
                          ref={inputRef}
                          value={clientName}
                          onChange={(e) => { setClientName(e.target.value); setErrorMsg(null); }}
                          onKeyDown={handleKeyDown}
                          placeholder="Ex: Roberto Souza"
                          className="min-w-0 flex-1 bg-transparent text-base text-zinc-950 outline-none placeholder:text-zinc-400"
                          autoComplete="off"
                        />
                        {successFlash && <Check className="size-5 shrink-0 text-emerald-500" />}
                      </span>
                      {errorMsg && <p className="text-sm font-medium text-rose-600">{errorMsg}</p>}
                    </label>

                    <p className="text-xs text-zinc-400 ">
                      Pressione <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono font-bold text-zinc-600 ">Enter</kbd> ou clique em Adicionar para registrar e continuar.
                    </p>

                    <button type="button" onClick={handleAddClient}
                      disabled={isCreating || !clientName.trim()}
                      className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-black px-5 text-sm font-bold text-[#ffffff] shadow-md transition hover:bg-zinc-800 :bg-zinc-200 disabled:opacity-50 active:scale-[0.98]">
                      {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                      {isCreating ? "Salvando..." : "Adicionar"}
                    </button>

                    <AnimatePresence>
                      {registeredNames.length > 0 && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 ">
                            Registrados nessa sessão
                          </p>
                          <div className="max-h-40 overflow-y-auto rounded-2xl border border-zinc-100 bg-zinc-50 divide-y divide-zinc-100 ">
                            {registeredNames.map((item) => (
                              <motion.div key={item.id}
                                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                                className="flex items-center justify-between gap-2 px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <Check className="size-3.5 shrink-0 text-emerald-500 " />
                                  <span className="text-sm font-medium text-zinc-800 ">{item.name}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDigitacao(item.id)}
                                  disabled={deletingId === item.id}
                                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-rose-50 :bg-rose-500/10 hover:text-rose-500 :text-rose-400 disabled:opacity-50"
                                >
                                  {deletingId === item.id ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="size-3.5" />
                                  )}
                                </button>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
