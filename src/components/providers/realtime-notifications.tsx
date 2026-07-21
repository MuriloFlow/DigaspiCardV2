"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { Bell, CreditCard, CheckCircle2, X } from "lucide-react";

type Notification = {
  id: string;
  message: string;
  operatorName: string;
  storeId: string | null;
};

export function RealtimeNotificationsProvider() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;

    // Pedir permissão para Push Notifications
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Escutar novos registros na tabela "records"
    const channel = supabase
      .channel("public:records")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "records" },
        (payload) => {
          const newRecord = payload.new as { id: string; operator_name: string; store_id: string | null };

          // Se for Admin Global, recebe de todas as lojas.
          // Se for de uma loja, recebe apenas se for da mesma loja.
          if (user.role === "GLOBAL_ADMIN" || (user as any).store_id === newRecord.store_id) {
            const notif: Notification = {
              id: newRecord.id,
              message: "Novo cartão aprovado!",
              operatorName: newRecord.operator_name,
              storeId: newRecord.store_id,
            };

            setNotifications((prev) => [notif, ...prev]);

            // Auto-remover após 5 segundos
            setTimeout(() => {
              setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
            }, 5000);
          }
        }
      )
      .subscribe();

    // Escutar novas mensagens do Chat de TI
    const chatChannel = supabase
      .channel("public:ticket_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages" },
        (payload) => {
          const newMsg = payload.new as any;
          // Se eu enviei, ignora
          if (newMsg.sender_name === user.username) return;

          const isTI = user.role === "GLOBAL_ADMIN" || user.role === "MANAGER";
          
          // TI não recebe alerta de outro TI. Usuário não recebe de outro Usuário.
          if (isTI && newMsg.sender_type === "TI") return;
          if (!isTI && newMsg.sender_type === "USER") return;

          // Disparar Notificação Push Nativa (estilo WhatsApp Web)
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`Suporte TI - ${newMsg.sender_name}`, {
              body: newMsg.content || "Enviou um anexo",
              icon: "/icon-192.png",
            });
          }

          // Notificação in-app
          const notif: Notification = {
            id: newMsg.id,
            message: `Chat TI: ${newMsg.content || "Novo anexo recebido"}`,
            operatorName: newMsg.sender_name,
            storeId: null,
          };

          setNotifications((prev) => [notif, ...prev]);
          setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
          }, 5000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(chatChannel);
    };
  }, [user]);

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-4 z-[100] flex flex-col items-center gap-2 p-4 pt-[env(safe-area-inset-top,1rem)]">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9, filter: "blur(4px)" }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-4 overflow-hidden rounded-[1.25rem] bg-zinc-950/95 p-3 pr-4 text-white shadow-[0_12px_40px_rgba(0,0,0,0.3)] backdrop-blur-md"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold tracking-wide text-emerald-400 uppercase">Cartão Aprovado</p>
              <p className="truncate text-sm font-medium text-white/90">
                <strong className="text-white">{n.operatorName}</strong> acabou de registrar!
              </p>
            </div>
            <button
              onClick={() => setNotifications((prev) => prev.filter((x) => x.id !== n.id))}
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/50 transition hover:bg-white/20 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
