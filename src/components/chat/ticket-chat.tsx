"use client";

import { useState, useEffect, useRef } from "react";
import { getTicketMessages, sendTicketMessage } from "@/app/(main)/chamados/actions";
import { supabase } from "@/lib/supabase/client";
import { Send, ImagePlus, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function TicketChat({ ticketId, userRole }: { ticketId: string, userRole: "TI" | "USER" }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = async () => {
    const data = await getTicketMessages(ticketId);
    setMessages(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel(`chat:${ticketId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages" },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.ticket_id !== ticketId) return;
          
          setMessages((prev) => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (images.length + files.length > 2) {
      alert("Até 2 imagens por mensagem.");
      return;
    }

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
          setImages((prev) => prev.length < 2 ? [...prev, dataUrl] : prev);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0) return;

    setSending(true);
    try {
      const newMsg = await sendTicketMessage(ticketId, content, images, userRole);
      setMessages((prev) => [...prev, newMsg]);
      setContent("");
      setImages([]);
    } catch (err) {
      alert("Erro ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="size-6 animate-spin text-zinc-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-400">
            <p className="text-sm">Nenhuma mensagem ainda.</p>
            <p className="text-xs mt-1">Inicie a conversa!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_type === userRole;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className="flex items-baseline gap-2 mb-1 px-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">{msg.sender_name}</span>
                  <span className="text-[9px] text-zinc-400">{format(new Date(msg.created_at), "HH:mm")}</span>
                </div>
                <div className={`relative max-w-[85%] rounded-[1.5rem] px-5 py-3 text-[15px] shadow-sm ${isMe ? "bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-br-sm" : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-bl-sm"}`}>
                  {msg.content && <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                  
                  {msg.images && msg.images.length > 0 && (
                    <div className={`grid gap-2 mt-2 ${msg.content ? "border-t border-white/20 pt-2" : ""} ${msg.images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                      {msg.images.map((img: string, i: number) => (
                        <div key={i} onClick={() => setViewImage(img)} className="cursor-zoom-in aspect-video rounded-xl overflow-hidden bg-black/10 ring-1 ring-black/5 dark:ring-white/10 transition-transform hover:scale-[1.02]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img} alt="Anexo" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-200/50 dark:border-zinc-800/50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        {images.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
            {images.map((img, i) => (
              <div key={i} className="relative size-20 shrink-0 rounded-2xl overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="Preview" className="w-full h-full object-cover" />
                <button onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/50 backdrop-blur-md text-white rounded-full p-1 hover:bg-black/70 transition-colors">
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleSend} className="flex items-end gap-3 max-w-4xl mx-auto">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 flex items-center justify-center size-[46px] rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all shadow-sm"
          >
            <ImagePlus className="size-5" />
          </button>
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageCapture} multiple />
          
          <div className="flex-1 bg-zinc-100 dark:bg-zinc-900 rounded-[1.5rem] flex items-center pr-1.5 overflow-hidden shadow-inner ring-1 ring-inset ring-zinc-200/50 dark:ring-zinc-800/50 transition-all focus-within:ring-rose-500/50 focus-within:bg-white dark:focus-within:bg-zinc-950">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Mensagem..."
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (content.trim() || images.length > 0) handleSend(e);
                }
              }}
              className="w-full bg-transparent px-5 py-3.5 text-[15px] outline-none resize-none max-h-32 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700"
              style={{ minHeight: "50px" }}
            />
            <button
              type="submit"
              disabled={sending || (!content.trim() && images.length === 0)}
              className="shrink-0 flex items-center justify-center size-[38px] rounded-full bg-rose-500 text-white disabled:opacity-40 disabled:scale-95 transition-all shadow-md hover:bg-rose-600 hover:shadow-lg active:scale-95"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4 ml-0.5" />}
            </button>
          </div>
        </form>
      </div>

      {viewImage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95" onClick={() => setViewImage(null)}>
          <button className="absolute right-4 top-4 rounded-full p-2 text-white/50 hover:text-white hover:bg-white/10 transition">
            <X className="size-8" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewImage} alt="Fullscreen Anexo" className="max-w-full max-h-[90vh] object-contain rounded-xl" />
        </div>
      )}
    </div>
  );
}
