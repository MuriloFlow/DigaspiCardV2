"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRightLeft, Check, Loader2, Store, X } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useDigitacoes } from "@/components/providers/digitacoes-provider";
import { useRecords } from "@/components/providers/records-provider";
import { cn } from "@/lib/utils/cn";
import { CustomSelect } from "@/components/ui/custom-select";
import { notifyRecordsChanged } from "@/lib/records/realtime-client";

export function AddTrocaModal({
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
  const { refresh: refreshDigitacoes } = useDigitacoes();
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
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [fetchingManagers, setFetchingManagers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successFlash, setSuccessFlash] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setLocalStoreId(defaultStoreId);
      setManagers([]);
      setSelectedManagerId("");
      setError(null);
      setSuccessFlash(false);
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const finalStoreId = localStoreId || defaultStoreId;
  const needsStorePicker = isGlobalOrRegional && !selectedStoreId;

  // Load managers when storeId is known
  useEffect(() => {
    if (open && finalStoreId) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);

      setFetchingManagers(true);
      setManagers([]);
      setSelectedManagerId("");
      fetch(`/api/managers?storeId=${finalStoreId}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      })
        .then(async (r) => {
          const data = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(data.message || "Erro ao buscar gerentes.");
          return data;
        })
        .then((data) => {
          if (data.managers && data.managers.length > 0) {
            setManagers(data.managers);
            setSelectedManagerId(data.managers[0].id);
          } else {
            setManagers([]);
          }
        })
        .catch((e) => {
          if (e instanceof DOMException && e.name === "AbortError") {
            setError("Tempo esgotado ao buscar gerentes desta unidade.");
          } else {
            setError(e instanceof Error ? e.message : "Erro ao buscar gerentes.");
          }
          setManagers([]);
        })
        .finally(() => {
          window.clearTimeout(timeout);
          setFetchingManagers(false);
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
    if (loading) return;
    if (!finalStoreId) {
      setError("Selecione a unidade.");
      return;
    }

    if (!selectedManagerId) {
      setError("Selecione o gerente responsável.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const bodyData: any = { storeId: finalStoreId, managerId: selectedManagerId };
      if (dateKey) bodyData.dateKey = dateKey;
      const res = await fetch("/api/digitacoes/troca", {
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

      if (!res.ok) throw new Error(data.message || "Erro ao registrar troca.");

      await Promise.all([
        refreshDigitacoes(),
        refreshRecords()
      ]);
      notifyRecordsChanged();
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
                    <ArrowRightLeft className="size-5 text-orange-500" /> Registrar Troca
                  </h2>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    Apenas gerentes podem autorizar trocas.
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

                {/* Manager selector */}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-zinc-700">
                    Gerente Autorizador
                  </label>
                  {fetchingManagers ? (
                    <div className="flex h-14 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500">
                      <Loader2 className="size-5 animate-spin" />
                      <span className="text-sm">Buscando gerentes...</span>
                    </div>
                  ) : managers.length > 0 ? (
                    <CustomSelect
                      options={managers.map((m) => ({ value: m.id, label: m.name }))}
                      value={selectedManagerId}
                      onChange={setSelectedManagerId}
                      placeholder="Selecione um gerente..."
                    />
                  ) : (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                      Nenhum gerente ativo encontrado nesta unidade.
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
                    disabled={loading || successFlash || !selectedManagerId || fetchingManagers}
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
                      Registrar Troca
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
