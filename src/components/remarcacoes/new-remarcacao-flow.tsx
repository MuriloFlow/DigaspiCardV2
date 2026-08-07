"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronLeft, Loader2, Tag, X, Plus, Edit3 } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { StoreSelector } from "@/components/records/store-selector";
import { useAuth } from "@/components/providers/auth-provider";
import { useRemarcacoes } from "@/components/providers/remarcacoes-provider";
import { BarcodeScanner, type BarcodeScannerHandle } from "./barcode-scanner";
import { RemarcacaoValuesModal } from "./remarcacao-values-modal";
import { SignaturePad } from "./signature-pad";
import type { Remarcacao } from "@/lib/remarcacoes/types";

type Step =
  | "select-collab"   // 1. Seleção de funcionário
  | "scanning"        // 2. Scanner (câmera/barcode)
  | "values"          // 3. Modal de valores
  | "add-more"        // 4. Pergunta se quer adicionar mais itens ao lote
  | "signature";      // 5. Assinatura do gerente

type Collaborator = { value: string; label: string; icon?: React.ReactNode };

type NewRemarcacaoFlowProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (remarcacao: Remarcacao) => void;
  stores?: { id: string; name: string }[];
  initialBatchId?: string; // Se já tiver um lote aberto, passa o ID aqui
  initialStep?: Step;
  onBatchCreated?: (remarcacao: Remarcacao) => void;
};

