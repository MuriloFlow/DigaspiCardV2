"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, Users, ChevronRight, Trash2, Edit3,
  GitMerge, Loader2, AlertTriangle, Check, X, ArrowLeft,
  Timer, Calendar, UserCheck, UserMinus, RotateCcw, Plus, Building, Edit2, ShieldCheck, ShieldOff, Power
} from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { getOperatorColor } from "@/lib/records/colors";
import { formatCurrency, formatInteger, formatTime } from "@/lib/utils/format";
import { toDateKey, formatLongDate } from "@/lib/utils/format";
import type { OperatorRecord, Collaborator } from "@/lib/records/types";
import { cn } from "@/lib/utils/cn";
import { CustomSelect } from "@/components/ui/custom-select";

type Store = { id: string; name: string };

// ─── Modal de Criação de Colaborador ─────────────────────────────────────────
function CreateCollaboratorModal({
  stores,
  isGlobalAdmin,
  userStoreId,
  onClose,
  onCreated,
}: {
  stores: Store[];
  isGlobalAdmin: boolean;
  userStoreId?: string | null;
  onClose: () => void;
  onCreated: (name: string, storeId: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [storeId, setStoreId] = useState(isGlobalAdmin ? "" : (userStoreId ?? ""));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Nome é obrigatório."); return; }
    if (!storeId) { setError("Selecione a unidade."); return; }
    setIsLoading(true);
    setError("");
    try {
      await onCreated(name.trim(), storeId);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar.");
    } finally {
      setIsLoading(false);
    }
  }

  const selectedStore = stores.find(s => s.id === storeId);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: "spring", damping: 28, stiffness: 380 }}
        className="relative w-full max-w-md rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-2xl"
      >
        <button onClick={onClose} className="absolute right-5 top-5 rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 transition">
          <X className="size-5" />
        </button>

        <div className="mb-6">
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-zinc-950">
            <Plus className="size-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-zinc-950">Novo Colaborador</h2>
          <p className="mt-1 text-sm text-zinc-500">Preencha os dados para cadastrar na equipe.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 uppercase tracking-wide">Nome do Colaborador</label>
            <input
              required autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
              placeholder="Ex: João Silva"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 uppercase tracking-wide">
              Unidade (Loja)
            </label>
            {stores.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <Building className="size-4 shrink-0 text-amber-500" />
                <p className="text-xs font-medium text-amber-700">Nenhuma unidade cadastrada. Crie uma primeiro.</p>
              </div>
            ) : (
              <CustomSelect
                value={storeId}
                onChange={setStoreId}
                placeholder="Selecione a unidade..."
                disabled={!isGlobalAdmin && !!userStoreId}
                options={stores.map(s => ({ value: s.id, label: s.name }))}
              />
            )}
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-50">
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Cadastrar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

async function apiRequest(body: Record<string, unknown>) {
  const res = await fetch("/api/collaborators", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const d = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(d.message ?? "Erro na operação.");
  }
  return res.json();
}

