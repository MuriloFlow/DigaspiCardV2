"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TrendingUp, Check, Loader2, Store, X } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useRecords } from "@/components/providers/records-provider";
import { cn } from "@/lib/utils/cn";
import { CustomSelect } from "@/components/ui/custom-select";
import type { Collaborator } from "@/lib/records/types";

export function ViradaPuModal({
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
  const { refresh: refreshRecords } = useRecords();

  const isGlobalOrRegional =
    user?.role === "GLOBAL_ADMIN" ||
    user?.role === "TI_ADMIN" ||
    user?.role === "REGIONAL_MANAGER";

  const userStoreId = (user as any)?.storeId ?? null;
  const defaultStoreId = isGlobalOrRegional
    ? (selectedStoreId ?? "")
    : (userStoreId ?? "");

  const [localStoreId, setLocalStoreId] = useState<string>(defaultStoreId);
  const [caixas, setCaixas] = useState<Collaborator[]>([]);
  const [selectedCaixaId, setSelectedCaixaId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [fetchingCaixas, setFetchingCaixas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successFlash, setSuccessFlash] = useState(false);

  // Sync store defaults
  useEffect(() => {
    if (open && !isGlobalOrRegional) {
      if (userStoreId) setLocalStoreId(userStoreId);
    }
  }, [open, userStoreId, isGlobalOrRegional]);

  useEffect(() => {
    if (open) {
      setError(null);
      setSuccessFlash(false);
      setLoading(false);
      setSelectedCaixaId("");
    }
  }, [open]);

  const finalStoreId = localStoreId || defaultStoreId;
  const needsStorePicker = isGlobalOrRegional && !selectedStoreId;

  // Load caixas when storeId is known
  useEffect(() => {
    if (open && finalStoreId) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);

      setFetchingCaixas(true);
      setCaixas([]);
      setSelectedCaixaId("");
      fetch(`/api/collaborators?storeId=${finalStoreId}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      })
        .then(async (r) => {
          const data = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(data.message || "Erro ao buscar caixas.");
          return data;
        })
        .then((data) => {
          if (data.collaborators) {
            // Filter only active Caixa or Lider de Caixa
            const caixasData = data.collaborators.filter(
              (c: Collaborator) => c.isActive && (c.subRole === "Caixa" || c.subRole === "Lider de Caixa")
            );
            setCaixas(caixasData);
            if (caixasData.length > 0) {
              setSelectedCaixaId(caixasData[0].id);
            }
          }
        })
        .catch((e) => {
          if (e instanceof DOMException && e.name === "AbortError") {
            setError("Tempo esgotado ao buscar colaboradores desta unidade.");
          } else {
            setError(e instanceof Error ? e.message : "Erro ao buscar colaboradores.");
          }
          setCaixas([]);
        })
        .finally(() => {
          window.clearTimeout(timeout);
          setFetchingCaixas(false);
        });

      return () => {
        window.clearTimeout(timeout);
        controller.abort();
      };
    }
  }, [open, finalStoreId]);

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const handleSave = async () => {
    if (!finalStoreId) {
      setError("Selecione a unidade.");
      return;
    }

    if (!selectedCaixaId) {
      setError("Selecione o operador do caixa.");
      return;
    }

    const selectedCaixa = caixas.find((c) => c.id === selectedCaixaId);
    if (!selectedCaixa) return;

    setLoading(true);
    setError(null);
    try {
      const bodyData: any = { 
        storeId: finalStoreId, 
        collaboratorId: selectedCaixaId,
        collaboratorName: selectedCaixa.name
      };
      
      const res = await fetch("/api/viradas-pu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      let data: any = {};
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        data = await res.json();
      }

      if (!res.ok) throw new Error(data.message || "Erro ao registrar virada PU.");

      await refreshRecords();
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
                    <TrendingUp className="size-5 text-emerald-500" /> Virada de PU
                  </h2>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    Registre a conversão de Produto Único do operador.
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

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-zinc-700">
                    Operador (Caixa)
                  </label>
                  {fetchingCaixas ? (
                    <div className="flex h-14 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500">
                      <Loader2 className="size-5 animate-spin" />
                      <span className="text-sm">Buscando caixas...</span>
                    </div>
                  ) : caixas.length > 0 ? (
                    <CustomSelect
                      options={caixas.map((c) => ({ value: c.id, label: c.name }))}
                      value={selectedCaixaId}
                      onChange={setSelectedCaixaId}
                      placeholder="Selecione o caixa..."
                    />
                  ) : (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                      Nenhum Caixa ou Líder de Caixa ativo encontrado nesta unidade.
                    </div>
                  )}
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
                    disabled={loading || successFlash || !selectedCaixaId || fetchingCaixas}
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
                      Salvo com sucesso!
                    </>
                  ) : (
                    <>
                      <Check className="size-5" />
                      Registrar Pontuação PU
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
