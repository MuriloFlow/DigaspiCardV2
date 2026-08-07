"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, Plus, RefreshCw, Search, Tag, X } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { useRemarcacoes } from "@/components/providers/remarcacoes-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { RemarcacaoCard } from "./remarcacao-card";
import { NewRemarcacaoFlow } from "./new-remarcacao-flow";
import { BarcodeScanner } from "./barcode-scanner";
import { BarcodeHistoryModal } from "./barcode-history-modal";
import type { Remarcacao } from "@/lib/remarcacoes/types";
import { useRouter } from "next/navigation";

export function RemarcacoesView() {
  const router = useRouter();
  const { remarcacoes, isLoading, error, refresh } = useRemarcacoes();
  const { user, selectedStoreId } = useAuth();

  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [flowOpen, setFlowOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [historyModalBarcode, setHistoryModalBarcode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isGlobalOrRegional =
    user?.role === "GLOBAL_ADMIN" ||
    user?.role === "TI_ADMIN" ||
    user?.role === "REGIONAL_MANAGER";

  const canRegister = user?.role !== "GLOBAL_ADMIN";

  // Carrega lojas para global/regional
  useEffect(() => {
    if (isGlobalOrRegional) {
      fetch("/api/stores")
        .then((r) => r.json())
        .then((data) => setStores(data.stores ?? []))
        .catch(() => {});
    }
  }, [isGlobalOrRegional]);

  // Filtro de busca
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return remarcacoes;
    const q = searchQuery.toLowerCase();
    return remarcacoes.filter(
      (r) =>
        r.operatorName.toLowerCase().includes(q) ||
        r.managerName?.toLowerCase().includes(q) ||
        (r.itens && r.itens.some(i => i.barcode.toLowerCase().includes(q) || (i.internalCode && i.internalCode.toLowerCase().includes(q))))
    );
  }, [remarcacoes, searchQuery]);

  function showSuccess(msg: string) {
    setSuccessMessage(msg);
    window.setTimeout(() => setSuccessMessage(null), 2800);
  }

  function handleCreated(remarcacao: Remarcacao) {
    showSuccess(`Remarcação de ${remarcacao.operatorName} registrada com sucesso.`);
  }

  // Ao escanear na tela principal, busca por código e mostra o modal de histórico
  async function handleSearchBarcode(barcode: string) {
    setScannerOpen(false);
    setHistoryModalBarcode(barcode); // Em vez de preencher o search text, abre o histórico focado
  }

  if (isLoading) {
    return (
      <PageContainer>
        <DashboardSkeleton />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Módulo Operacional"
        title="Remarcações"
        description="Registre e acompanhe as remarcações de preço de produtos com rastreabilidade completa."
      />

      {/* Erro */}
      {error && (
        <div className="mb-5 flex flex-col gap-3 rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-3 py-2 text-rose-700 shadow-sm transition hover:bg-rose-100 focus-visible:outline-none"
          >
            <RefreshCw className="size-4" />
            Atualizar
          </button>
        </div>
      )}

      {/* Toast de sucesso */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-5 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
          >
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Bar + botão câmera */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 flex items-center gap-3"
      >
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por operador, código..."
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white pl-11 pr-4 text-sm font-medium text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex size-6 items-center justify-center rounded-full text-zinc-400 hover:text-zinc-700"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Botão câmera para buscar por código */}
        <motion.button
          type="button"
          aria-label="Escanear código de barras"
          onClick={() => setScannerOpen(true)}
          whileHover={{ y: -1, scale: 1.04 }}
          whileTap={{ scale: 0.93 }}
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-950/10"
        >
          <Camera className="size-5" />
        </motion.button>
      </motion.div>

      {/* Lista de cards */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500">Registros</p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-950">
              {searchQuery ? "Resultados da busca" : "Remarcações"}
            </h2>
          </div>
          <span className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-500">
            {filtered.length}
          </span>
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((remarcacao, index) => (
                <RemarcacaoCard
                  key={remarcacao.id}
                  remarcacao={remarcacao}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-zinc-300 bg-white px-5 py-16 text-center"
          >
            <Tag className="mb-3 size-10 text-zinc-300" />
            <p className="text-sm font-semibold text-zinc-500">
              {searchQuery
                ? "Nenhuma remarcação encontrada para este código."
                : "Nenhuma remarcação registrada ainda."}
            </p>
            {!searchQuery && canRegister && (
              <p className="mt-1 text-xs text-zinc-400">
                Clique no botão amarelo para registrar a primeira.
              </p>
            )}
          </motion.div>
        )}
      </section>

      {/* FAB amarelo — nova remarcação */}
      {canRegister && (
        <FloatingActionButton
          onClick={() => setFlowOpen(true)}
          icon={<Plus className="size-7" strokeWidth={2.4} />}
          color="amber"
        />
      )}

      {/* Scanner de busca (tela principal) */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onBarcodeDetected={handleSearchBarcode}
        onPhotoCaptured={() => setScannerOpen(false)}
      />

      {/* Modal de Histórico de Código de Barras (pesquisa avançada) */}
      <BarcodeHistoryModal
        barcode={historyModalBarcode}
        remarcacoes={remarcacoes}
        onClose={() => setHistoryModalBarcode(null)}
      />

      {/* Fluxo de nova remarcação */}
      <NewRemarcacaoFlow
        open={flowOpen}
        onClose={() => setFlowOpen(false)}
        onCreated={handleCreated}
        onBatchCreated={(r) => {
          setFlowOpen(false);
          router.push(`/remarcacao/${r.id}`);
        }}
        stores={stores}
      />
    </PageContainer>
  );
}
