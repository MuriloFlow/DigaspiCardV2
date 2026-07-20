"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { createStore, createUser } from "./actions";
import { Building, Users, Key, Save, Loader2, Plus, TrendingUp, CreditCard, ChevronRight } from "lucide-react";

type Store = { id: string; name: string };
type User = { id: string; username: string; role: string; name: string; is_active: boolean; store_id: string | null };
type GlobalMetrics = {
  totalStores: number;
  totalCollaborators: number;
  cardsToday: number;
  cardsThisMonth: number;
  cardsLastMonth: number;
  growthPercent: number;
};

export function AdminPanel({
  initialData,
  metrics,
}: {
  initialData: { stores: Store[]; users: User[] };
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

  async function handleCreateStore(e: React.FormEvent) {
    e.preventDefault();
    setIsStoreLoading(true);
    try {
      await createStore(storeName);
      setStoreName("");
      alert("Loja criada com sucesso! Recarregue para atualizar a lista.");
    } catch (err: unknown) {
      alert("Erro: " + (err instanceof Error ? err.message : "Erro desconhecido"));
    } finally {
      setIsStoreLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setIsUserLoading(true);
    try {
      await createUser({ username, password_plain: password, name, role, store_id: role === "GLOBAL_ADMIN" ? null : storeId });
      setUsername(""); setPassword(""); setName("");
      alert("Usuário criado com sucesso!");
    } catch (err: unknown) {
      alert("Erro: " + (err instanceof Error ? err.message : "Erro desconhecido"));
    } finally {
      setIsUserLoading(false);
    }
  }

  const tabs = [
    { id: "OVERVIEW", label: "Visão Geral", icon: TrendingUp },
    { id: "STORES", label: "Unidades", icon: Building },
    { id: "USERS", label: "Contas de Acesso", icon: Users },
  ] as const;

  const growthPositive = (metrics?.growthPercent ?? 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-zinc-100 p-1 w-fit flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === tab.id ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950"
            }`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── VISÃO GERAL ─────────────────────────────── */}
        {activeTab === "OVERVIEW" && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: "Lojas Ativas", value: metrics?.totalStores ?? "—", icon: Building, color: "bg-blue-500" },
                { label: "Colaboradores", value: metrics?.totalCollaborators ?? "—", icon: Users, color: "bg-purple-500" },
                { label: "Cartões Hoje", value: metrics?.cardsToday ?? "—", icon: CreditCard, color: "bg-emerald-500" },
                { label: "Cartões no Mês", value: metrics?.cardsThisMonth ?? "—", icon: CreditCard, color: "bg-orange-500" },
                { label: "Mês Anterior", value: metrics?.cardsLastMonth ?? "—", icon: CreditCard, color: "bg-zinc-500" },
                {
                  label: "Crescimento",
                  value: metrics ? `${growthPositive ? "+" : ""}${metrics.growthPercent}%` : "—",
                  icon: TrendingUp,
                  color: growthPositive ? "bg-emerald-500" : "bg-rose-500",
                },
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
                  const storeUsers = initialData.users.filter((u) => u.store_id === store.id);
                  const managers = storeUsers.filter((u) => u.role === "MANAGER");
                  return (
                    <div key={store.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-100">
                          <Building className="size-4 text-zinc-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-950">{store.name}</p>
                          <p className="text-xs text-zinc-500">
                            {managers.length > 0 ? `Gerente: ${managers[0].name || managers[0].username}` : "Sem gerente definido"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-zinc-500">{storeUsers.length} usuário(s)</span>
                        <ChevronRight className="size-4 text-zinc-300" />
                      </div>
                    </div>
                  );
                })}
                {initialData.stores.length === 0 && (
                  <p className="py-4 text-sm text-zinc-500">Nenhuma unidade cadastrada. Vá em "Unidades" para criar.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── LOJAS ───────────────────────────────────── */}
        {activeTab === "STORES" && (
          <motion.div key="stores" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-zinc-950">
                <Plus className="size-5" /> Nova Unidade
              </h3>
              <form onSubmit={handleCreateStore} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-700">Nome da Unidade</label>
                  <input
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition focus:border-zinc-950"
                    placeholder="Ex: Digaspi 42"
                  />
                </div>
                <button disabled={isStoreLoading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-50">
                  {isStoreLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Salvar Unidade
                </button>
              </form>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-zinc-950">Unidades Registradas ({initialData.stores.length})</h3>
              <ul className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {initialData.stores.map((store) => (
                  <li key={store.id} className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Building className="size-4 text-zinc-400" />
                      <span className="font-semibold text-zinc-950">{store.name}</span>
                    </div>
                    <span className="font-mono text-xs text-zinc-400">{store.id.split("-")[0]}</span>
                  </li>
                ))}
                {initialData.stores.length === 0 && <p className="py-2 text-sm text-zinc-500">Nenhuma unidade criada ainda.</p>}
              </ul>
            </div>
          </motion.div>
        )}

        {/* ── USUÁRIOS ─────────────────────────────────── */}
        {activeTab === "USERS" && (
          <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-zinc-950">
                <Key className="size-5" /> Nova Conta de Acesso
              </h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-700">Nome Completo</label>
                  <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition focus:border-zinc-950" placeholder="Nome do usuário" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">Login</label>
                    <input required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition focus:border-zinc-950" placeholder="ex: joao.silva" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">Senha</label>
                    <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition focus:border-zinc-950" placeholder="••••••••" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-zinc-700">Nível de Acesso</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-950">
                    <option value="EMPLOYEE">Funcionário Operacional</option>
                    <option value="MANAGER">Gerente de Unidade</option>
                    <option value="GLOBAL_ADMIN">Admin Global (Rede)</option>
                  </select>
                </div>
                {role !== "GLOBAL_ADMIN" && (
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-zinc-700">Unidade (Loja)</label>
                    <select required value={storeId} onChange={(e) => setStoreId(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-950">
                      <option value="">Selecione a unidade...</option>
                      {initialData.stores.map((store) => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <button disabled={isUserLoading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-50">
                  {isUserLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Criar Conta
                </button>
              </form>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-zinc-950">Contas ({initialData.users.length})</h3>
              <ul className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {initialData.users.map((u) => {
                  const storeName = initialData.stores.find((s) => s.id === u.store_id)?.name;
                  const roleLabel = u.role === "GLOBAL_ADMIN" ? "Admin Global" : u.role === "MANAGER" ? "Gerente" : "Funcionário";
                  const roleColor = u.role === "GLOBAL_ADMIN" ? "bg-purple-100 text-purple-700" : u.role === "MANAGER" ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-600";
                  return (
                    <li key={u.id} className="flex flex-col gap-1.5 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-950">{u.name || u.username}</span>
                        <span className={`rounded-lg px-2.5 py-0.5 text-[10px] font-bold ${roleColor}`}>{roleLabel}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span>@{u.username}</span>
                        {storeName && <><span>•</span><span>{storeName}</span></>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
