"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { CreditCard, Timer, Trash2, Loader2, AlertTriangle, Edit2, Check, X } from "lucide-react";
import { getOperatorColor } from "@/lib/records/colors";
import type { OperatorRecord } from "@/lib/records/types";
import { formatCurrency, formatTime } from "@/lib/utils/format";
import { useRecords } from "@/components/providers/records-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils/cn";

export function RecordCard({
  record,
  index = 0,
  showDelete = true,
}: {
  record: OperatorRecord;
  index?: number;
  showDelete?: boolean;
}) {
  const color = getOperatorColor(record.operatorName, index);
  const { deleteRecord, refresh, isDeleting } = useRecords();
  const { user } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editClient, setEditClient] = useState(record.clientName);
  const [editAmount, setEditAmount] = useState((record.amountInCents / 100).toString());
  const [editActivated, setEditActivated] = useState(record.activated);
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const isBeingDeleted = isDeleting === record.id;
  const canDelete = user?.role === "GLOBAL_ADMIN" || user?.role === "MANAGER";

  async function handleDelete() {
    try {
      await deleteRecord(record.id);
    } catch {
      // Error is handled in the provider
    }
    setConfirmDelete(false);
  }

  async function handleSaveEdit() {
    setIsSaving(true);
    try {
      const res = await fetch("/api/records", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: record.id,
          clientName: editClient,
          activated: editActivated,
          amountInCents: Math.round(Number(editAmount.replace(/,/g, ".")) * 100) || 0
        })
      });
      if (res.ok) {
        setIsEditing(false);
        refresh();
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: isBeingDeleted ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, y: -12, height: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.035, 0.18) }}
      className="group relative overflow-hidden rounded-[1.5rem] border border-zinc-200/80 bg-white p-4 shadow-[0_14px_42px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_20px_54px_rgba(15,23,42,0.08)]"
    >
      {mounted && createPortal(
        <AnimatePresence>
          {isEditing && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-white shadow-2xl"
            >
              <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-5">
                <h3 className="text-lg font-bold text-zinc-950">Editar Registro</h3>
                <p className="text-sm font-medium text-zinc-500">Corrija os dados do cartão de {record.operatorName}</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Nome do Cliente</label>
                  <input 
                    value={editClient} 
                    onChange={e => setEditClient(e.target.value)} 
                    className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/5" 
                    placeholder="Nome do cliente"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Valor</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3.5 flex items-center text-sm font-semibold text-zinc-500">
                        R$
                      </span>
                      <input 
                        type="text"
                        value={editAmount} 
                        onChange={e => {
                          const val = e.target.value.replace(/[^0-9.,]/g, "");
                          setEditAmount(val);
                        }} 
                        className="w-full rounded-xl border border-zinc-200 pl-9 pr-3 py-3 text-sm outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/5" 
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Status</label>
                    <label className="flex h-[46px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold transition hover:bg-zinc-100">
                      <input 
                        type="checkbox" 
                        checked={editActivated} 
                        onChange={e => setEditActivated(e.target.checked)} 
                        className="size-4 rounded border-zinc-300 accent-zinc-900"
                      />
                      Ativo
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setIsEditing(false)} className="flex-1 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-200">Cancelar</button>
                  <button onClick={handleSaveEdit} disabled={isSaving} className="flex-1 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50">
                    {isSaving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
            </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <div className="flex items-center gap-4">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-[0_12px_26px_rgba(15,23,42,0.12)]"
            style={{ backgroundColor: color }}
          >
            {record.operatorName.slice(0, 1).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-zinc-950 flex items-center gap-2">
                  {record.operatorName}
                  {user?.role === "GLOBAL_ADMIN" && record.storeName && (
                    <span className="text-xs font-medium text-zinc-500 px-1.5 py-0.5 bg-zinc-100 rounded-md">
                      {record.storeName}
                    </span>
                  )}
                </h3>
                <p className="mt-1 truncate text-sm text-zinc-500">
                  {record.clientName}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <p className="text-sm font-semibold text-zinc-950">
                  {formatCurrency(record.amountInCents)}
                </p>
                <button
                  type="button"
                  aria-label="Editar registro"
                  onClick={() => setIsEditing(true)}
                  className="flex size-8 items-center justify-center rounded-xl text-zinc-400 opacity-0 transition duration-200 hover:bg-blue-50 hover:text-blue-600 focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Edit2 className="size-4" />
                </button>
                {showDelete && canDelete && (
                  <button
                    type="button"
                    aria-label="Deletar registro"
                    onClick={() => setConfirmDelete(true)}
                    disabled={isBeingDeleted}
                    className="flex size-8 items-center justify-center rounded-xl text-zinc-400 opacity-0 transition duration-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30 group-hover:opacity-100 disabled:cursor-not-allowed"
                  >
                    {isBeingDeleted ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3 text-xs font-medium text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <CreditCard aria-hidden="true" className="size-3.5" />
                Cartao
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Timer aria-hidden="true" className="size-3.5" />
                {formatTime(record.createdAt)}
              </span>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                record.activated
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              )}>
                {record.activated ? "Ativo" : "Pendente"}
              </span>
            </div>
          </div>
        </div>

      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-3 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5"
          >
            <AlertTriangle className="size-4 shrink-0 text-amber-600" />
            <p className="flex-1 text-xs font-medium text-amber-800">
              Tem certeza? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isBeingDeleted}
                className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-wait disabled:opacity-75"
              >
                {isBeingDeleted ? "Deletando..." : "Deletar"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
