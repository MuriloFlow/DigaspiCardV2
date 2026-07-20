"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { createStore, createUser } from "./actions";
import { Building, Users, Key, Save, Loader2, Plus } from "lucide-react";

export function AdminPanel({ initialData }: { initialData: { stores: any[], users: any[] } }) {
  const [activeTab, setActiveTab] = useState<"STORES" | "USERS">("STORES");
  
  // Store form
  const [storeName, setStoreName] = useState("");
  const [isStoreLoading, setIsStoreLoading] = useState(false);

  // User form
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
      alert("Loja criada com sucesso!");
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally {
      setIsStoreLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setIsUserLoading(true);
    try {
      await createUser({
        username,
        password_plain: password,
        name,
        role,
        store_id: role === "GLOBAL_ADMIN" ? null : storeId
      });
      setUsername("");
      setPassword("");
      setName("");
      alert("Usuário criado com sucesso!");
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally {
      setIsUserLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 rounded-2xl bg-zinc-100 p-1 w-fit">
        <button 
          onClick={() => setActiveTab("STORES")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === "STORES" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950"}`}
        >
          <Building className="size-4" />
          Lojas (Unidades)
        </button>
        <button 
          onClick={() => setActiveTab("USERS")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === "USERS" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950"}`}
        >
          <Users className="size-4" />
          Contas de Acesso
        </button>
      </div>

      {activeTab === "STORES" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-zinc-950">
              <Plus className="size-5" /> Nova Loja
            </h3>
            <form onSubmit={handleCreateStore} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold">Nome da Unidade</label>
                <input required value={storeName} onChange={e => setStoreName(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-2 outline-none focus:border-zinc-950" placeholder="Ex: Digaspi 42" />
              </div>
              <button disabled={isStoreLoading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-50">
                {isStoreLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Salvar Unidade
              </button>
            </form>
          </div>

          <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-zinc-950">Unidades Registradas</h3>
            <ul className="space-y-3">
              {initialData.stores.map(store => (
                <li key={store.id} className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                  <span className="font-semibold text-zinc-950">{store.name}</span>
                  <span className="text-xs text-zinc-500">ID: {store.id.split("-")[0]}</span>
                </li>
              ))}
              {initialData.stores.length === 0 && <p className="text-sm text-zinc-500">Nenhuma unidade cadastrada.</p>}
            </ul>
          </div>
        </motion.div>
      )}

      {activeTab === "USERS" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-zinc-950">
              <Key className="size-5" /> Nova Conta de Acesso
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold">Nome Completo</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-2 outline-none focus:border-zinc-950" placeholder="Nome do usuário" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold">Username (Login)</label>
                  <input required value={username} onChange={e => setUsername(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-2 outline-none focus:border-zinc-950" placeholder="ex: jorge.silva" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">Senha</label>
                  <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-2 outline-none focus:border-zinc-950" placeholder="••••••••" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold">Nível de Acesso (Role)</label>
                  <select value={role} onChange={e => setRole(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-2 outline-none focus:border-zinc-950 bg-white">
                    <option value="EMPLOYEE">Funcionário Normal</option>
                    <option value="MANAGER">Gerente (Unidade)</option>
                    <option value="GLOBAL_ADMIN">Admin Global</option>
                  </select>
                </div>
                {role !== "GLOBAL_ADMIN" && (
                  <div>
                    <label className="mb-1 block text-sm font-semibold">Loja (Unidade)</label>
                    <select required value={storeId} onChange={e => setStoreId(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-2 outline-none focus:border-zinc-950 bg-white">
                      <option value="">Selecione...</option>
                      {initialData.stores.map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <button disabled={isUserLoading} type="submit" className="flex w-full mt-2 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-50">
                {isUserLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Criar Conta
              </button>
            </form>
          </div>

          <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-zinc-950">Usuários Registrados</h3>
            <ul className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {initialData.users.map(u => (
                <li key={u.id} className="flex flex-col gap-1 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                  <div className="flex justify-between">
                    <span className="font-bold text-zinc-950">{u.name || u.username}</span>
                    <span className="rounded-md bg-zinc-200 px-2 text-[10px] font-bold text-zinc-700">{u.role}</span>
                  </div>
                  <div className="text-xs text-zinc-500">Login: @{u.username}</div>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </div>
  );
}
