"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Settings, CheckCircle, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const STORAGE_KEY = "notification_permission_granted";

type PermissionState = "unknown" | "prompt" | "granted" | "denied";

export function NotificationGate() {
  const [permState, setPermState] = useState<PermissionState>("unknown");
  const [requesting, setRequesting] = useState(false);
  const [showDeniedTip, setShowDeniedTip] = useState(false);
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);

  useEffect(() => {
    // Sem suporte a notifications no browser → não mostra nada
    if (!("Notification" in window)) return;

    const alreadyGranted = localStorage.getItem(STORAGE_KEY) === "true";

    if (alreadyGranted || Notification.permission === "granted") {
      localStorage.setItem(STORAGE_KEY, "true");
      setPermState("granted");
      return;
    }

    if (Notification.permission === "denied") {
      setPermState("denied");
      return;
    }

    // "default" → ainda não pediu
    setPermState("prompt");
  }, []);

  const requestPermission = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        localStorage.setItem(STORAGE_KEY, "true");
        setPermState("granted");
        setShowSuccessFlash(true);

        // Dispara uma notificação de boas-vindas
        new Notification("Notificações ativadas ✓", {
          body: "Você será avisado de novos chamados e atualizações em tempo real.",
          icon: "/icons/icon-192x192.png",
        });

        setTimeout(() => setShowSuccessFlash(false), 3000);
      } else {
        setPermState("denied");
      }
    } catch {
      setPermState("denied");
    } finally {
      setRequesting(false);
    }
  };

  // Já concedido → nada a exibir
  if (permState === "granted" || permState === "unknown") {
    return (
      <AnimatePresence>
        {showSuccessFlash && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 rounded-full bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-xl"
          >
            <CheckCircle className="size-4" />
            Notificações ativadas!
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Negado → botão flutuante pequeno
  if (permState === "denied") {
    return (
      <>
        <AnimatePresence>
          {showDeniedTip && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed bottom-32 right-4 z-[200] w-72 rounded-2xl border border-zinc-200 p-4 shadow-2xl"
              style={{
                background: "var(--chat-input-bg, rgba(255,255,255,0.98))",
                backdropFilter: "blur(16px)",
              }}
            >
              <button
                onClick={() => setShowDeniedTip(false)}
                className="absolute right-3 top-3 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 transition"
              >
                <X className="size-3.5" />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <BellOff className="size-4 text-rose-500 shrink-0" />
                <p className="text-sm font-bold" style={{ color: "var(--chat-text, #18181b)" }}>
                  Notificações bloqueadas
                </p>
              </div>
              <p className="text-xs mb-3" style={{ color: "var(--chat-muted, #71717a)" }}>
                Para ativar, clique no ícone de cadeado na barra de endereço do navegador e altere as permissões de notificação para <strong>Permitir</strong>.
              </p>
              <a
                href="chrome://settings/content/notifications"
                onClick={(e) => {
                  e.preventDefault();
                  // Instrução para o usuário ir manualmente
                  window.open("about:blank", "_blank");
                }}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-zinc-950 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 transition"
              >
                <Settings className="size-3.5" />
                Como ativar nas configurações
                <ArrowRight className="size-3.5" />
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setShowDeniedTip((v) => !v)}
          className="fixed bottom-[5.5rem] right-4 z-[199] flex items-center gap-2 rounded-full border border-zinc-200 bg-white/95 px-3 py-2 text-xs font-bold text-zinc-700 shadow-lg backdrop-blur-xl transition hover:bg-zinc-50 hover:shadow-xl"
          title="Ativar notificações"
        >
          <BellOff className="size-3.5 text-rose-500" />
          Ativar permissão
        </button>
      </>
    );
  }

  // "prompt" → modal bloqueante em tela cheia
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
      >
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl"
          style={{ background: "var(--chat-input-bg, #ffffff)" }}
        >
          {/* Top accent */}
          <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 to-orange-400" />

          <div className="p-7">
            {/* Icon */}
            <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mx-auto">
              <Bell className="size-8" />
            </div>

            {/* Copy */}
            <h2
              className="text-center text-xl font-extrabold mb-2"
              style={{ color: "var(--chat-text, #18181b)" }}
            >
              Ative as Notificações
            </h2>
            <p
              className="text-center text-sm leading-relaxed mb-6"
              style={{ color: "var(--chat-muted, #71717a)" }}
            >
              Receba alertas instantâneos de novos chamados de suporte e mensagens da equipe de TI, mesmo com o painel em segundo plano.
            </p>

            {/* Benefits */}
            <ul className="mb-6 space-y-2">
              {[
                "Novo chamado de suporte",
                "Resposta em tempo real do TI",
                "Atualização de status do chamado",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--chat-text, #18181b)" }}>
                  <span className="size-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle className="size-3.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={requestPermission}
              disabled={requesting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 py-4 text-sm font-bold text-white shadow-lg shadow-rose-500/25 transition active:scale-95 hover:bg-rose-600 disabled:opacity-70"
            >
              {requesting ? (
                <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <Bell className="size-4" />
              )}
              {requesting ? "Aguardando permissão..." : "Ativar Notificações"}
            </button>

            <p className="mt-3 text-center text-[11px]" style={{ color: "var(--chat-muted, #71717a)" }}>
              Você pode desativar a qualquer momento nas configurações do navegador.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
