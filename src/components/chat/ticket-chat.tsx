"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getTicketMessages, sendTicketMessage } from "@/app/(main)/chamados/actions";
import { supabase } from "@/lib/supabase/client";
import { Loader2, X, Camera, ArrowUp, CheckCheck, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ──────────────────────────────────────────────────────────────────
type Message = {
  id: string;
  ticket_id: string;
  sender_type: "TI" | "USER";
  sender_name: string;
  content: string;
  images?: string[];
  created_at: string;
  _pending?: boolean;
};

type Props = {
  ticketId: string;
  userRole: "TI" | "USER";
  onTicketResolved?: () => void;
};

// ─── Merge sem duplicata ─────────────────────────────────────────────────────
function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  const map = new Map<string, Message>();
  for (const m of existing) map.set(m.id, m);
  for (const m of incoming) {
    // Não sobrescreve pending com real se o ID for diferente (pending usa tempId)
    if (!map.has(m.id)) map.set(m.id, m);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export function TicketChat({ ticketId, userRole, onTicketResolved }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "live" | "offline">("connecting");

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSendingRef = useRef(false); // guard contra múltiplos disparos
  const tempIdRef = useRef<string | null>(null);

  // ── Scroll ────────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((smooth = false) => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: smooth ? "smooth" : "auto",
        });
      }
    });
  }, []);

  // ── Load messages ─────────────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    const data = await getTicketMessages(ticketId);
    setMessages((prev) => {
      // Só mantém pendings que ainda estão em flight (isSendingRef ativo)
      const activePendings = isSendingRef.current ? prev.filter((m) => m._pending) : [];
      const dbMessages = data as Message[];
      // Garante sem duplicata: pending com mesmo conteúdo já salvo no banco é descartado
      const mergedDb = dbMessages.reduce<Message[]>((acc, m) => {
        if (!acc.find((a) => a.id === m.id)) acc.push(m);
        return acc;
      }, []);
      return [...mergedDb, ...activePendings].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
    setLoading(false);
  }, [ticketId]);

  // ── Oculta BottomNav ──────────────────────────────────────────────────────
  useEffect(() => {
    document.body.classList.add("chat-open");
    return () => document.body.classList.remove("chat-open");
  }, []);

  // ── Realtime + Polling ────────────────────────────────────────────────────
  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`chat-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Se já existe por ID real (foi adicionado pelo handleSend), só remove pending orphan e retorna
            const alreadyExists = prev.find((m) => m.id === newMsg.id && !m._pending);
            if (alreadyExists) return prev.filter((m) => !m._pending);
            // Caso contrário, remove todos os pending e adiciona o real
            return [...prev.filter((m) => !m._pending), newMsg];
          });
          setTimeout(() => scrollToBottom(true), 50);
        }
      )
      // Escuta resolução do chamado em tempo real
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_tickets",
          filter: `id=eq.${ticketId}`,
        },
        (payload) => {
          if (payload.new?.status === "resolved") {
            onTicketResolved?.();
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeStatus("live");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setRealtimeStatus("offline");
        else setRealtimeStatus("connecting");
      });

    // Polling fallback 5s
    const poll = setInterval(loadMessages, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [ticketId, loadMessages, scrollToBottom, onTicketResolved]);

  // ── Scroll inicial e em novas mensagens ───────────────────────────────────
  useEffect(() => {
    if (!loading) scrollToBottom();
  }, [loading, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length, scrollToBottom]);

  // ── Captura de imagem ─────────────────────────────────────────────────────
  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    if (images.length + files.length > 2) {
      alert("Até 2 imagens por mensagem.");
      return;
    }
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const MAX = 1200;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            const ratio = Math.min(MAX / width, MAX / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
          setImages((prev) => (prev.length < 2 ? [...prev, dataUrl] : prev));
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Enviar mensagem ───────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    // Guard: previne múltiplos disparos simultâneos
    if (isSendingRef.current) return;
    const trimmed = content.trim();
    if (!trimmed && images.length === 0) return;

    isSendingRef.current = true;
    const currentContent = trimmed;
    const currentImages = [...images];

    // Limpa input imediatamente
    setContent("");
    setImages([]);

    // Mensagem otimista
    const tempId = `pending-${Date.now()}-${Math.random()}`;
    tempIdRef.current = tempId;
    const optimistic: Message = {
      id: tempId,
      ticket_id: ticketId,
      sender_type: userRole,
      sender_name: "Você",
      content: currentContent,
      images: currentImages,
      created_at: new Date().toISOString(),
      _pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom(true);

    try {
      const saved = await sendTicketMessage(ticketId, currentContent, currentImages, userRole);
      // Substitui o pending imediatamente com a mensagem real confirmada pelo servidor
      // Quando o Realtime chegar depois, o ID real já existe e será ignorado
      setMessages((prev) => {
        const withoutThisPending = prev.filter((m) => m.id !== tempId);
        // Garante sem duplicata (Realtime pode ter chegado antes)
        if (withoutThisPending.find((m) => m.id === saved.id)) return withoutThisPending;
        return [...withoutThisPending, { ...saved, _pending: false }];
      });
    } catch {
      // Reverte
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setContent(currentContent);
      setImages(currentImages);
      alert("Erro ao enviar. Tente novamente.");
    } finally {
      isSendingRef.current = false;
      tempIdRef.current = null;
    }
  }, [content, images, ticketId, userRole, scrollToBottom]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full" style={{ background: "var(--chat-bg, #ffffff)" }}>

      {/* Status bar realtime */}
      <div className="flex items-center justify-end px-4 py-1.5 border-b shrink-0"
        style={{ borderColor: "var(--chat-border, rgba(228,228,231,0.6))" }}>
        <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
          realtimeStatus === "live" ? "text-emerald-500" :
          realtimeStatus === "offline" ? "text-rose-400" : "text-zinc-400"
        }`}>
          <span className={`size-1.5 rounded-full ${
            realtimeStatus === "live" ? "bg-emerald-500 animate-pulse" :
            realtimeStatus === "offline" ? "bg-rose-400" : "bg-zinc-300 animate-pulse"
          }`} />
          {realtimeStatus === "live" ? "Ao vivo" : realtimeStatus === "offline" ? "Offline" : "Conectando..."}
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin"
        style={{ scrollbarColor: "var(--chat-scrollbar, rgba(161,161,170,0.4)) transparent" }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="size-6 animate-spin text-zinc-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-8 text-zinc-400">
            <p className="text-sm font-medium">Nenhuma mensagem ainda.</p>
            <p className="text-xs opacity-70">Inicie a conversa!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_type === userRole;
            return (
              <div key={`${msg.id}-${msg._pending ? "p" : "c"}`} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className="flex items-baseline gap-2 mb-1 px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide"
                    style={{ color: "var(--chat-muted, #a1a1aa)" }}>
                    {msg.sender_name}
                  </span>
                  <span className="text-[9px]" style={{ color: "var(--chat-muted, #a1a1aa)" }}>
                    {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                  </span>
                </div>

                <div className={`relative max-w-[82%] rounded-[1.5rem] px-4 py-3 text-[15px] leading-relaxed shadow-sm transition-opacity ${
                  msg._pending ? "opacity-55" : "opacity-100"
                } ${isMe
                  ? "bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-br-sm"
                  : "rounded-bl-sm"
                }`}
                  style={!isMe ? {
                    background: "var(--chat-bubble, #f4f4f5)",
                    color: "var(--chat-text, #18181b)",
                    border: "1px solid var(--chat-border, rgba(228,228,231,0.6))",
                  } : {}}
                >
                  {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}

                  {msg.images && msg.images.length > 0 && (
                    <div className={`grid gap-2 mt-2 ${msg.content ? "border-t border-white/20 pt-2" : ""} ${msg.images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                      {msg.images.map((img, i) => (
                        <div key={i} onClick={() => setViewImage(img)}
                          className="cursor-zoom-in aspect-video rounded-xl overflow-hidden transition-transform hover:scale-[1.02]"
                          style={{ background: "rgba(0,0,0,0.1)" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img} alt="Anexo" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {isMe && (
                    <div className="flex justify-end mt-1">
                      {msg._pending
                        ? <Clock className="size-3 text-white/50" />
                        : <CheckCheck className="size-3 text-white/60" />
                      }
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0 border-t p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
        style={{
          background: "var(--chat-input-bg, rgba(255,255,255,0.95))",
          borderColor: "var(--chat-border, rgba(228,228,231,0.5))",
          backdropFilter: "blur(16px)",
        }}>

        {/* Previews de imagem */}
        {images.length > 0 && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <div key={i} className="relative size-16 shrink-0 rounded-2xl overflow-hidden shadow-sm"
                style={{ border: "1px solid var(--chat-border, rgba(228,228,231,0.6))" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="Preview" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80 transition">
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2">
          {/* Camera button */}
          <label className="flex-none flex size-10 cursor-pointer items-center justify-center rounded-full transition-colors"
            style={{ background: "var(--chat-btn-bg, #f4f4f5)", color: "var(--chat-muted, #a1a1aa)" }}>
            <Camera className="size-5" />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handleImageCapture}
              className="hidden"
              ref={fileInputRef}
            />
          </label>

          {/* Textarea */}
          <div className="flex-1 rounded-[1.5rem] flex items-end overflow-hidden transition-all"
            style={{
              background: "var(--chat-btn-bg, #f4f4f5)",
              border: "1px solid var(--chat-border, rgba(228,228,231,0.6))",
            }}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Mensagem..."
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="w-full bg-transparent px-4 py-3 text-[15px] outline-none resize-none max-h-32 leading-snug"
              style={{
                color: "var(--chat-text, #18181b)",
              }}
            />
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!content.trim() && images.length === 0}
            className="flex-none flex size-10 items-center justify-center rounded-full bg-rose-500 hover:bg-rose-600 active:scale-95 text-white shadow-md transition-all disabled:opacity-40 disabled:scale-100"
          >
            {isSendingRef.current
              ? <Loader2 className="size-4 animate-spin" />
              : <ArrowUp className="size-4" />
            }
          </button>
        </div>
      </div>

      {/* Fullscreen image viewer */}
      {viewImage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95"
          onClick={() => setViewImage(null)}>
          <button className="absolute right-4 top-4 rounded-full p-2 text-white/50 hover:text-white hover:bg-white/10 transition">
            <X className="size-7" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewImage} alt="Fullscreen" className="max-w-full max-h-[90vh] object-contain rounded-xl" />
        </div>
      )}
    </div>
  );
}
