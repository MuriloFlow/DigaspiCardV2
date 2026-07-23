"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, Store, X } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useDigitacoes } from "@/components/providers/digitacoes-provider";
import { cn } from "@/lib/utils/cn";
import { CustomSelect } from "@/components/ui/custom-select";

export function AddCaixaDigitacaoModal({
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
  const { user, selectedStoreId } = useAuth();
  const { refresh } = useDigitacoes();

  const isGlobalOrRegional =
    user?.role === "GLOBAL_ADMIN" ||
    user?.role === "TI_ADMIN" ||
    user?.role === "REGIONAL_MANAGER";

  // For employees/managers, storeId is fixed to their account
  const userStoreId = (user as any)?.storeId ?? null;

  // Default store: for global use selectedStoreId (global picker), for normal users use their fixed store
  const defaultStoreId = isGlobalOrRegional
    ? (selectedStoreId ?? "")
    : (userStoreId ?? "");

  const [localStoreId, setLocalStoreId] = useState<string>(defaultStoreId);
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successFlash, setSuccessFlash] = useState(false);

  // Reset every time modal opens
  useEffect(() => {
    if (open) {
      setLocalStoreId(defaultStoreId);
      setQuantity("1");
      setError(null);
      setSuccessFlash(false);
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const needsStorePicker = isGlobalOrRegional && !selectedStoreId;
  const finalStoreId = localStoreId || defaultStoreId;

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const handleSave = async () => {
    if (!finalStoreId) {
      setError("Selecione a unidade antes de continuar.");
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0 || qty > 500) {
      setError("Quantidade inválida (1–500).");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const bodyData: any = { storeId: finalStoreId, quantity: qty };
      if (dateKey) bodyData.dateKey = dateKey;
      const res = await fetch("/api/digitacoes/caixa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      let data: any = {};
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Resposta inválida do servidor: ${text.slice(0, 120)}`);
      }

      if (!res.ok) throw new Error(data.message || "Erro ao registrar digitações.");

      await refresh();
      setSuccessFlash(true);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  };

  const storeOptions = stores.map((s) => ({ value: s.id, label: s.name }));

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="flex w-full max-w-md flex-col overflow-visible rounded-t-[2rem] bg-white sm:rounded-[2.5rem]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 p-6 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-zinc-950 flex items-center gap-2">
                    <Store className="size-5 text-purple-500" /> Digitação Caixa
                  </h2>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    Registrar digitações diretas no caixa
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="rounded-full bg-zinc-100 p-2 text-zinc-500 hover:bg-zinc-200 disabled:opacity-50"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* Store selector — only for global/regional */}
                {needsStorePicker && (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-zinc-700">
                      Unidade
                    </label>
                    <CustomSelect
                      options={storeOptions}
                      value={localStoreId}
                      onChange={setLocalStoreId}
                      placeholder="Selecione a Unidade"
                    />
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-zinc-700">
                    Quantidade de Digitações
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={quantity}
                    onChange={(e) => {
                      setError(null);
                      setQuantity(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                    }}
                    disabled={loading}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-3xl font-bold text-center text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-4 focus:ring-zinc-950/10 disabled:opacity-60"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                    {error}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 pt-2">
                <button
                  onClick={handleSave}
                  disabled={loading || successFlash || (needsStorePicker && !localStoreId)}
                  className={cn(
                    "flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold shadow-md transition disabled:opacity-50",
                    successFlash
                      ? "bg-emerald-500 text-white"
                      : "bg-black text-[#ffffff] dark:bg-zinc-200 dark:text-zinc-950"
                  )}
                >
                  {loading ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : successFlash ? (
                    <>
                      <Check className="size-5" />
                      Sucesso!
                    </>
                  ) : (
                    <>
                      <Check className="size-5" />
                      Registrar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
