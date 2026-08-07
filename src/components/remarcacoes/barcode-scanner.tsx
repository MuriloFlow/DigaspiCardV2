"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Camera, Scan, CheckCircle2, AlertCircle, Keyboard } from "lucide-react";

export type BarcodeScannerHandle = {
  capturePhoto: () => Promise<Blob | null>;
};

type BarcodeScannerProps = {
  open: boolean;
  onClose: () => void;
  onBarcodeDetected: (barcode: string) => void;
  onPhotoCaptured: (blob: Blob, dataUrl: string) => void;
};

export const BarcodeScanner = forwardRef<BarcodeScannerHandle, BarcodeScannerProps>(
  function BarcodeScanner({ open, onClose, onBarcodeDetected, onPhotoCaptured }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number>(0);
    const detectorRef = useRef<any>(null);

    const [detectedCode, setDetectedCode] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [manualMode, setManualMode] = useState(false);
    const [manualInput, setManualInput] = useState("");
    const [showCapture, setShowCapture] = useState(false);

    // ── Detectar suporte ao BarcodeDetector ──────────────────
    const hasBarcodeDetector =
      typeof window !== "undefined" && "BarcodeDetector" in window;

    // ── Expor método capturePhoto via ref ─────────────────────
    useImperativeHandle(ref, () => ({
      capturePhoto: async () => {
        if (!videoRef.current || !canvasRef.current) return null;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(video, 0, 0);
        return new Promise<Blob | null>((resolve) =>
          canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92),
        );
      },
    }));

    // ── Iniciar câmera ────────────────────────────────────────
    const startCamera = useCallback(async () => {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsReady(true);
        }
      } catch (err: any) {
        if (err.name === "NotAllowedError") {
          setCameraError("Permissão de câmera negada. Ative nas configurações do browser.");
        } else if (err.name === "NotFoundError") {
          setCameraError("Nenhuma câmera encontrada neste dispositivo.");
        } else {
          setCameraError("Erro ao acessar câmera. Use o modo manual.");
        }
        setManualMode(true);
      }
    }, []);

    // ── Parar câmera ──────────────────────────────────────────
    const stopCamera = useCallback(() => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setIsReady(false);
      setDetectedCode(null);
      setIsSuccess(false);
      setShowCapture(false);
      setManualMode(false);
      setManualInput("");
      setCameraError(null);
    }, []);

    // ── Abrir/fechar ──────────────────────────────────────────
    useEffect(() => {
      if (open) {
        startCamera();
      } else {
        stopCamera();
      }
      return () => stopCamera();
    }, [open, startCamera, stopCamera]);

    // ── Loop de detecção com BarcodeDetector ─────────────────
    useEffect(() => {
      if (!isReady || !hasBarcodeDetector || detectedCode || manualMode) return;

      let cancelled = false;

      async function detect() {
        if (cancelled) return;
        if (!videoRef.current || videoRef.current.readyState < 2) {
          rafRef.current = requestAnimationFrame(detect);
          return;
        }

        try {
          if (!detectorRef.current) {
            detectorRef.current = new (window as any).BarcodeDetector({
              formats: [
                "ean_13",
                "ean_8",
                "code_128",
                "code_39",
                "qr_code",
                "upc_a",
                "upc_e",
                "data_matrix",
              ],
            });
          }

          const codes = await detectorRef.current.detect(videoRef.current);
          if (codes.length > 0 && !cancelled) {
            const code = codes[0].rawValue as string;
            handleCodeDetected(code);
            return;
          }
        } catch {
          // BarcodeDetector failed silently, continue trying
        }

        if (!cancelled) {
          rafRef.current = requestAnimationFrame(detect);
        }
      }

      rafRef.current = requestAnimationFrame(detect);
      return () => {
        cancelled = true;
        cancelAnimationFrame(rafRef.current);
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReady, detectedCode, manualMode]);

    // ── Código detectado ──────────────────────────────────────
    function handleCodeDetected(code: string) {
      cancelAnimationFrame(rafRef.current);
      setDetectedCode(code);
      setIsSuccess(true);
      setShowCapture(true);

      // Som de bip
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 1200;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } catch {}

      // Vibração
      try { navigator.vibrate?.(80); } catch {}

      onBarcodeDetected(code);
    }

    // ── Capturar foto ─────────────────────────────────────────
    async function handleCapturePhoto() {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onPhotoCaptured(blob, dataUrl);
          }
        },
        "image/jpeg",
        0.92,
      );
    }

    // ── Modo manual ───────────────────────────────────────────
    function handleManualSubmit() {
      const trimmed = manualInput.trim();
      if (!trimmed) return;
      handleCodeDetected(trimmed);
    }

    // ── Reset para tentar novamente ───────────────────────────
    function handleReset() {
      setDetectedCode(null);
      setIsSuccess(false);
      setShowCapture(false);
      setManualInput("");
      if (!manualMode && isReady) {
        rafRef.current = requestAnimationFrame(() => {});
      }
    }

    if (!open) return null;

    return (
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop full-screen escuro */}
            <motion.div
              key="scanner-backdrop"
              className="fixed inset-0 z-[80] bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Container */}
            <motion.div
              key="scanner-container"
              className="fixed inset-0 z-[85] flex flex-col"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
            >
              {/* Vídeo (câmera) */}
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover"
                playsInline
                muted
                autoPlay
              />

              {/* Canvas oculto para captura */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Overlay escuro nas bordas */}
              {!manualMode && (
                <div className="absolute inset-0 z-10 pointer-events-none">
                  {/* Topo */}
                  <div className="absolute top-0 left-0 right-0 h-[22%] bg-black/60" />
                  {/* Baixo */}
                  <div className="absolute bottom-0 left-0 right-0 h-[22%] bg-black/60" />
                  {/* Esquerda */}
                  <div className="absolute top-[22%] left-0 w-[8%] bottom-[22%] bg-black/60" />
                  {/* Direita */}
                  <div className="absolute top-[22%] right-0 w-[8%] bottom-[22%] bg-black/60" />
                </div>
              )}

              {/* Header */}
              <div className="relative z-20 flex items-center justify-between p-5 pt-safe">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                    {manualMode ? "Modo Manual" : "Scanner"}
                  </p>
                  <h2 className="text-lg font-bold text-white">
                    {detectedCode ? "Código Detectado" : "Aponte para a etiqueta"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex size-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Área central — quadro de leitura */}
              {!manualMode && (
                <div className="relative z-20 flex flex-1 items-center justify-center">
                  <div className="relative">
                    {/* Moldura quadrada */}
                    <motion.div
                      className="relative h-56 w-72"
                      animate={
                        isSuccess
                          ? { scale: [1, 1.04, 1] }
                          : { scale: 1 }
                      }
                      transition={{ duration: 0.3 }}
                    >
                      {/* Cantos da moldura */}
                      {[
                        "top-0 left-0 border-t-2 border-l-2 rounded-tl-xl",
                        "top-0 right-0 border-t-2 border-r-2 rounded-tr-xl",
                        "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-xl",
                        "bottom-0 right-0 border-b-2 border-r-2 rounded-br-xl",
                      ].map((cls, i) => (
                        <motion.div
                          key={i}
                          className={`absolute h-8 w-8 ${cls}`}
                          animate={{
                            borderColor: isSuccess
                              ? "#fbbf24" // amarelo ao detectar
                              : "#ffffff",
                          }}
                          transition={{ duration: 0.2 }}
                        />
                      ))}

                      {/* Linha de scan animada */}
                      {!isSuccess && isReady && (
                        <motion.div
                          className="absolute left-2 right-2 h-0.5 rounded-full bg-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                          animate={{ top: ["10%", "90%", "10%"] }}
                          transition={{
                            duration: 2.4,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      )}

                      {/* Ícone de sucesso no centro */}
                      <AnimatePresence>
                        {isSuccess && (
                          <motion.div
                            className="absolute inset-0 flex items-center justify-center"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ type: "spring", stiffness: 400, damping: 18 }}
                          >
                            <div className="flex size-16 items-center justify-center rounded-full bg-amber-400 shadow-[0_0_32px_rgba(251,191,36,0.6)]">
                              <CheckCircle2 className="size-9 text-black" />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* Código detectado */}
                    <AnimatePresence>
                      {detectedCode && (
                        <motion.div
                          className="mt-4 flex flex-col items-center gap-2"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                        >
                          <div className="rounded-2xl bg-white/10 px-4 py-2 backdrop-blur-sm">
                            <p className="text-center font-mono text-sm font-bold tracking-wider text-white">
                              {detectedCode}
                            </p>
                          </div>
                          <p className="text-xs text-white/60">
                            Agora tire a foto da etiqueta
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Loading indicator */}
                    {!isReady && !cameraError && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                          <motion.div
                            className="h-8 w-8 rounded-full border-2 border-white/30 border-t-white"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                          <p className="text-sm text-white/70">Iniciando câmera...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Modo Manual */}
              {manualMode && (
                <div className="relative z-20 flex flex-1 flex-col items-center justify-center px-6 gap-4">
                  {cameraError && (
                    <div className="flex items-center gap-2 rounded-2xl bg-rose-500/20 px-4 py-3">
                      <AlertCircle className="size-4 shrink-0 text-rose-400" />
                      <p className="text-sm text-rose-200">{cameraError}</p>
                    </div>
                  )}
                  <div className="w-full rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                    <label className="mb-2 block text-sm font-semibold text-white">
                      Digite o código de barras
                    </label>
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleManualSubmit(); }}
                      placeholder="Ex: 7891234567890"
                      className="w-full rounded-xl bg-white/10 px-4 py-3 font-mono text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-amber-400"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleManualSubmit}
                      disabled={!manualInput.trim()}
                      className="mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-amber-400 text-sm font-bold text-black transition disabled:opacity-40"
                    >
                      Confirmar Código
                    </button>
                  </div>
                </div>
              )}

              {/* Footer — botões de ação */}
              <div className="relative z-20 flex flex-col gap-3 px-6 pb-10">
                {/* Botão câmera (capturar foto) — aparece após detectar código */}
                <AnimatePresence>
                  {showCapture && (
                    <motion.button
                      key="capture-btn"
                      type="button"
                      onClick={handleCapturePhoto}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 20, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 400, damping: 22 }}
                      className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-amber-400 text-sm font-bold text-black shadow-[0_8px_32px_rgba(251,191,36,0.4)] transition hover:bg-amber-300 active:scale-[0.98]"
                    >
                      <Camera className="size-5" />
                      Fotografar Etiqueta
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* Botão modo manual / resetar */}
                <div className="flex gap-3">
                  {!manualMode && !detectedCode && (
                    <button
                      type="button"
                      onClick={() => setManualMode(true)}
                      className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-white/10 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
                    >
                      <Keyboard className="size-4" />
                      Digitar manualmente
                    </button>
                  )}
                  {detectedCode && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-white/10 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
                    >
                      <Scan className="size-4" />
                      Escanear novamente
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  },
);