export function NewRemarcacaoFlow({
  open,
  onClose,
  onCreated,
  stores = [],
  initialBatchId,
  initialStep,
  onBatchCreated,
}: NewRemarcacaoFlowProps) {
  const { user, selectedStoreId } = useAuth();
  const { createRemarcacao, addItem, removeItem, finalizeRemarcacao, updateRemarcacaoStatus, remarcacoes } = useRemarcacoes();

  const isGlobalOrRegional = user?.role === "GLOBAL_ADMIN" || user?.role === "TI_ADMIN" || user?.role === "REGIONAL_MANAGER";
  const userStoreId = (user as any)?.storeId ?? null;
  const effectiveStoreId = isGlobalOrRegional ? selectedStoreId : userStoreId;

  const [step, setStep] = useState<Step>("select-collab");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoadingCollabs, setIsLoadingCollabs] = useState(false);
  const [localStoreId, setLocalStoreId] = useState<string | null>(null);

  const [selectedCollabId, setSelectedCollabId] = useState("");
  const [selectedCollabName, setSelectedCollabName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dados da remarcação em progresso
  const [currentRemarcacaoId, setCurrentRemarcacaoId] = useState<string | null>(null);
  
  // Dados do item atual sendo lido
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [replaceItemId, setReplaceItemId] = useState<string | null>(null);

  // Gerente para assinatura
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [isLoadingManagers, setIsLoadingManagers] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isManagerConfirmed, setIsManagerConfirmed] = useState(false);

  const scannerRef = useRef<BarcodeScannerHandle>(null);

  const resolvedStoreId = effectiveStoreId || localStoreId;

  // ── Inicialização do Lote ───────────────────────────
  useEffect(() => {
    if (!open) return;

    if (initialStep === "signature" && initialBatchId) {
      setCurrentRemarcacaoId(initialBatchId);
      setStep("signature");
    } else if (initialBatchId) {
      setCurrentRemarcacaoId(initialBatchId);
      setStep("scanning"); // Já tem lote, vai direto ler item
    } else {
      setStep("select-collab");
      setCurrentRemarcacaoId(null);
    }
    
    // Limpa item atual
    setDetectedBarcode(null);
    setCapturedPhotoUrl(null);
    setManagers([]);
    setSelectedManagerId("");
    setIsManagerConfirmed(false);
    setErrorMsg(null);
    setIsFinalizing(false);
  }, [open, initialBatchId]);

  // ── Carregar colaboradores ────────────────────────────────
  useEffect(() => {
    if (!open || !resolvedStoreId || initialBatchId) return; // se tiver initialBatchId, já pulamos essa etapa
    setIsLoadingCollabs(true);
    Promise.all([
      fetch(`/api/collaborators?storeId=${resolvedStoreId}`).then((r) => r.json()),
      fetch(`/api/managers?storeId=${resolvedStoreId}`).then((r) => r.json()).catch(() => ({ managers: [] })),
    ])
      .then(([collabData, managerData]) => {
        type RoleConfig = { label: string; cls: string; order: number };
        const roleConfig: Record<string, RoleConfig> = {
          "Funcionario Operacional": { label: "Operador", cls: "bg-purple-100 text-purple-700", order: 0 },
          Caixa: { label: "Caixa", cls: "bg-blue-100 text-blue-700", order: 1 },
          "Lider de Caixa": { label: "Líder de Caixa", cls: "bg-rose-100 text-rose-700", order: 2 },
          VM: { label: "VM", cls: "bg-pink-100 text-pink-700", order: 3 },
          Vendedor: { label: "Vendedor", cls: "bg-emerald-100 text-emerald-700", order: 4 },
        };

        const result: Collaborator[] = [];
        const active = ((collabData.collaborators ?? []) as { id: string; name: string; subRole?: string; isActive: boolean }[]).filter((c) => c.isActive);
        active.sort((a, b) => {
          const oA = roleConfig[a.subRole ?? ""]?.order ?? 99;
          const oB = roleConfig[b.subRole ?? ""]?.order ?? 99;
          return oA !== oB ? oA - oB : a.name.localeCompare(b.name, "pt-BR");
        });
        for (const c of active) {
          const cfg = roleConfig[c.subRole ?? ""];
          result.push({
            value: c.id,
            label: c.name,
            icon: cfg ? <span className={`inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.cls}`}>{cfg.label}</span> : undefined,
          });
        }
        const mgrs = (managerData.managers ?? []) as { id: string; name: string; role: string }[];
        mgrs.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        for (const m of mgrs) {
          result.push({
            value: m.id,
            label: m.name,
            icon: <span className="inline-flex shrink-0 rounded-md bg-yellow-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-yellow-700">Gerente</span>,
          });
        }
        setCollaborators(result);
      })
      .finally(() => setIsLoadingCollabs(false));
  }, [open, resolvedStoreId, initialBatchId]);

  // ── Carregar gerentes para assinatura ─────────────────────
  useEffect(() => {
    if (step !== "signature" || !resolvedStoreId) return;
    setIsLoadingManagers(true);
    fetch(`/api/managers?storeId=${resolvedStoreId}`)
      .then((r) => r.json())
      .then((data) => {
        setManagers(data.managers ?? []);
        if (data.managers?.length > 0) setSelectedManagerId(data.managers[0].id);
      })
      .catch(() => {})
      .finally(() => setIsLoadingManagers(false));
  }, [step, resolvedStoreId]);

  // ESC para fechar
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // ── Step 1: Confirmar funcionário → criar rascunho de Lote ────────
  async function handleStep1() {
    if (!selectedCollabId) { setErrorMsg("Selecione um funcionário."); return; }
    if (!resolvedStoreId) { setErrorMsg("Selecione uma unidade primeiro."); return; }

    const collab = collaborators.find((c) => c.value === selectedCollabId);
    setSelectedCollabName(collab?.label ?? "");
    setErrorMsg(null);

    try {
      const remarcacao = await createRemarcacao({
        collaboratorId: selectedCollabId,
        operatorName: collab?.label ?? "",
        storeId: resolvedStoreId,
      });
      if (onBatchCreated) {
        onBatchCreated(remarcacao);
        onClose();
      } else {
        setCurrentRemarcacaoId(remarcacao.id);
        setStep("scanning");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao criar lote de remarcação.");
    }
  }

  // ── Step 2: Código detectado ──────────────────
  function handleBarcodeDetected(barcode: string) {
    if (currentRemarcacaoId) {
      const batch = remarcacoes.find(r => r.id === currentRemarcacaoId);
      const existing = batch?.itens?.find(i => i.barcode === barcode);
      if (existing) {
        if (!confirm(`O código ${barcode} já foi remarcado neste lote. Deseja substituir a antiga etiqueta por este novo registro?`)) {
          // Cancela e volta para scan normal sem capturar foto
          setDetectedBarcode(null);
          // O scanner interno também precisa reiniciar, mas como mudamos state ele pode tentar de novo ou precisamos dar um trigger.
          // Fechar e reabrir rapidamente a tela do scanner dá o efeito desejado:
          setStep("select-collab"); 
          setTimeout(() => setStep("scanning"), 10);
          return;
        }
        setReplaceItemId(existing.id);
      } else {
        setReplaceItemId(null);
      }
    }
    setDetectedBarcode(barcode);
  }

  // ── Step 2b: Foto capturada ────────────────────
  function handlePhotoCaptured(blob: Blob, dataUrl: string) {
    setCapturedPhotoUrl(dataUrl); 
    setStep("values");
  }

  // ── Step 3: Valores confirmados → Adiciona Item ao Lote ──
  async function handleValuesConfirm(values: {
    originalValueCents: number;
    remarkedValueCents: number;
    notes: string;
  }) {
    if (!currentRemarcacaoId || !detectedBarcode || !capturedPhotoUrl) return;
    
    // O salvamento é rápido o suficiente, não precisamos mais de isSavingPhoto pra bloquear a tela anterior,
    // o bloqueio (isSubmitting) já acontece dentro do próprio RemarcacaoValuesModal.
    try {
      if (replaceItemId) {
        await removeItem(currentRemarcacaoId, replaceItemId);
        setReplaceItemId(null);
      }

      await addItem({
        remarcacaoId: currentRemarcacaoId,
        barcode: detectedBarcode,
        labelPhotoB64: capturedPhotoUrl,
        ...values,
      });
      // Sucesso! Vai para tela de Adicionar Mais
      setStep("add-more");
      
      // Limpa para a próxima leitura
      setDetectedBarcode(null);
      setCapturedPhotoUrl(null);
    } catch (err) {
      alert("Erro ao salvar etiqueta. Tente novamente.");
      throw err;
    }
  }

  // ── Step 4: Assinatura do gerente → finalizar ─────────────
  async function handleSignatureConfirm(signatureB64: string) {
    if (!currentRemarcacaoId) return;
    const manager = managers.find((m) => m.id === selectedManagerId);
    if (!manager) return;

    setIsFinalizing(true);
    try {
      const finalized = await finalizeRemarcacao(currentRemarcacaoId, {
        managerId: manager.id,
        managerName: manager.name,
        managerSignatureB64: signatureB64,
      });

      onCreated(finalized);
      onClose();

      try { navigator.vibrate?.([80, 40, 80]); } catch {}
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao finalizar.");
    } finally {
      setIsFinalizing(false);
    }
  }

  function goBack() {
    setErrorMsg(null);
    if (step === "scanning") {
      if (initialBatchId) onClose(); // Se entrou direto num lote e volta do scan, ele fecha
      else setStep("select-collab");
    }
    if (step === "values") setStep("scanning");
    if (step === "add-more") setStep("scanning"); // Voltar daqui = ler outra
    if (step === "signature") {
      if (initialStep === "signature") onClose();
      else setStep("add-more");
    }
  }

  if (!open) return null;

  // ── Scanner (tela cheia) ──────────────────────────────────
  if (step === "scanning") {
    return (
      <BarcodeScanner
        ref={scannerRef}
        open={true}
        onClose={goBack}
        onBarcodeDetected={handleBarcodeDetected}
        onPhotoCaptured={handlePhotoCaptured}
      />
    );
  }

  // ── Modal de valores ──────────────────────────────────────
  if (step === "values") {
    return (
      <RemarcacaoValuesModal
        open={true}
        detectedBarcode={detectedBarcode}
        labelPhotoDataUrl={capturedPhotoUrl}
        onClose={goBack}
        onConfirm={handleValuesConfirm}
        onRetakePhoto={() => {
          setCapturedPhotoUrl(null);
          setStep("scanning");
        }}
      />
    );
  }

  // ── Opção Adicionar Mais ou Finalizar Lote ────────────────
  if (step === "add-more") {
    return (
      <AnimatePresence>
        <motion.div
          key="add-backdrop"
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="size-8" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-zinc-900">Etiqueta Salva!</h3>
            <p className="mb-8 text-sm text-zinc-500">
              O que você deseja fazer agora? Pode escanear mais etiquetas para adicionar a este lote ou finalizá-lo para solicitar assinatura.
            </p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setStep("scanning")}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 font-bold text-black shadow-md transition hover:bg-amber-500 active:scale-[0.98]"
              >
                <Plus className="size-5" /> Escanear mais Etiquetas
              </button>
              
              <button
                type="button"
                onClick={() => setStep("signature")}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 font-bold text-white shadow-md transition hover:bg-zinc-800 active:scale-[0.98]"
              >
                <Edit3 className="size-5" /> Finalizar Lote e Assinar
              </button>

              <button
                type="button"
                onClick={onClose}
                className="mt-2 text-sm font-semibold text-zinc-400 hover:text-zinc-700"
              >
                Fechar e continuar depois
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── Assinatura ────────────────────────────────────────────
  if (step === "signature") {
    const manager = managers.find((m) => m.id === selectedManagerId);
    return (
      <>
        {/* Seletor de gerente (antes de assinar) */}
        {!isManagerConfirmed && managers.length >= 1 && (
          <AnimatePresence>
            <motion.div
              className="fixed inset-0 z-[88] flex items-end justify-center bg-black/80 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="w-full max-w-md rounded-t-[2rem] bg-white p-6"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Assinatura
                </p>
                <h3 className="mb-4 text-xl font-bold text-zinc-950">
                  Qual gerente vai assinar?
                </h3>
                <CustomSelect
                  options={managers.map((m) => ({ value: m.id, label: m.name }))}
                  value={selectedManagerId}
                  onChange={setSelectedManagerId}
                  placeholder="Selecione o gerente..."
                />
                <button
                  type="button"
                  onClick={() => {
                    try {
                      (screen.orientation as any)?.lock?.("landscape").catch(() => {});
                    } catch {}
                    setIsManagerConfirmed(true);
                  }}
                  disabled={!selectedManagerId}
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 text-sm font-bold text-white disabled:opacity-40"
                >
                  Continuar para Assinatura →
                </button>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        )}

        <SignaturePad
          open={isManagerConfirmed || managers.length === 0}
          onClose={() => {
            setIsManagerConfirmed(false);
            goBack();
          }}
          onConfirm={handleSignatureConfirm}
          managerName={manager?.name}
        />

        {isFinalizing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="size-10 animate-spin text-white" />
              <p className="text-sm font-semibold text-white">Finalizando remarcação...</p>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Step 1: Seleção de funcionário ────────────────────────
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="flow-backdrop"
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key="flow-panel"
            className="fixed bottom-0 left-0 right-0 z-[60] flex w-full flex-col overflow-visible rounded-t-[2rem] bg-white shadow-2xl"
            initial={{ y: "100%", opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
          >
            <div className="mx-auto mt-4 h-1 w-12 rounded-full bg-zinc-200" />

            <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-400 text-black shrink-0">
                <Tag className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Passo 1 de 2
                </p>
                <h3 className="text-base font-bold text-zinc-950 truncate">
                  Iniciar novo lote de remarcação
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-700"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="px-5 py-5 pb-10">
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="grid gap-4"
              >
                {isGlobalOrRegional && !selectedStoreId && stores.length > 0 && (
                  <StoreSelector
                    stores={stores}
                    selectedStoreId={localStoreId}
                    onChange={setLocalStoreId}
                    allowAll={false}
                  />
                )}

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-zinc-800">Funcionário</span>
                  <CustomSelect
                    options={collaborators}
                    value={selectedCollabId}
                    onChange={(v) => { setSelectedCollabId(v); setErrorMsg(null); }}
                    placeholder={
                      isLoadingCollabs
                        ? "Carregando..."
                        : !resolvedStoreId
                        ? "Selecione uma unidade primeiro"
                        : "Selecione o funcionário"
                    }
                    disabled={isLoadingCollabs || !resolvedStoreId}
                  />
                  {errorMsg && <p className="text-sm font-medium text-rose-600">{errorMsg}</p>}
                </label>

                <button
                  type="button"
                  onClick={handleStep1}
                  disabled={!selectedCollabId || !resolvedStoreId}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white shadow-md transition hover:bg-zinc-800 disabled:opacity-50 active:scale-[0.98]"
                >
                  Criar Lote e Escanear →
                </button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
