"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { createStore, updateStore, deleteStore, createUser, updateUser, toggleUserActive, setStoreGoal, getAdminData } from "./actions";
import {
  Building, Users, Key, Save, Loader2, Plus, TrendingUp,
  ShieldCheck, ShieldOff, ArrowLeft, BarChart2, CheckCircle2, Search, Trash2, Target,
  CreditCard, ChevronRight, Edit2, X, Star, Eye, EyeOff, Bug
} from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";

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

  const [isSuccess, setIsSuccess] = useState(false);

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
      setIsSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setIsLoading(false);
    }
  }

  const roleLabel = { EMPLOYEE: "Funcionário Operacional", MANAGER: "Gerente de Unidade", REGIONAL_MANAGER: "Gerente Regional", VM: "VM (Gerente)", GLOBAL_ADMIN: "Admin Global (Rede)", TI_ADMIN: "TI (Dev)" };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 flex w-full max-w-sm flex-col items-center justify-center rounded-[2rem] bg-white p-8 shadow-2xl text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
            <CheckCircle2 className="size-10" />
          </div>
          <h2 className="text-xl font-bold text-zinc-950">Conta Atualizada</h2>
          <p className="mt-1 text-sm text-zinc-500">As alterações foram salvas com sucesso!</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
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
            <CustomSelect
              value={role}
              onChange={(v) => setRole(v === "VM" ? "VM" : v)}
              options={Object.entries(roleLabel).map(([k, v]) => ({ value: k, label: v }))}
            />
          </div>

          {role !== "GLOBAL_ADMIN" && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Unidade (Loja)</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <CustomSelect
                      value={storeId}
                      onChange={setStoreId}
                      placeholder="Sem loja vinculada"
                      options={stores.map(s => ({ value: s.id, label: s.name }))}
                    />
                  </div>
                  {storeId && (
                    <button 
                      type="button" 
                      onClick={() => setStoreId("")}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200"
                      title="Remover vínculo com unidade"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              {role === "VM" && (
                <p className="rounded-xl border border-pink-200 bg-pink-50 px-4 py-2.5 text-xs font-medium text-pink-700">
                  O cargo VM tem as mesmas permissões de Gerente de Unidade.
                </p>
              )}

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 transition hover:bg-zinc-100">
                <div className={`relative flex size-9 items-center justify-center rounded-xl transition ${isPrimary ? "bg-amber-400" : "bg-zinc-200"}`}>
                  <Star className={`size-5 ${isPrimary ? "fill-white text-white" : "text-zinc-400"}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-zinc-950">Gerente Principal</p>
                  <p className="text-xs text-zinc-500">Responsável primário desta unidade</p>
                </div>
                <input type="checkbox" className="sr-only" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} />
                <div className={`flex h-5 w-9 items-center rounded-full transition-colors ${isPrimary ? "bg-emerald-500" : "bg-zinc-300"}`}>
                  <div className={`size-4 rounded-full bg-white transition-transform ${isPrimary ? "translate-x-4" : "translate-x-1"}`} />
                </div>
              </label>
            </div>
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

// ─── Modal de Criação de Conta ──────────────────────────────────────────────────
function CreateUserModal({
  isOpen, stores, onClose, onCreated
}: {
  isOpen: boolean; stores: Store[]; onClose: () => void; onCreated: (payload: any) => Promise<void>
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("MANAGER");
  const [storeId, setStoreId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await onCreated({
        name,
        username,
        password_plain: password,
        role,
        store_id: role === "GLOBAL_ADMIN" ? null : storeId || null,
        is_primary: false,
      });
      setIsSuccess(true);
      setTimeout(() => {
        setName(""); setUsername(""); setPassword("");
        setRole("MANAGER"); setStoreId("");
        setIsSuccess(false);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 flex w-full max-w-sm flex-col items-center justify-center rounded-[2rem] bg-white p-8 shadow-2xl text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
            <CheckCircle2 className="size-10" />
          </div>
          <h2 className="text-xl font-bold text-zinc-950">Conta Criada</h2>
          <p className="mt-1 text-sm text-zinc-500">O novo usuário já pode acessar o sistema.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative z-10 w-full max-w-md rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500">Nova Conta</p>
            <h2 className="text-xl font-bold text-zinc-950">Criar Usuário</h2>
          </div>
          <button onClick={onClose} className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">Nome Completo</label>
            <input required value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-zinc-950" placeholder="Nome do usuário" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Login</label>
              <input required value={username} onChange={e => setUsername(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-zinc-950" placeholder="ex: joao.silva" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Senha</label>
              <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-zinc-950" placeholder="••••••••" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">Nível de Acesso</label>
            <CustomSelect
              value={role}
              onChange={setRole}
              options={[
                { value: "MANAGER", label: "Gerente de Unidade" },
                { value: "VM", label: "VM (Gerente)" },
                { value: "REGIONAL_MANAGER", label: "Gerente Regional" },
                { value: "GLOBAL_ADMIN", label: "Admin Global" },
                { value: "TI_ADMIN", label: "TI (Dev)" },
              ]}
            />
          </div>
          {role !== "GLOBAL_ADMIN" && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Unidade (Opcional)</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <CustomSelect
                    value={storeId}
                    onChange={setStoreId}
                    placeholder="Sem loja vinculada..."
                    options={stores.map(s => ({ value: s.id, label: s.name }))}
                  />
                </div>
                {storeId && (
                  <button 
                    type="button" 
                    onClick={() => setStoreId("")}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200"
                    title="Remover vínculo com unidade"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700">{error}</p>}

          <button disabled={isLoading} type="submit" className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-50">
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Criar Conta
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Modal de Criação de Unidade ──────────────────────────────────────────────
function CreateStoreModal({
  isOpen, onClose, onCreated
}: {
  isOpen: boolean; onClose: () => void; onCreated: (storeName: string, opUsername: string, opPassword: string) => Promise<void>
}) {
  const [storeName, setStoreName] = useState("");
  const [opUsername, setOpUsername] = useState("");
  const [opPassword, setOpPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await onCreated(storeName, opUsername, opPassword);
      setIsSuccess(true);
      setTimeout(() => {
        setStoreName(""); setOpUsername(""); setOpPassword("");
        setIsSuccess(false);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 flex w-full max-w-sm flex-col items-center justify-center rounded-[2rem] bg-white p-8 shadow-2xl text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
            <CheckCircle2 className="size-10" />
          </div>
          <h2 className="text-xl font-bold text-zinc-950">Unidade Criada</h2>
          <p className="mt-1 text-sm text-zinc-500">A nova loja já foi adicionada à rede.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative z-10 w-full max-w-md rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500">Nova Unidade</p>
            <h2 className="text-xl font-bold text-zinc-950">Adicionar à Rede</h2>
          </div>
          <button onClick={onClose} className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">Nome da Unidade</label>
            <input required value={storeName} onChange={e => {
              const newName = e.target.value;
              setStoreName(newName);
              const match = newName.match(/\d+/);
              if (match) {
                setOpUsername(`operacao.${match[0]}`);
                setOpPassword(`lojadigaspi`);
              } else {
                const slug = newName.toLowerCase().replace(/\s+/g, '');
                setOpUsername(`operacao.${slug}`);
                setOpPassword(`loja${slug}`);
              }
            }} className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-zinc-950" placeholder="Ex: Digaspi 42" />
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
            <h4 className="mb-3 text-sm font-bold text-zinc-950">Conta Genérica de Operadores</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Login</label>
                <input required value={opUsername} onChange={e => setOpUsername(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-950" placeholder="ex: op.loja42" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Senha</label>
                <input required type="password" value={opPassword} onChange={e => setOpPassword(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-950" placeholder="••••••••" />
              </div>
            </div>
          </div>

          {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700">{error}</p>}

          <button disabled={isLoading} type="submit" className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-50">
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Criar Unidade
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Modal de Edição de Unidade ──────────────────────────────────────────────
function EditStoreModal({
  store, storeUser, onClose, onSaved,
}: { store: Store; storeUser: AppUser | undefined; onClose: () => void; onSaved: (storeId: string, storeName: string, opUsername: string, opPassword?: string) => Promise<void> }) {
  const [storeName, setStoreName] = useState(store.name);
  const [opUsername, setOpUsername] = useState(storeUser?.username || "");
  const [opPassword, setOpPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await onSaved(store.id, storeName, opUsername, opPassword || undefined);
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 flex w-full max-w-sm flex-col items-center justify-center rounded-[2rem] bg-white p-8 shadow-2xl text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
            <CheckCircle2 className="size-10" />
          </div>
          <h2 className="text-xl font-bold text-zinc-950">Unidade Atualizada</h2>
          <p className="mt-1 text-sm text-zinc-500">As alterações foram salvas com sucesso!</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative w-full max-w-md rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-2xl">
        <button onClick={onClose} className="absolute right-5 top-5 rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 transition">
          <X className="size-5" />
        </button>

        <div className="mb-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Editar Unidade</p>
          <h2 className="mt-1 text-xl font-bold text-zinc-950">{store.name}</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">Nome da Unidade</label>
            <input required value={storeName} onChange={e => setStoreName(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-950" />
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
            <h4 className="mb-3 text-sm font-bold text-zinc-950">Conta Genérica de Operadores</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Login</label>
                <input required value={opUsername} onChange={e => setOpUsername(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-950" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Nova Senha</label>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"} value={opPassword} onChange={e => setOpPassword(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 pr-10 text-sm outline-none transition focus:border-zinc-950" placeholder={storeUser ? "•••••••• (Mantida)" : "Deixe vazio p/ manter"} />
                  <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                    {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

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

// ─── Modal de Definir Meta ──────────────────────────────────────────────────
function SetGoalModal({ store, onClose, onSaved }: { store: Store; onClose: () => void; onSaved: () => void }) {
  const [goal, setGoal] = useState("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const goalNum = parseInt(goal, 10);
    if (isNaN(goalNum) || goalNum <= 0) {
      setError("Insira um número válido para a meta.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await setStoreGoal(store.id, date, goalNum);
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao definir meta.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative w-full max-w-sm rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-2xl">
        <button onClick={onClose} className="absolute right-5 top-5 rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 transition"><X className="size-5" /></button>
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase text-zinc-500">Definir Meta Manual</p>
          <h2 className="mt-1 text-xl font-bold text-zinc-950">{store.name}</h2>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">Data da Meta</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-950" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">Meta de Cartões (Qtd)</label>
            <input type="number" min="1" step="1" placeholder="Ex: 15" value={goal} onChange={e => setGoal(e.target.value)} required className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-950" />
          </div>
          {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700">{error}</p>}
          <button disabled={isLoading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-50">
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar Meta
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
  const [createStoreModalOpen, setCreateStoreModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [setGoalStoreId, setSetGoalStoreId] = useState<string | null>(null);
  
  const [stores, setStores] = useState(initialData.stores);
  const [users, setUsers] = useState(initialData.users);
  
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null);
  const [confirmDeleteStoreId, setConfirmDeleteStoreId] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<"OVERVIEW" | "USERS">("OVERVIEW");
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [storeMetrics, setStoreMetrics] = useState<{
    store: { id: string; name: string } | null;
    collaboratorsCount: number;
    cardsToday: number;
    cardsThisMonth: number;
  } | null>(null);
  const [storeMetricsLoading, setStoreMetricsLoading] = useState(false);
  const [storeSearch, setStoreSearch] = useState("");
  const [userStoreFilter, setUserStoreFilter] = useState("all");

  async function openStoreDetail(storeId: string) {
    setSelectedStoreId(storeId);
    setDrawerTab("OVERVIEW");
    setStoreMetrics(null);
    setStoreMetricsLoading(true);
    try {
      const res = await fetch(`/api/admin/metrics?storeId=${storeId}`, { cache: "no-store" });
      if (res.ok) setStoreMetrics(await res.json());
    } catch { /* silencioso */ }
    finally { setStoreMetricsLoading(false); }
  }

  function showToast(message: string, type: "success" | "error" = "success") {
    setToastMsg({ message, type });
    setTimeout(() => setToastMsg(null), 3000);
  }

  async function refreshData() {
    try {
      const d = await getAdminData();
      if (d.users) setUsers(d.users);
      if (d.stores) setStores(d.stores);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteStore(id: string) {
    try {
      await deleteStore(id);
      setStores(prev => prev.filter(s => s.id !== id));
      showToast("Unidade e todos os seus dados foram deletados.");
      setConfirmDeleteStoreId(null);
      refreshData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erro ao deletar unidade.", "error");
    }
  }



  async function handleToggleActive(u: AppUser) {
    setToggleLoadingId(u.id);
    try {
      await toggleUserActive(u.id, !u.is_active);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !x.is_active } : x));
      showToast(u.is_active ? "Conta desativada temporariamente." : "Conta ativada com sucesso.");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erro desconhecido", "error");
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
    VM: "VM",
    EMPLOYEE: "Funcionário",
    REGIONAL_MANAGER: "Gerente Regional",
    TI_ADMIN: "TI (Dev)",
  };
  const roleColor: Record<string, string> = {
    GLOBAL_ADMIN: "bg-purple-100 text-purple-700",
    MANAGER: "bg-blue-100 text-blue-700",
    VM: "bg-pink-100 text-pink-700",
    EMPLOYEE: "bg-zinc-100 text-zinc-600",
    REGIONAL_MANAGER: "bg-indigo-100 text-indigo-700",
    TI_ADMIN: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className={`fixed left-1/2 top-4 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 shadow-2xl ${toastMsg.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}
          >
            {toastMsg.type === "success" ? <CheckCircle2 className="size-5" /> : <X className="size-5" />}
            <p className="text-sm font-semibold">{toastMsg.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-zinc-100 p-1 w-full max-w-full overflow-x-auto hide-scrollbar sm:w-fit sm:overflow-visible">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all shrink-0 ${activeTab === tab.id ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950"}`}
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

            <div className="rounded-[1.5rem] border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
                <h3 className="text-base font-bold text-zinc-950">Unidades da Rede</h3>
                <span className="text-xs font-medium text-zinc-500">{initialData.stores.length} unidade(s)</span>
              </div>
              <div className="divide-y divide-zinc-100">
                {initialData.stores.map((store) => {
                  const storeUsers = users.filter(u => u.store_id === store.id);
                  const manager = storeUsers.find(u => (u.role === "MANAGER" || u.role === "REGIONAL_MANAGER") && u.is_primary);
                  return (
                    <button
                      key={store.id}
                      onClick={() => openStoreDetail(store.id)}
                      className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-zinc-50 active:bg-zinc-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-950">
                          <Building className="size-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-950">{store.name}</p>
                          <p className="text-xs text-zinc-500">
                            {manager ? `${manager.name || manager.username}` : "Sem gerente"}
                            {" · "}{storeUsers.length} usuário(s)
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-zinc-400" />
                    </button>
                  );
                })}
                {initialData.stores.length === 0 && (
                  <p className="px-6 py-4 text-sm text-zinc-500">Nenhuma unidade cadastrada.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── DETALHE DA LOJA (DRAWER) ─── */}
        {activeTab === "OVERVIEW" && selectedStoreId && (() => {
          const store = initialData.stores.find(s => s.id === selectedStoreId);
          const storeUsers = users.filter(u => u.store_id === selectedStoreId);
          const managers = storeUsers.filter(u => u.role === "MANAGER" || u.role === "REGIONAL_MANAGER" || u.role === "VM");
          const employees = storeUsers.filter(u => u.role === "EMPLOYEE");
          const primaryManager = managers.find(u => u.is_primary);
          const manager = primaryManager || managers[0];

          return (
            <motion.div
              key="store-detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 flex justify-end"
            >
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedStoreId(null)} />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
              >
                {/* Header fixo */}
                <div className="shrink-0 border-b border-zinc-100">
                  <div className="flex items-center gap-3 px-5 py-4">
                    <button onClick={() => setSelectedStoreId(null)} className="flex size-9 shrink-0 items-center justify-center rounded-xl hover:bg-zinc-100 transition">
                      <ArrowLeft className="size-5 text-zinc-600" />
                    </button>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Unidade</p>
                      <h2 className="truncate text-base font-bold text-zinc-950">{store?.name}</h2>
                    </div>
                  </div>

                  {/* Tabs internas */}
                  <div className="flex gap-1 px-5 pb-3">
                    {(["OVERVIEW", "USERS"] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setDrawerTab(tab)}
                        className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition ${
                          drawerTab === tab ? "bg-zinc-950 text-white" : "text-zinc-500 hover:bg-zinc-100"
                        }`}
                      >
                        {tab === "OVERVIEW" ? "Visão Geral" : `Funcionários (${storeUsers.length})`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conteúdo rolável */}
                <div className="flex-1 overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {/* ── ABA: VISÃO GERAL ── */}
                    {drawerTab === "OVERVIEW" && (
                      <motion.div key="dov" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4 p-5">
                        {/* Métricas */}
                        {storeMetricsLoading ? (
                          <div className="flex items-center justify-center py-10">
                            <Loader2 className="size-6 animate-spin text-zinc-400" />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { label: "Cartões Hoje", value: storeMetrics?.cardsToday ?? 0, icon: CreditCard, color: "bg-emerald-500" },
                              { label: "Cartões no Mês", value: storeMetrics?.cardsThisMonth ?? 0, icon: BarChart2, color: "bg-blue-500" },
                              { label: "Colaboradores", value: storeMetrics?.collaboratorsCount ?? 0, icon: Users, color: "bg-purple-500" },
                              { label: "Usuários Vinculados", value: storeUsers.length, icon: Key, color: "bg-orange-500" },
                            ].map(card => (
                              <div key={card.label} className="rounded-[1.25rem] border border-zinc-200 bg-zinc-50 p-4">
                                <div className={`mb-2 flex size-8 items-center justify-center rounded-xl ${card.color}`}>
                                  <card.icon className="size-4 text-white" />
                                </div>
                                <p className="text-2xl font-bold text-zinc-950">{card.value}</p>
                                <p className="text-xs font-medium text-zinc-500">{card.label}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="rounded-[1.25rem] border border-zinc-200 bg-zinc-50 px-4 py-3">
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Gerente Responsável</p>
                          {manager ? (
                            <div className="flex items-center gap-2">
                              {primaryManager && <Star className="size-3.5 fill-amber-400 text-amber-400" />}
                              <p className="font-semibold text-zinc-950">{manager.name || manager.username}</p>
                              <span className="rounded-lg bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                {primaryManager ? "Principal" : "Gerente"}
                              </span>
                            </div>
                          ) : (
                            <p className="text-sm text-zinc-500">Sem gerente definido</p>
                          )}
                          <div className="mt-3 border-t border-zinc-200 pt-3">
                            <button
                              onClick={() => setSetGoalStoreId(store?.id || null)}
                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white border border-zinc-200 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:border-zinc-300"
                            >
                              <Target className="size-4" />
                              Definir Meta Manual
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => setDrawerTab("USERS")}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 py-3 text-sm font-bold text-white transition hover:bg-zinc-800"
                        >
                          <Users className="size-4" /> Ver Funcionários ({storeUsers.length})
                        </button>
                      </motion.div>
                    )}

                    {/* ── ABA: FUNCIONÁRIOS ── */}
                    {drawerTab === "USERS" && (
                      <motion.div key="dusers" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5 p-5">
                        {/* Gerentes */}
                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Gerentes</span>
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600">{managers.length}</span>
                          </div>
                          {managers.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-zinc-200 py-4 text-center text-xs text-zinc-500">Nenhum gerente vinculado</p>
                          ) : (
                            <ul className="space-y-2">
                              {managers.map(u => (
                                <li key={u.id} className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white px-3 py-3">
                                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                                    <span className="text-sm font-bold text-blue-700">{(u.name || u.username).charAt(0).toUpperCase()}</span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      {u.is_primary && <Star className="size-3 fill-amber-400 text-amber-400" />}
                                      <p className="truncate text-sm font-semibold text-zinc-950">{u.name || u.username}</p>
                                    </div>
                                    <p className="text-xs text-zinc-500">@{u.username}{u.is_primary ? " · Principal" : ""}</p>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1">
                                    <button
                                      onClick={() => handleToggleActive(u)}
                                      disabled={toggleLoadingId === u.id}
                                      title={u.is_active ? "Desativar" : "Ativar"}
                                      className="flex size-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-100 transition"
                                    >
                                      {toggleLoadingId === u.id ? <Loader2 className="size-3.5 animate-spin" /> : u.is_active ? <ShieldCheck className="size-4 text-emerald-500" /> : <ShieldOff className="size-4 text-rose-400" />}
                                    </button>
                                    <button onClick={() => setEditingUser(u)} className="flex size-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-blue-50 hover:text-blue-600 transition">
                                      <Edit2 className="size-4" />
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Funcionários Operacionais */}
                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Operadores</span>
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600">{employees.length}</span>
                          </div>
                          {employees.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-zinc-200 py-4 text-center text-xs text-zinc-500">Nenhum operador vinculado</p>
                          ) : (
                            <ul className="space-y-2">
                              {employees.map(u => (
                                <li key={u.id} className={`group flex items-center gap-4 rounded-[1.25rem] border p-4 transition-all duration-300 ${u.is_active ? "border-zinc-100 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.02)] hover:border-zinc-200 hover:shadow-[0_8px_32px_rgba(15,23,42,0.05)]" : "border-zinc-100 bg-zinc-50/50 opacity-70"}`}>
                                  <div className="flex size-11 shrink-0 items-center justify-center rounded-[1rem] bg-zinc-100/80 text-zinc-600 ring-1 ring-zinc-200">
                                    <span className="text-sm font-extrabold">{(u.name || u.username).charAt(0).toUpperCase()}</span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-extrabold text-zinc-950">{u.name || u.username}</p>
                                    <div className="flex items-center gap-2">
                                      <p className="text-[11px] font-medium text-zinc-500">@{u.username}</p>
                                      {!u.is_active && <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 uppercase tracking-wide">Inativo</span>}
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1">
                                    <button
                                      onClick={() => handleToggleActive(u)}
                                      disabled={toggleLoadingId === u.id}
                                      title={u.is_active ? "Desativar" : "Ativar"}
                                      className="flex size-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-100 transition"
                                    >
                                      {toggleLoadingId === u.id ? <Loader2 className="size-3.5 animate-spin" /> : u.is_active ? <ShieldCheck className="size-4 text-emerald-500" /> : <ShieldOff className="size-4 text-rose-400" />}
                                    </button>
                                    <button onClick={() => setEditingUser(u)} className="flex size-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-blue-50 hover:text-blue-600 transition">
                                      <Edit2 className="size-4" />
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}

        {/* ── LOJAS ─── */}
        {activeTab === "STORES" && (
          <motion.div key="stores" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            
            <div className="mb-6 flex items-center justify-between gap-4 rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-950">
                  <Building className="size-5" /> Unidades da Rede
                </h3>
                <p className="mt-1 text-sm text-zinc-500">Gerencie as lojas e unidades</p>
              </div>
              <button
                onClick={() => setCreateStoreModalOpen(true)}
                className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-zinc-800"
              >
                <Plus className="size-4" /> Nova Unidade
              </button>
            </div>

            <div className="rounded-[1.75rem] border border-zinc-100 bg-white p-7 shadow-[0_8px_32px_rgba(15,23,42,0.03)]">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="flex items-center gap-3 text-lg font-extrabold text-zinc-950">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700"><Building className="size-5" /></div>
                  Lista de Unidades ({stores.length})
                </h3>
                <div className="flex w-full items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 sm:max-w-xs transition-colors focus-within:border-zinc-400">
                  <Search className="size-4 text-zinc-400" />
                  <input value={storeSearch} onChange={e => setStoreSearch(e.target.value)} placeholder="Pesquisar por unidade..." className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400 text-zinc-950" />
                  {storeSearch && <button onClick={() => setStoreSearch("")} className="text-zinc-400 hover:text-zinc-600"><X className="size-4" /></button>}
                </div>
              </div>

              <ul className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {stores.filter(s => s.name.toLowerCase().includes(storeSearch.toLowerCase())).map(s => {
                  const opUser = users.find(u => u.store_id === s.id && u.role === "EMPLOYEE");
                  return (
                    <li key={s.id} className="group flex items-center justify-between rounded-[1.25rem] border border-zinc-100 bg-zinc-50/50 px-5 py-4 transition-all hover:bg-zinc-50 hover:shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
                          <Building className="size-4 text-zinc-400 transition group-hover:text-zinc-700" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-zinc-900 block">{s.name}</span>
                          <span className="text-xs text-zinc-500 block">Op: {opUser ? `@${opUser.username}` : "Sem conta vinculada"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-zinc-200/50 px-2.5 py-1 font-mono text-[10px] font-bold text-zinc-500">{s.id.split("-")[0]}</span>
                        <button onClick={() => setEditingStore(s)} className="flex size-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-blue-50 hover:text-blue-600 transition">
                          <Edit2 className="size-4" />
                        </button>
                        <button onClick={() => setConfirmDeleteStoreId(s.id)} className="flex size-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-rose-50 hover:bg-rose-600 transition">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        )}

        {/* ── USUÁRIOS ─── */}
        {activeTab === "USERS" && (
          <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            
            <div className="mb-6 flex items-center justify-between gap-4 rounded-[1.5rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-950">
                  <Key className="size-5" /> Contas e Acessos
                </h3>
                <p className="mt-1 text-sm text-zinc-500">Gerencie o acesso de gestores</p>
              </div>
              <button
                onClick={() => setCreateUserModalOpen(true)}
                className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-zinc-800"
              >
                <Plus className="size-4" /> Nova Conta
              </button>
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
                          {u.role === "TI_ADMIN" && (
                            <span aria-label="TI">
                              <Bug className="size-4 shrink-0 fill-emerald-500/20 text-emerald-500" />
                            </span>
                          )}
                          {(u.role === "MANAGER" || u.role === "REGIONAL_MANAGER" || u.role === "VM") && u.is_primary && (
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
            stores={stores}
            onClose={() => setEditingUser(null)}
            onSaved={async () => {
              await refreshData();
            }}
          />
        )}
        {createUserModalOpen && (
          <CreateUserModal
            isOpen={createUserModalOpen}
            stores={stores}
            onClose={() => setCreateUserModalOpen(false)}
            onCreated={async (payload) => {
              await createUser(payload);
              await refreshData();
            }}
          />
        )}
        {createStoreModalOpen && (
          <CreateStoreModal
            isOpen={createStoreModalOpen}
            onClose={() => setCreateStoreModalOpen(false)}
            onCreated={async (sName, opUsername, opPassword) => {
              const sid = await createStore(sName);
              await createUser({
                name: `Operadores - ${sName}`,
                username: opUsername,
                password_plain: opPassword,
                role: "EMPLOYEE",
                store_id: sid,
              });
              await refreshData();
            }}
          />
        )}
        {editingStore && (
          <EditStoreModal
            store={editingStore}
            storeUser={users.find(u => u.store_id === editingStore.id && u.role === "EMPLOYEE")}
            onClose={() => setEditingStore(null)}
            onSaved={async (sid, sName, opUsername, opPassword) => {
              await updateStore(sid, sName);
              const existingOp = users.find(u => u.store_id === sid && u.role === "EMPLOYEE");
              if (existingOp) {
                await updateUser({
                  id: existingOp.id,
                  username: opUsername,
                  password_plain: opPassword || undefined,
                });
              } else {
                await createUser({
                  name: `Operadores - ${sName}`,
                  username: opUsername,
                  password_plain: opPassword || "",
                  role: "EMPLOYEE",
                  store_id: sid,
                });
              }
              await refreshData();
            }}
          />
        )}
      </AnimatePresence>

      {/* Confirmação de Deleção de Loja */}
      <AnimatePresence>
        {confirmDeleteStoreId && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center sm:p-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmDeleteStoreId(null)}
          >
            <motion.div
              className="w-full max-w-sm overflow-hidden rounded-[2rem] bg-white shadow-2xl"
              initial={{ y: "100%", scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: "100%", scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-rose-50 p-6 pb-5 text-center">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-sm ring-4 ring-rose-50/50">
                  <Trash2 className="size-6" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-rose-950">Deletar Unidade</h3>
                <p className="text-sm font-medium leading-relaxed text-rose-800/80">
                  Tem certeza que deseja <strong className="text-rose-600">DELETAR</strong> esta unidade? <br />
                  <span className="font-semibold text-rose-900">Todos os usuários, colaboradores e registros vinculados serão APAGADOS permanentemente.</span> Esta ação é irreversível.
                </p>
              </div>
              <div className="flex gap-3 bg-white p-5">
                <button
                  onClick={() => setConfirmDeleteStoreId(null)}
                  className="flex-1 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteStore(confirmDeleteStoreId)}
                  className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700 shadow-[0_4px_14px_rgba(225,29,72,0.3)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.4)]"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE DEFINIR META */}
      <AnimatePresence>
        {setGoalStoreId && (
          <SetGoalModal
            store={stores.find(s => s.id === setGoalStoreId)!}
            onClose={() => setSetGoalStoreId(null)}
            onSaved={() => {
              showToast("Meta manual definida com sucesso!");
              refreshData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
