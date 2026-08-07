"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, CreditCard, FileText, Loader2, Tag, X } from "lucide-react";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/utils/format";

type RemarcacaoValuesModalProps = {
  open: boolean;
  detectedBarcode: string | null;
  labelPhotoDataUrl: string | null;  // dataUrl local (base64) da foto capturada
  onClose: () => void;
  onConfirm: (values: {
    originalValueCents: number;
    remarkedValueCents: number;
    notes: string;
  }) => Promise<void> | void;
  onRetakePhoto?: () => void;
};

export function RemarcacaoValuesModal({
  open,
  detectedBarcode,
  labelPhotoDataUrl,
  onClose,
  onConfirm,
  onRetakePhoto,
}: RemarcacaoValuesModalProps) {
  const [originalAmount, setOriginalAmount] = useState("");
  const [remarkedAmount, setRemarkedAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const originalCents = useMemo(() => parseCurrencyInput(originalAmount), [originalAmount]);
  const remarkedCents = useMemo(() => parseCurrencyInput(remarkedAmount), [remarkedAmount]);

  const difference = originalCents - remarkedCents;
  const pct = originalCents > 0 ? ((difference / originalCents) * 100).toFixed(0) : null;

  async function handleConfirm() {
    if (!originalCents || originalCents <= 0) {
      setError("Informe o valor original da peça.");
      return;
    }
    if (!remarkedCents || remarkedCents <= 0) {
      setError("Informe o novo valor remarcado.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm({
        originalValueCents: originalCents,
        remarkedValueCents: remarkedCents,
        notes,
      });
    } catch (err: any) {
      setError(err.message || "Erro ao salvar.");
      setIsSubmitting(false); // Only stop loading if there is an error, otherwise parent unmounts us
    }
  }

  // Reset on close
  function handleClose() {
    setOriginalAmount("");
    setRemarkedAmount("");
    setNotes("");
    setError(null);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="vals-backdrop"
            className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <motion.div
            key="vals-panel"
            className="fixed bottom-0 left-0 right-0 z-[75] flex w-full flex-col overflow-visible rounded-t-[2rem] bg-white shadow-2xl"
            initial={{ y: "100%", opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
          >
            {/* Handle */}
            <div className="mx-auto mt-4 h-1 w-12 rounded-full bg-zinc-200" />

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-400 text-black shrink-0">
                <Tag className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Informar Valores
                </p>
                <h3 className="text-base font-bold text-zinc-950 truncate">
                  Valores da Remarcação
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-700"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5 pb-10 overflow-y-auto max-h-[80vh]">
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="grid gap-5"
              >
                {/* Preview: foto + código */}
                {(labelPhotoDataUrl || detectedBarcode) && (
                  <div className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                    {labelPhotoDataUrl && (
                      <div className="relative group">
                        <img
                          src={labelPhotoDataUrl}
                          alt="Etiqueta"
                          className="h-14 w-14 shrink-0 rounded-xl object-cover"
                        />
                        {onRetakePhoto && (
                          <button
                            type="button"
                            onClick={onRetakePhoto}
                            className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-zinc-900 text-white shadow-sm transition hover:bg-zinc-800"
                            title="Tirar foto novamente"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                          </button>
                        )}
                      </div>
                    )}
                    {detectedBarcode && (
                      <div>
                        <p className="text-xs font-semibold text-zinc-500">Código</p>
                        <p className="font-mono text-sm font-bold text-zinc-900">{detectedBarcode}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Valor original */}
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-zinc-800">
                    Valor Atual (etiqueta)
                  </span>
                  <span className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 transition duration-200 focus-within:border-zinc-950 focus-within:ring-4 focus-within:ring-zinc-950/10">
                    <CreditCard className="size-5 shrink-0 text-zinc-400" />
                    <input
                      inputMode="numeric"
                      value={originalAmount}
                      onChange={(e) => {
                        setOriginalAmount(formatCurrencyInput(e.target.value));
                        setError(null);
                      }}
                      placeholder="R$ 0,00"
                      className="min-w-0 flex-1 bg-transparent text-base text-zinc-950 outline-none placeholder:text-zinc-400"
                    />
                  </span>
                </label>

                {/* Novo valor remarcado */}
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-zinc-800">
                    Novo Valor (remarcado)
                  </span>
                  <span className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3 transition duration-200 focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-400/10">
                    <Tag className="size-5 shrink-0 text-amber-500" />
                    <input
                      inputMode="numeric"
                      value={remarkedAmount}
                      onChange={(e) => {
                        setRemarkedAmount(formatCurrencyInput(e.target.value));
                        setError(null);
                      }}
                      placeholder="R$ 0,00"
                      className="min-w-0 flex-1 bg-transparent text-base text-zinc-950 outline-none placeholder:text-zinc-400"
                    />
                  </span>
                </label>

                {/* Preview da diferença */}
                <AnimatePresence>
                  {originalCents > 0 && remarkedCents > 0 && (
                    <motion.div
                      key="diff"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className={`rounded-2xl px-4 py-3 ${
                        difference > 0
                          ? "bg-emerald-50 border border-emerald-200"
                          : "bg-amber-50 border border-amber-200"
                      }`}>
                        <p className={`text-sm font-bold ${difference > 0 ? "text-emerald-700" : "text-amber-700"}`}>
                          {difference > 0
                            ? `↓ Redução de ${pct}%`
                            : `↑ Aumento de ${Math.abs(Number(pct))}%`}
                        </p>
                        <p className={`text-xs mt-0.5 ${difference > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                          {difference > 0 ? "Desconto" : "Acréscimo"} de R${" "}
                          {(Math.abs(difference) / 100).toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Observações */}
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-zinc-800">
                    Observações{" "}
                    <span className="font-normal text-zinc-400">(opcional)</span>
                  </span>
                  <span className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 transition duration-200 focus-within:border-zinc-950 focus-within:ring-4 focus-within:ring-zinc-950/10">
                    <FileText className="mt-0.5 size-5 shrink-0 text-zinc-400" />
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex: Produto com avaria, prazo de validade próximo..."
                      rows={3}
                      className="min-w-0 flex-1 resize-none bg-transparent text-sm text-zinc-950 outline-none placeholder:text-zinc-400"
                    />
                  </span>
                </label>

                {error && (
                  <p className="text-sm font-medium text-rose-600">{error}</p>
                )}

                {/* Botão confirmar */}
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isSubmitting || !originalCents || !remarkedCents}
                  className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white shadow-md transition hover:bg-zinc-800 disabled:opacity-50 active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      Salvar Etiqueta
                      <span className="text-zinc-400">→</span>
                    </>
                  )}
                </button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
