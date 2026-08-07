"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, RotateCcw, X } from "lucide-react";

type SignaturePadProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (signatureB64: string) => void;
  managerName?: string;
};

export function SignaturePad({ open, onClose, onConfirm, managerName }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // ── Forçar orientação paisagem ────────────────────────────
  useEffect(() => {
    if (!open) return;
    try {
      (screen.orientation as any)?.lock?.("landscape").catch(() => {});
    } catch {}
    return () => {
      try {
        (screen.orientation as any)?.unlock?.();
      } catch {}
    };
  }, [open]);

  // ── Ajustar canvas ao tamanho da tela ─────────────────────
  useEffect(() => {
    if (!open || !canvasRef.current) return;

    function resize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.strokeStyle = "#09090b";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
      setHasSignature(false);
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [open]);

  // ── Helpers de posição ────────────────────────────────────
  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    setHasSignature(true);
    lastPos.current = getPos(e);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || !lastPos.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  }, [isDrawing]);

  const onPointerUp = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  // ── Limpar canvas ─────────────────────────────────────────
  function handleClear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  // ── Confirmar assinatura ──────────────────────────────────
  async function handleConfirm() {
    if (!hasSignature || !canvasRef.current) return;
    setIsConfirming(true);

    try {
      navigator.vibrate?.(60);
      const b64 = canvasRef.current.toDataURL("image/png");
      await new Promise((r) => setTimeout(r, 300)); // micro-delay para animação
      onConfirm(b64);
    } finally {
      setIsConfirming(false);
    }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="signature-pad"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Layout em paisagem (forçado via flex row) */}
          <div className="flex h-full w-full flex-col">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Assinatura do Gerente
                </p>
                <h2 className="text-xl font-bold text-zinc-950">
                  {managerName ? `Assinar como ${managerName}` : "Assine abaixo"}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex size-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-900"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Área de assinatura */}
            <div className="relative mx-6 flex-1 overflow-hidden rounded-[1.5rem] bg-zinc-50 border-2 border-dashed border-zinc-300">
              <canvas
                ref={canvasRef}
                className="touch-none"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
              />

              {/* Placeholder quando vazio */}
              {!hasSignature && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <p className="text-sm font-medium text-zinc-400">
                    Assine aqui com o dedo
                  </p>
                  <div className="h-px w-48 bg-zinc-200" />
                </div>
              )}
            </div>

            {/* Footer com botões */}
            <div className="flex shrink-0 items-center justify-between px-6 py-4">
              {/* Limpar */}
              <button
                type="button"
                onClick={handleClear}
                disabled={!hasSignature}
                className="flex h-12 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-500 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-30"
              >
                <RotateCcw className="size-4" />
                Limpar
              </button>

              <p className="text-xs text-zinc-600">
                Ao assinar, você aprova oficialmente esta remarcação
              </p>

              {/* Confirmar — FAB azul, padrão dos outros FABs */}
              <motion.button
                type="button"
                onClick={handleConfirm}
                disabled={!hasSignature || isConfirming}
                whileHover={hasSignature ? { y: -2, scale: 1.03 } : {}}
                whileTap={hasSignature ? { scale: 0.94 } : {}}
                className="flex size-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_22px_48px_rgba(37,99,235,0.4)] transition hover:bg-blue-500 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
              >
                <AnimatePresence mode="wait">
                  {isConfirming ? (
                    <motion.div
                      key="loading"
                      className="h-6 w-6 rounded-full border-2 border-white/30 border-t-white"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <motion.div
                      key="check"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      <Check className="size-7" strokeWidth={2.8} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
