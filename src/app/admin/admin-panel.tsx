"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { createStore, createUser, updateUser, toggleUserActive } from "./actions";
import {
  Building, Users, Key, Save, Loader2, Plus, TrendingUp,
  CreditCard, ChevronRight, Edit2, X, Star, Eye, EyeOff,
  ShieldCheck, ShieldOff,
} from "lucide-react";

type Store = { id: string; name: string };
type AppUser = {
  id: string; username: string; role: string; name: string;
  is_active: boolean; store_id: string | null; is_primary?: boolean;
};
type GlobalMetrics = {
  totalStores: number; totalCollaborators: number; cardsToday: number;
  cardsThisMonth: number; cardsLastMonth: number; growthPercent: number;
};

// ─── Modal de Edição de Usuário ────────────────────────────────────────────────
function EditUserModal({
  user, stores, onClose, onSaved,
}: { user: AppUser; stores: Store[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(user.name || "");
  const [username, setUsername] = useState(user.username);
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [role, setRole] = useState(user.role);
  const [storeId, setStoreId] = useState(user.store_id || "");
  const [isPrimary, setIsPrimary] = useState(user.is_primary ?? false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await updateUser({
        id: user.id,
        name,
        username,
        password_plain: password || undefined,
        role,
        store_id: role === "GLOBAL_ADMIN" ? null : storeId || null,
        is_primary: isPrimary,
      });
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setIsLoading(false);
    }
  }

  const roleLabel = { EMPLOYEE: "Funcionário Operacional", MANAGER: "Gerente de Unidade", GLOBAL_ADMIN: "Admin Global (Rede)" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-md rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-2xl"
      >
        <button onClick={onClose} className="absolute right-5 top-5 rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 transition">
          <X className="size-5" />
        </button>

        <div className="mb-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Editar Conta</p>
          <h2 className="mt-1 text-xl font-bold text-zinc-950">{user.name || user.username}</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">Nome Completo</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-950" placeholder="Nome do usuário" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Login (Username)</label>
              <input required value={username} onChange={e => setUsername(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-950" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Nova Senha</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 pr-10 text-sm outline-none transition focus:border-zinc-950"
                  placeholder="Deixe vazio p/ manter"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                  {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">Nível de Acesso</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-950">
              {Object.entries(roleLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {role !== "GLOBAL_ADMIN" && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Unidade (Loja)</label>
              <select value={storeId} onChange={e => setStoreId(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-950">
                <option value="">Sem loja vinculada</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {role === "MANAGER" && (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 transition hover:bg-zinc-100">
              <div className={`relative flex size-9 items-center justify-center rounded-xl transition ${isPrimary ? "bg-amber-400" : "bg-zinc-200"}`}>
                <Star className={`size-5 ${isPrimary ? "fill-white text-white" : "text-zinc-400"}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-zinc-950">Gerente Principal</p>
                <p className="text-xs text-zinc-500">Responsável primário desta unidade</p>
              </div>
              <input type="checkbox" className="sr-only" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} />
              <div className={`h-5 w-9 rounded-full transition ${isPrimary ? "bg-amber-400" : "bg-zinc-300"}`}>
                <div className={`mt-0.5 ml-0.5 size-4 rounded-full bg-white shadow transition-transform ${isPrimary ? "translate-x-4" : ""}`} />
              </div>
            </label>
          )}

          {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700">{error}</p>}

          <button disabled={isLoading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-50">
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Salvar Alterações
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Painel Principal ──────────────────────────────────────────────────────────
export function AdminPanel({
  initialData,
  metrics,
}: {
  initialData: { stores: Store[]; users: AppUser[] };
  metrics: GlobalMetrics | null;
}) {
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "STORES" | "USERS">("OVERVIEW");
  const [storeName, setStoreName] = useState("");
  const [isStoreLoading, setIsStoreLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [storeId, setStoreId] = useState("");
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState(initialData.users);
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null);

  async function handleCreateStore(e: React.FormEvent) {
    e.preventDefault();
    setIsStoreLoading(true);
    try {
      await createStore(storeName);
      setStoreName("");
      alert("Loja criada! Recarregue para ver na lista.");
    } catch (err: unknown) {
      alert("Erro: " + (err instanceof Error ? err.message : "Desconhecido"));
    } finally {
      setIsStoreLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setIsUserLoading(true);
    try {
      await createUser({ username, password_plain: password, name, role, store_id: role === "GLOBAL_ADMIN" ? null : storeId });
      setUsername(""); setPassword(""); setName(""); setStoreId("");
      alert("Usuário criado! Recarregue para ver na lista.");
    } catch (err: unknown) {
      alert("Erro: " + (err instanceof Error ? err.message : "Desconhecido"));
    } finally {
      setIsUserLoading(false);
    }
  }

  async function handleToggleActive(u: AppUser) {
    setToggleLoadingId(u.id);
    try {
      await toggleUserActive(u.id, !u.is_active);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !x.is_active } : x));
    } catch (err: unknown) {
      alert("Erro: " + (err instanceof Error ? err.message : "Desconhecido"));
    } finally {
      setToggleLoadingId(null);
    }
  }

  const tabs = [
    { id: "OVERVIEW", label: "Visão Geral", icon: TrendingUp },
    { id: "STORES", label: "Unidades", icon: Building },
    { id: "USERS", label: "Contas de Acesso", icon: Users },
  ] as const;

  const growthPositive = (metrics?.growthPercent ?? 0) >= 0;

  const roleLabel: Record<string, string> = {
    GLOBAL_ADMIN: "Admin Global",
    MANAGER: "Gerente",
    EMPLOYEE: "Funcionário",
  };
  const roleColor: Record<string, string> = {
    GLOBAL_ADMIN: "bg-purple-100 text-purple-700",
    MANAGER: "bg-blue-100 text-blue-700",
    EMPLOYEE: "bg-zinc-100 text-zinc-600",
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-zinc-100 p-1 w-fit flex-wrap">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${activeTab === tab.id ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950"}`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── VISÃO GERAL ─── */}
        {activeTab === "OVERVIEW" && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: "Lojas Ativas", value: metrics?.totalStores ?? "—", icon: Building, color: "bg-blue-500" },
                { label: "Colaboradores", value: metrics?.totalCollaborators ?? "—", icon: Users, color: "bg-purple-500" },
                { label: "Cartões Hoje", value: metrics?.cardsToday ?? "—", icon: CreditCard, color: "bg-emerald-500" },
                { label: "Cartões Mês", value: metrics?.cardsThisMonth ?? "—", icon: CreditCard, color: "bg-orange-500" },
                { label: "Mês Anterior", value: metrics?.cardsLastMonth ?? "—", icon: CreditCard, color: "bg-zinc-500" },
                { label: "Crescimento", value: metrics ? `${growthPositive ? "+" : ""}${metrics.growthPercent}%` : "—", icon: TrendingUp, color: growthPositive ? "bg-emerald-500" : "bg-rose-500" },
              ].map((card) => (
                <div key={card.label} className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className={`mb-3 flex size-9 items-center justify-center rounded-xl ${card.color}`}>
                    <card.icon className="size-4 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-zinc-950">{card.value}</p>
                  <p className="text-xs font-medium text-zinc-500">{card.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-bold text-zinc-950">Unidades da Rede</h3>
              <div className="divide-y divide-zinc-100">
                {initialData.stores.map((store) => {
                  const storeUsers = users.filter(u => u.store_id === store.id);
                  const primaryManager = storeUsers.find(u => u.role === "MANAGER" && u.is_primary);
                  const anyManager = storeUsers.find(u => u.role === "MANAGER");
                  const manager = primaryManager || anyManager;
                  return (
                    <div key={store.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-100">
                          <Building className="size-4 text-zinc-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-950">{store.name}</p>
                          <p className="text-xs text-zinc-500">
                            {manager ? `${primaryManager ? "★ " : ""}Gerente: ${manager.name || manager.username}` : "Sem gerente definido"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">{storeUsers.length} usuário(s)</span>
                        <ChevronRight className="size-4 text-zinc-300" />
                      </div>
                    </div>
                  );
                })}
                {initialData.stores.length === 0 && <p className="py-4 text-sm text-zinc-500">Nenhuma unidade cadastrada.</p>}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── LOJAS ─── */}
        {activeTab === "STORES" && (
          <motion.div key="stores" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-zinc-950"><Plus className="size-5" /> Nova Unidade</h3>
              <form onSubmit={handleCreateStore} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Nome da Unidade</label>
                  <input required value={storeName} onChange={e => setStoreName(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition focus:border-zinc-950" placeholder="Ex: Digaspi 42" />
                </div>
                <button disabled={isStoreLoading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-50">
                  {isStoreLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar Unidade
                </button>
              </form>
            </div>
            <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-zinc-950">Unidades ({initialData.stores.length})</h3>
              <ul className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {initialData.stores.map(s => (
                  <li key={s.id} className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                    <div className="flex items-center gap-3"><Building className="size-4 text-zinc-400" /><span className="font-semibold text-zinc-950">{s.name}</span></div>
                    <span className="font-mono text-xs text-zinc-400">{s.id.split("-")[0]}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}

        {/* ── USUÁRIOS ─── */}
        {activeTab === "USERS" && (
          <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-zinc-950"><Key className="size-5" /> Nova Conta</h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Nome Completo</label>
                  <input required value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition focus:border-zinc-950" placeholder="Nome do usuário" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-600">Login</label>
                    <input required value={username} onChange={e => setUsername(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition focus:border-zinc-950" placeholder="ex: joao.silva" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-600">Senha</label>
                    <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition focus:border-zinc-950" placeholder="••••••••" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Nível de Acesso</label>
                  <select value={role} onChange={e => setRole(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-950">
                    <option value="EMPLOYEE">Funcionário Operacional</option>
                    <option value="MANAGER">Gerente de Unidade</option>
                    <option value="GLOBAL_ADMIN">Admin Global</option>
                  </select>
                </div>
                {role !== "GLOBAL_ADMIN" && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-600">Unidade</label>
                    <select required value={storeId} onChange={e => setStoreId(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-950">
                      <option value="">Selecione...</option>
                      {initialData.stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
                <button disabled={isUserLoading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-50">
                  {isUserLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Criar Conta
                </button>
              </form>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-zinc-950">Contas ({users.length})</h3>
              <ul className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                {users.map((u) => {
                  const storeName = initialData.stores.find(s => s.id === u.store_id)?.name;
                  return (
                    <li key={u.id} className={`rounded-xl border px-4 py-3 transition ${u.is_active ? "border-zinc-100 bg-zinc-50" : "border-zinc-200 bg-zinc-100 opacity-60"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {u.role === "MANAGER" && u.is_primary && (
                            <span aria-label="Gerente Principal">
                              <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
                            </span>
                          )}
                          <span className="truncate font-bold text-sm text-zinc-950">{u.name || u.username}</span>
                          <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${roleColor[u.role] ?? "bg-zinc-100"}`}>{roleLabel[u.role] ?? u.role}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => handleToggleActive(u)}
                            disabled={toggleLoadingId === u.id}
                            title={u.is_active ? "Desativar" : "Ativar"}
                            className="flex size-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-200 transition"
                          >
                            {toggleLoadingId === u.id ? <Loader2 className="size-4 animate-spin" /> : u.is_active ? <ShieldCheck className="size-4 text-emerald-500" /> : <ShieldOff className="size-4 text-rose-400" />}
                          </button>
                          <button
                            onClick={() => setEditingUser(u)}
                            title="Editar"
                            className="flex size-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-blue-100 hover:text-blue-600 transition"
                          >
                            <Edit2 className="size-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                        <span>@{u.username}</span>
                        {storeName && <><span>•</span><span>{storeName}</span></>}
                        {!u.is_active && <span className="text-rose-500">• Inativo</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Edição */}
      <AnimatePresence>
        {editingUser && (
          <EditUserModal
            user={editingUser}
            stores={initialData.stores}
            onClose={() => setEditingUser(null)}
            onSaved={() => alert("Salvo! Recarregue para ver as mudanças.")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
