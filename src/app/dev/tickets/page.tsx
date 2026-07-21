"use client";

import { useEffect, useState } from "react";
import { getSupportTickets, resolveSupportTicket } from "../actions";
import { supabase } from "@/lib/supabase/client";
import { Headset, Loader2, CheckCircle2, X, Image as ImageIcon, MessageSquare } from "lucide-react";
import { TicketChat } from "@/components/chat/ticket-chat";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";

export default function DevTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [resolving, setResolving] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "chat">("details");

  const fetchTickets = async () => {
    try {
      const data = await getSupportTickets("open");
      setTickets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    const channel = supabase
      .channel("tickets-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleResolve = async (id: string) => {
    setResolving(true);
    try {
      await resolveSupportTicket(id);
      setSelectedTicket(null);
      await fetchTickets();
    } catch (err) {
      alert("Erro ao resolver chamado.");
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto pb-32">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-white">Chamados TI</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Fila de suporte técnico solicitada por Gerentes e Administradores.
          </p>
        </div>
        <span className="flex shrink-0 whitespace-nowrap items-center gap-2 rounded-full bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-500">
          <Headset className="size-4 shrink-0" />
          {tickets.length} chamados
        </span>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-zinc-400 dark:text-zinc-600" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center">
          <Headset className="mb-4 size-10 text-zinc-300 dark:text-zinc-700" />
          <h3 className="text-lg font-bold text-zinc-950 dark:text-white">Fila vazia</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Nenhum chamado pendente no momento.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => {
                setSelectedTicket(ticket);
                setActiveTab("details");
              }}
              className="group cursor-pointer rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 transition hover:border-rose-300 dark:hover:border-rose-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className="inline-flex rounded-full bg-rose-100 dark:bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 line-clamp-1">
                  {ticket.category}
                </span>
                <span className="shrink-0 text-[10px] font-medium text-zinc-500">
                  {format(new Date(ticket.created_at), "dd/MM HH:mm")}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-white line-clamp-2 mb-2">{ticket.description}</h3>
              
              <div className="mt-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Solicitante</span>
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 line-clamp-1">{ticket.user_info.split(' ')[0]}</span>
                </div>
                {ticket.images && ticket.images.length > 0 && (
                  <div className="flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <ImageIcon className="size-3" />
                    {ticket.images.length}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal do Ticket */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-[60] flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-zinc-50 dark:bg-zinc-950 sm:bg-black/60 sm:dark:bg-black/80 sm:backdrop-blur-sm transition-colors">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedTicket(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full h-full sm:h-[90vh] sm:max-w-2xl overflow-hidden sm:rounded-[2rem] bg-white dark:bg-zinc-950 flex flex-col shadow-2xl border-0 sm:border border-zinc-200 dark:border-zinc-800"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 p-5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-zinc-800 text-rose-500 dark:text-rose-400">
                    <Headset className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white">Detalhes do Chamado</h3>
                    <p className="text-xs text-zinc-500">ID: {selectedTicket.id.split('-')[0]}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition">
                  <X className="size-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-4 px-5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <button
                  onClick={() => setActiveTab("details")}
                  className={`py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "details" ? "border-rose-500 text-rose-500" : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
                >
                  Detalhes do Chamado
                </button>
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === "chat" ? "border-rose-500 text-rose-500" : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
                >
                  <MessageSquare className="size-4" />
                  Chat
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-hidden flex flex-col bg-zinc-50 dark:bg-zinc-950">
                {activeTab === "details" ? (
                  <div className="overflow-y-auto p-5 space-y-6 flex-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-700">
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">Informações</p>
                      <div className="rounded-xl bg-white dark:bg-zinc-900 p-4 border border-zinc-200/50 dark:border-zinc-800/50 text-sm text-zinc-700 dark:text-zinc-300">
                        <p><strong className="text-zinc-950 dark:text-white">Categoria:</strong> {selectedTicket.category}</p>
                        <p className="mt-1"><strong className="text-zinc-950 dark:text-white">Solicitante:</strong> {selectedTicket.user_info}</p>
                        <p className="mt-1"><strong className="text-zinc-950 dark:text-white">Unidade base:</strong> {selectedTicket.store_info}</p>
                        <p className="mt-1"><strong className="text-zinc-950 dark:text-white">Aberto em:</strong> {format(new Date(selectedTicket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-500">Descrição do Problema</p>
                      <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-4 border border-rose-100 dark:border-rose-500/20 text-sm text-rose-900 dark:text-rose-200 whitespace-pre-wrap">
                        {selectedTicket.description}
                      </div>
                    </div>

                    {selectedTicket.images && selectedTicket.images.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Imagens Anexadas</p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {selectedTicket.images.map((img: string, idx: number) => (
                            <div key={idx} onClick={() => setViewImage(img)} className="aspect-square cursor-zoom-in overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 transition">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img} alt={`Anexo ${idx+1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <TicketChat ticketId={selectedTicket.id} userRole="TI" />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-zinc-100 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-950 shrink-0">
                <button
                  onClick={() => handleResolve(selectedTicket.id)}
                  disabled={resolving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-70"
                >
                  {resolving ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}
                  Resolver Chamado
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Image View */}
      <AnimatePresence>
        {viewImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95" onClick={() => setViewImage(null)}>
            <button className="absolute right-4 top-4 rounded-full p-2 text-white/50 hover:text-white hover:bg-white/10 transition">
              <X className="size-8" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={viewImage} alt="Fullscreen Anexo" className="max-w-full max-h-[90vh] object-contain rounded-xl" />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