// ─── Modal de Opções do Colaborador ──────────────────────────────────────────
function CollaboratorOptionsModal({
  collab,
  isOpen,
  onClose,
  onToggleActive,
  onHardDelete,
  loadingAction,
}: {
  collab: Collaborator | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleActive: () => void;
  onHardDelete: () => void;
  loadingAction: string | null;
}) {
  if (!isOpen || !collab) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-zinc-950/20 backdrop-blur-sm sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-md overflow-hidden rounded-t-[2rem] sm:rounded-[2rem] bg-white shadow-2xl"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase text-zinc-500">Opções do Colaborador</p>
              <h2 className="text-lg font-bold text-zinc-950">{collab.name}</h2>
            </div>
            <button onClick={onClose} className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition">
              <X className="size-5" />
            </button>
          </div>
          
          <div className="p-4 space-y-2">
            <button
              onClick={onToggleActive}
              disabled={loadingAction === "toggle-active"}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-semibold transition ${collab.isActive ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
            >
              {loadingAction === "toggle-active" ? <Loader2 className="size-5 animate-spin" /> : collab.isActive ? <ShieldOff className="size-5" /> : <ShieldCheck className="size-5" />}
              <div>
                <p>{collab.isActive ? "Inativar Colaborador" : "Reativar Colaborador"}</p>
                <p className={`text-xs font-medium ${collab.isActive ? "text-amber-600/70" : "text-emerald-600/70"}`}>
                  {collab.isActive ? "Oculta da lista de registros e painéis." : "Volta a aparecer nas listas de registro."}
                </p>
              </div>
            </button>

            <button
              onClick={onHardDelete}
              disabled={loadingAction === "hard-delete"}
              className="flex w-full items-center gap-3 rounded-xl bg-rose-50 px-4 py-3.5 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
            >
              {loadingAction === "hard-delete" ? <Loader2 className="size-5 animate-spin" /> : <Trash2 className="size-5" />}
              <div>
                <p>Excluir Funcionário Permanentemente</p>
                <p className="text-xs font-medium text-rose-600/70">Apenas se não possuir cartões vinculados.</p>
              </div>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function CollaboratorsView({ isGlobalAdmin, userStoreId }: { isGlobalAdmin?: boolean; userStoreId?: string | null }) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  
  const [selectedStoreIdView, setSelectedStoreIdView] = useState<string | null>(isGlobalAdmin ? null : (userStoreId || null));
  
  // Filtros e Busca
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ACTIVE");
  const [sortOrder, setSortOrder] = useState<"AZ" | "ZA">("AZ");
  
  // Ações
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [records, setRecords] = useState<OperatorRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteRecordId, setConfirmDeleteRecordId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadCollaborators = useCallback(async () => {
    setError(null);
    try {
      const [collabRes, storesRes] = await Promise.all([
        fetch("/api/collaborators", { cache: "no-store" }),
        fetch("/api/stores", { cache: "no-store" }),
      ]);
      if (!collabRes.ok) throw new Error("Erro ao carregar colaboradores.");
      const d = (await collabRes.json()) as { collaborators: Collaborator[] };
      setCollaborators(d.collaborators);
      if (storesRes.ok) {
        const sd = (await storesRes.json()) as { stores: Store[] };
        setStores(sd.stores ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadCollaborators(); }, [loadCollaborators]);

  async function handleCreateCollaborator(name: string, storeId: string) {
    const d = (await apiRequest({ action: "create", name, storeId })) as { collaborators: Collaborator[] };
    setCollaborators(d.collaborators);
    showSuccess(`Colaborador "${name}" cadastrado com sucesso.`);
  }

  const loadRecords = useCallback(async (collabId: string) => {
    setLoadingRecords(true);
    try {
      const d = (await apiRequest({ action: "records", collaboratorId: collabId })) as { records: OperatorRecord[] };
      setRecords(d.records);
    } catch { setRecords([]); }
    finally { setLoadingRecords(false); }
  }, []);

  const filtered = useMemo(() => {
    let result = collaborators;
    
    // Status Filter
    if (statusFilter === "ACTIVE") result = result.filter(c => c.isActive);
    if (statusFilter === "INACTIVE") result = result.filter(c => !c.isActive);
    
    // Search Filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }
    
    // Store Filter
    if (selectedStoreIdView) {
      result = result.filter((c) => c.storeId === selectedStoreIdView);
    }
    
    // Sorting
    result = [...result].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sortOrder === "AZ" ? cmp : -cmp;
    });
    
    return result;
  }, [collaborators, search, statusFilter, sortOrder, selectedStoreIdView]);

  const activeCount = collaborators.filter(c => c.isActive).length;
  const selectedCollab = collaborators.find((c) => c.id === selectedId);

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 2500);
  }

  async function handleRename(id: string) {
    if (!renameName.trim()) return;
    setActionLoading("rename");
    try {
      const d = (await apiRequest({ action: "rename", id, newName: renameName })) as { collaborators: Collaborator[] };
      setCollaborators(d.collaborators);
      setRenameId(null);
      showSuccess("Nome atualizado com sucesso.");
      if (selectedId === id) void loadRecords(id);
    } catch (e) { setError(e instanceof Error ? e.message : "Erro."); }
    finally { setActionLoading(null); }
  }

  async function handleMerge(keepId: string, mergeId: string) {
    setActionLoading("merge");
    try {
      const d = (await apiRequest({ action: "merge", keepId, mergeId })) as { collaborators: Collaborator[] };
      setCollaborators(d.collaborators);
      setMergeTarget(null);
      showSuccess("Colaboradores mesclados.");
      if (selectedId === mergeId) setSelectedId(keepId);
      if (selectedId) void loadRecords(selectedId);
    } catch (e) { setError(e instanceof Error ? e.message : "Erro."); }
    finally { setActionLoading(null); }
  }

  async function handleUnmerge(mergeId: string) {
    setActionLoading("unmerge");
    try {
      const d = (await apiRequest({ action: "unmerge", mergeId })) as { collaborators: Collaborator[] };
      setCollaborators(d.collaborators);
      showSuccess("Mesclagem desfeita.");
      if (selectedId) void loadRecords(selectedId);
    } catch (e) { setError(e instanceof Error ? e.message : "Erro."); }
    finally { setActionLoading(null); }
  }

  async function handleDeleteCollab(id: string) {
    setActionLoading("delete-collab");
    try {
      const d = (await apiRequest({ action: "delete", id })) as { collaborators: Collaborator[] };
      setCollaborators(d.collaborators);
      if (selectedId === id) { setSelectedId(null); setRecords([]); }
      setConfirmDeleteId(null);
      showSuccess("Colaborador desativado.");
    } catch (e) { setError(e instanceof Error ? e.message : "Erro."); }
    finally { setActionLoading(null); }
  }

  async function handleDeleteRecord(recordId: string) {
    setActionLoading("delete-record");
    try {
      const res = await fetch(`/api/records?id=${recordId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao deletar.");
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
      setConfirmDeleteRecordId(null);
      showSuccess("Registro deletado.");
    } catch (e) { setError(e instanceof Error ? e.message : "Erro."); }
    finally { setActionLoading(null); }
  }

  async function handleToggleActive() {
    if (!selectedId || !selectedCollab) return;
    setActionLoading("toggle-active");
    try {
      const res = await apiRequest({ action: "toggle-active", id: selectedId, isActive: !selectedCollab.isActive });
      const d = res as { collaborators: Collaborator[] };
      setCollaborators(d.collaborators);
      showSuccess(selectedCollab.isActive ? "Colaborador inativado." : "Colaborador reativado.");
      setOptionsModalOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Erro."); }
    finally { setActionLoading(null); }
  }

  async function handleHardDelete() {
    if (!selectedId) return;
    setActionLoading("hard-delete");
    try {
      const res = await apiRequest({ action: "hard-delete", id: selectedId });
      const d = res as { collaborators: Collaborator[] };
      setCollaborators(d.collaborators);
      showSuccess("Colaborador excluído.");
      setSelectedId(null);
      setOptionsModalOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Erro."); }
    finally { setActionLoading(null); }
  }

  if (isLoading) return <PageContainer><DashboardSkeleton /></PageContainer>;

  // ── Detail View (Histórico do Colaborador) ──
  if (selectedId && selectedCollab) {
    const color = getOperatorColor(selectedCollab.name, 0);
    const totalValue = records.reduce((s, r) => s + r.amountInCents, 0);
    const grouped = new Map<string, OperatorRecord[]>();
    records.forEach((r) => {
      const dk = toDateKey(r.createdAt);
      grouped.set(dk, [...(grouped.get(dk) ?? []), r]);
    });
    const dateGroups = Array.from(grouped.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dk, recs]) => ({ dateKey: dk, label: formatLongDate(dk), records: recs }));

    return (
      <PageContainer>
        <button
          type="button"
          onClick={() => { setSelectedId(null); setRecords([]); }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-950"
        >
          <ArrowLeft className="size-4" /> Voltar
        </button>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-[1.5rem] text-2xl font-bold text-white shadow-lg" style={{ backgroundColor: color }}>
              {selectedCollab.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-semibold text-zinc-950">{selectedCollab.name}</h1>
                {!selectedCollab.isActive && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">Inativo</span>
                )}
                {selectedCollab.mergedIntoId && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Mesclado</span>
                )}
              </div>
              <p className="mt-1 text-sm text-zinc-500">Histórico completo de cartões</p>
            </div>
          </div>
          
          {selectedCollab.mergedIntoId && (
            <button 
              onClick={() => handleUnmerge(selectedCollab.id)}
              disabled={actionLoading === "unmerge"}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-75"
            >
              {actionLoading === "unmerge" ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              Desfazer Mesclagem
            </button>
          )}
        </div>

        <AnimatePresence>
          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {successMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-zinc-200/80 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">Total de cartões</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">{formatInteger(records.length)}</p>
          </div>
          <div className="rounded-[1.5rem] border border-zinc-200/80 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">Valor total</p>
            <p className="mt-1 text-2xl font-semibold text-blue-600">{formatCurrency(totalValue)}</p>
          </div>
          <div className="rounded-[1.5rem] border border-zinc-200/80 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">Média por cartão</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600">
              {records.length ? formatCurrency(Math.round(totalValue / records.length)) : "R$ 0,00"}
            </p>
          </div>
        </div>

        {loadingRecords ? <DashboardSkeleton /> : (
          <div className="grid gap-4">
            {dateGroups.length === 0 && (
              <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-white px-5 py-10 text-center text-sm font-medium text-zinc-500">
                Nenhum registro encontrado para este colaborador.
              </div>
            )}
            {dateGroups.map((group) => {
              // Substituímos o mapeamento contínuo por um acordeão como no histórico
              return (
                <details key={group.dateKey} className="group overflow-hidden rounded-[1.5rem] border border-zinc-200/80 bg-white shadow-sm open:pb-4">
                  <summary className="flex cursor-pointer select-none items-center justify-between p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/15">
                    <div className="flex items-center gap-3">
                      <Calendar className="size-5 text-zinc-400" />
                      <div>
                        <h2 className="text-base font-semibold text-zinc-950">{group.label}</h2>
                        <p className="text-xs text-zinc-500">{formatInteger(group.records.length)} {group.records.length === 1 ? 'cartão' : 'cartões'}</p>
                      </div>
                    </div>
                    <ChevronRight className="size-5 text-zinc-400 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="grid gap-2 px-4 pt-2">
                    {group.records.map((record, i) => (
                      <motion.div key={record.id}
                        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.1) }}
                        className="flex items-center gap-4 rounded-xl border border-zinc-100 bg-zinc-50 p-3 hover:bg-zinc-100/75 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-semibold text-zinc-950">{record.clientName}</p>
                            <p className="shrink-0 text-sm font-semibold text-zinc-950">{formatCurrency(record.amountInCents)}</p>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                            <span className="inline-flex items-center gap-1"><Timer className="size-3.5" />{formatTime(record.createdAt)}</span>
                            {record.activated ? (
                              <span className="font-semibold text-emerald-600">Ativo</span>
                            ) : (
                              <span className="font-semibold text-zinc-400">Inativo</span>
                            )}
                          </div>
                        </div>
                        <button type="button" aria-label="Deletar"
                          onClick={() => setConfirmDeleteRecordId(record.id)}
                          className="flex size-8 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600">
                          <Trash2 className="size-4" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                  
                  {confirmDeleteRecordId && group.records.some(r => r.id === confirmDeleteRecordId) && (
                    <div className="mx-4 mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                        <p className="flex-1 text-xs font-medium text-amber-800">Deletar este cartão?</p>
                        <button type="button" onClick={() => setConfirmDeleteRecordId(null)}
                          className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm">Cancelar</button>
                        <button type="button" onClick={() => handleDeleteRecord(confirmDeleteRecordId)}
                          disabled={actionLoading === "delete-record"}
                          className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-75">
                          {actionLoading === "delete-record" ? "..." : "Deletar"}
                        </button>
                      </div>
                    </div>
                  )}
                </details>
              );
            })}
          </div>
        )}

        <FloatingActionButton onClick={() => setOptionsModalOpen(true)} icon={<Edit2 className="size-6" />} />

        <CollaboratorOptionsModal
          collab={selectedCollab}
          isOpen={optionsModalOpen}
          onClose={() => setOptionsModalOpen(false)}
          onToggleActive={handleToggleActive}
          onHardDelete={handleHardDelete}
          loadingAction={actionLoading}
        />
      </PageContainer>
    );
  }

  // ── List View (Painel de Gestão) ──
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Equipe"
        title="Gerenciamento de Colaboradores"
        description="Administre sua equipe, consolide cadastros e visualize a performance."
      />

      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>
      )}

      {isGlobalAdmin && !selectedStoreIdView ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map(store => {
            const storeCollabs = collaborators.filter(c => c.storeId === store.id);
            const activeCollabs = storeCollabs.filter(c => c.isActive).length;
            return (
              <div 
                key={store.id} 
                onClick={() => setSelectedStoreIdView(store.id)}
                className="group cursor-pointer rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.02)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_48px_rgba(15,23,42,0.06)]"
              >
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 transition group-hover:bg-zinc-950 group-hover:text-white">
                  <Building className="size-6" />
                </div>
                <h3 className="mb-1 text-xl font-bold text-zinc-950">{store.name}</h3>
                <p className="text-sm font-medium text-zinc-500">{storeCollabs.length} funcionários registrados</p>
                <div className="mt-5 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                    <span className="size-1.5 rounded-full bg-emerald-500"></span>
                    {activeCollabs} Ativos
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {isGlobalAdmin && (
            <button 
              onClick={() => setSelectedStoreIdView(null)} 
              className="mb-6 flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-950 w-fit"
            >
              <ArrowLeft className="size-4" /> Voltar para Unidades
            </button>
          )}

          {/* Painel de Gestão: Header Consolidado */}
          <section className="mb-8 grid gap-6 rounded-[2rem] border border-zinc-200/80 bg-white p-6 shadow-sm lg:grid-cols-[1fr_auto]">
            <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <div className="flex items-center gap-2 text-zinc-500">
              <Users className="size-5" />
              <h2 className="text-sm font-semibold">Total Cadastrados</h2>
            </div>
            <p className="mt-2 text-3xl font-semibold text-zinc-950">{formatInteger(collaborators.length)}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-zinc-500">
              <UserCheck className="size-5 text-emerald-500" />
              <h2 className="text-sm font-semibold">Ativos no Sistema</h2>
            </div>
            <p className="mt-2 text-3xl font-semibold text-emerald-600">{formatInteger(activeCount)}</p>
          </div>
        </div>

        <div className="flex flex-col justify-end gap-3 sm:flex-row lg:flex-col">
          <div className="flex items-center gap-2 rounded-2xl bg-zinc-100 p-1">
            <button onClick={() => setStatusFilter("ACTIVE")} className={cn("rounded-xl px-4 py-1.5 text-xs font-semibold transition", statusFilter === "ACTIVE" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950")}>Ativos</button>
            <button onClick={() => setStatusFilter("INACTIVE")} className={cn("rounded-xl px-4 py-1.5 text-xs font-semibold transition", statusFilter === "INACTIVE" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950")}>Inativos</button>
            <button onClick={() => setStatusFilter("ALL")} className={cn("rounded-xl px-4 py-1.5 text-xs font-semibold transition", statusFilter === "ALL" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950")}>Todos</button>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setSortOrder(prev => prev === "AZ" ? "ZA" : "AZ")}
              className="inline-flex flex-1 h-9 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Ordenação: {sortOrder === "AZ" ? "A-Z" : "Z-A"}
            </button>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex flex-1 h-9 items-center justify-center gap-1.5 rounded-2xl bg-zinc-950 px-4 text-xs font-semibold text-white transition hover:bg-zinc-800"
            >
              <Plus className="size-3.5" /> Novo Colaborador
            </button>
          </div>
        </div>
      </section>

      {/* Busca */}
      <div className="mb-6 flex items-center gap-3 rounded-[1.5rem] border border-zinc-200 bg-white px-5 py-4 shadow-[0_4px_24px_rgba(15,23,42,0.02)] transition duration-300 focus-within:border-zinc-950 focus-within:ring-4 focus-within:ring-zinc-950/10">
        <Search className="size-5 shrink-0 text-zinc-400" />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por nome instantaneamente..."
          className="min-w-0 flex-1 bg-transparent text-base text-zinc-950 outline-none placeholder:text-zinc-400"
        />
        {search && (
          <button type="button" onClick={() => setSearch("")} className="text-zinc-400 hover:text-zinc-700">
            <X className="size-5" />
          </button>
        )}
      </div>

      <div className="grid gap-3">
        {filtered.map((collab, index) => {
          const color = getOperatorColor(collab.name, index);
          const isRenaming = renameId === collab.id;
          const isConfirmingDelete = confirmDeleteId === collab.id;
          const isMergeSource = mergeTarget === collab.id;

          return (
            <motion.article key={collab.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.02, 0.1) }}
              className={cn(
                "overflow-hidden rounded-[1.5rem] border bg-white transition duration-300",
                collab.isActive ? "border-zinc-200/80 shadow-[0_14px_42px_rgba(15,23,42,0.05)] hover:shadow-[0_20px_54px_rgba(15,23,42,0.08)]" : "border-zinc-100 bg-zinc-50/50 opacity-80 hover:opacity-100"
              )}
            >
              <div className="flex items-center gap-4 p-4">
                <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white", collab.isActive ? "shadow-md" : "grayscale opacity-75")} style={{ backgroundColor: color }}>
                  {collab.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={cn("truncate text-base font-semibold", collab.isActive ? "text-zinc-950" : "text-zinc-500 line-through decoration-zinc-300")}>{collab.name}</h3>
                    {!collab.isActive && collab.mergedIntoId && (
                      <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wide">Mesclado</span>
                    )}
                    {!collab.isActive && !collab.mergedIntoId && (
                      <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 uppercase tracking-wide">Inativo</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">Registrado em {new Date(collab.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex items-center gap-1">
                  {collab.isActive && (
                    <>
                      <button type="button" aria-label="Renomear" title="Renomear"
                        onClick={() => { setRenameId(collab.id); setRenameName(collab.name); }}
                        className="flex size-9 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700">
                        <Edit3 className="size-4" />
                      </button>
                      <button type="button" aria-label="Mesclar" title="Mesclar com outro"
                        onClick={() => setMergeTarget(collab.id)}
                        className="flex size-9 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-blue-50 hover:text-blue-600">
                        <GitMerge className="size-4" />
                      </button>
                      <button type="button" aria-label="Desativar" title="Desativar"
                        onClick={() => setConfirmDeleteId(collab.id)}
                        className="flex size-9 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600">
                        <UserMinus className="size-4" />
                      </button>
                    </>
                  )}
                  <button type="button" aria-label="Ver histórico e ações" title="Gerenciar"
                    onClick={() => { setSelectedId(collab.id); void loadRecords(collab.id); }}
                    className="flex size-9 items-center justify-center rounded-xl bg-zinc-950 text-white transition hover:bg-zinc-800">
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {isRenaming && (
                  <motion.div key={`rename-${collab.id}`} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-zinc-100">
                    <div className="flex items-center gap-3 p-4">
                      <input value={renameName} onChange={(e) => setRenameName(e.target.value)}
                        className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
                        placeholder="Novo nome" autoFocus />
                      <button type="button" onClick={() => setRenameId(null)}
                        className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700"><X className="size-4" /></button>
                      <button type="button" onClick={() => handleRename(collab.id)}
                        disabled={actionLoading === "rename"}
                        className="rounded-xl bg-zinc-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-75">
                        {actionLoading === "rename" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      </button>
                    </div>
                  </motion.div>
                )}

                {isMergeSource && (
                  <motion.div key={`merge-${collab.id}`} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-zinc-100">
                    <div className="p-4 bg-blue-50/50">
                      <p className="mb-3 text-xs font-semibold text-blue-800">Selecione o perfil principal para unificar os registros de "{collab.name}":</p>
                      <div className="grid max-h-40 gap-2 overflow-y-auto pr-2">
                        {collaborators.filter((c) => c.id !== collab.id && c.isActive).map((target) => (
                          <button key={target.id} type="button"
                            onClick={() => handleMerge(target.id, collab.id)}
                            disabled={actionLoading === "merge"}
                            className="flex items-center gap-2 rounded-xl border border-blue-200/60 bg-white px-3 py-2 text-left text-sm font-medium text-blue-900 transition hover:bg-blue-50 hover:border-blue-300 disabled:opacity-75">
                            <GitMerge className="size-3.5 text-blue-500" />
                            {target.name}
                          </button>
                        ))}
                      </div>
                      <button type="button" onClick={() => setMergeTarget(null)}
                        className="mt-3 text-xs font-semibold text-zinc-500 hover:text-zinc-950">Cancelar Mesclagem</button>
                    </div>
                  </motion.div>
                )}

                {isConfirmingDelete && (
                  <motion.div key={`delete-${collab.id}`} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-amber-100">
                    <div className="flex items-center gap-3 bg-amber-50 p-4">
                      <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                      <p className="flex-1 text-xs font-medium text-amber-800">Este perfil não aparecerá mais nos cadastros, mas seus cartões permanecerão salvos.</p>
                      <button type="button" onClick={() => setConfirmDeleteId(null)}
                        className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm border border-amber-200 hover:bg-amber-100 transition">Cancelar</button>
                      <button type="button" onClick={() => handleDeleteCollab(collab.id)}
                        disabled={actionLoading === "delete-collab"}
                        className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-75 hover:bg-amber-700 transition">
                        {actionLoading === "delete-collab" ? "..." : "Desativar"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-white px-5 py-12 text-center text-sm font-medium text-zinc-500">
            Nenhum colaborador corresponde à pesquisa.
          </div>
        )}
      </div>
      </>
      )}

      <AnimatePresence>
        {createModalOpen && (
          <CreateCollaboratorModal
            stores={stores}
            isGlobalAdmin={isGlobalAdmin ?? false}
            userStoreId={userStoreId}
            onClose={() => setCreateModalOpen(false)}
            onCreated={handleCreateCollaborator}
          />
        )}
      </AnimatePresence>
    </PageContainer>
  );
}
