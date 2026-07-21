"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupportTicket, getUserOpenTickets } from "../actions";
import { TicketChat } from "@/components/chat/ticket-chat";
import { PageContainer, PageHeader } from "@/components/layout/page-container";
import {
  Headset,
  Loader2,
  ImagePlus,
  X,
  Send,
  ChevronDown,
  Clock,
  Plus,
  CheckCircle,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const CATEGORIES = [
  "Problemas técnicos gerais",
  "Problema no computador (Travando, não liga, etc)",
  "Problema com a impressora",
  "Sistema de estoque",
  "Sistema de caixa / PDV",
  "Falta de etiquetas / bobinas",
  "Queda de internet / Lentidão",
  "Dúvida na utilização do sistema",
  "Falha em relatórios",
  "Outros",
];

export default function NovoChamadoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [openTickets, setOpenTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeChatTicketId, setActiveChatTicketId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const tickets = await getUserOpenTickets();
      setOpenTickets(tickets || []);
      if (!tickets || tickets.length === 0) {
        setShowForm(true);
      }
      setLoadingTickets(false);
    }
    load();
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (images.length + files.length > 4) {
      setErrorMsg("Você só pode adicionar até 4 imagens.");
      return;
    }

    setErrorMsg("");

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Redimensionar e comprimir a imagem no canvas
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          // Salva como base64 comprimido (JPEG 60%)
          const dataUrl = canvas.toDataURL("image/jpeg", 0.6);

          setImages((prev) => {
            if (prev.length < 4) return [...prev, dataUrl];
            return prev;
          });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

    // Limpar input para permitir selecionar o mesmo arquivo se precisar
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg("Por favor, preencha o motivo e a descrição.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      await createSupportTicket({
        title,
        category,
        description,
        images,
      });
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao abrir chamado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent transition-colors pb-20">
      <div className="bg-white border-b border-zinc-200 text-zinc-950 pb-24 pt-12 px-6 sm:px-12 rounded-b-[3rem] transition-colors">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 shadow-sm aspect-square">
            <Headset className="size-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Precisa de Ajuda?
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Nossa equipe de TI está pronta para resolver seu problema.
              Preencha os detalhes abaixo.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 sm:px-12 -mt-12 relative z-10 pb-40">
        {loadingTickets ? (
          <div className="flex flex-col items-center justify-center p-16">
            <Loader2 className="size-8 animate-spin text-rose-500" />
            <p className="mt-4 text-sm text-zinc-500 font-medium">Buscando chamados...</p>
          </div>
        ) : !showForm && !success ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-zinc-950">Chamados Abertos</h2>
            </div>
            
            <div className="grid gap-4">
              {openTickets.map((ticket) => (
                <div key={ticket.id} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start gap-5">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                      <Clock className="size-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-zinc-950">{ticket.title}</h3>
                      <p className="text-sm text-zinc-500">{ticket.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-zinc-100 mt-5 pt-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600 transition-colors">
                      <Clock className="size-3.5" />
                      Em Análise
                    </span>
                    
                    <button
                      onClick={() => setActiveChatTicketId(ticket.id)}
                      className="flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100 transition-colors"
                    >
                      <MessageSquare className="size-3.5" />
                      Abrir Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal de Chat para Usuário */}
            {activeChatTicketId && (
              <div className="fixed inset-0 z-[60] flex flex-col sm:items-center sm:justify-center bg-zinc-50 dark:bg-zinc-950 sm:bg-black/60 sm:dark:bg-black/80 sm:backdrop-blur-sm sm:p-4 transition-colors">
                <div className="flex-1 w-full sm:max-w-md sm:max-h-[85vh] bg-white dark:bg-zinc-950 sm:rounded-[2rem] flex flex-col overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 transition-colors">
                  <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-rose-50 dark:bg-zinc-900 text-rose-500">
                        <MessageSquare className="size-4" />
                      </div>
                      <h3 className="font-bold text-zinc-900 dark:text-white">Chat com o TI</h3>
                    </div>
                    <button onClick={() => setActiveChatTicketId(null)} className="p-2 rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition">
                      <X className="size-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden bg-white dark:bg-zinc-950">
                    <TicketChat ticketId={activeChatTicketId} userRole="USER" />
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowForm(true)}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-200 bg-white p-6 text-zinc-500 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
            >
              <Plus className="size-5" />
              <span className="font-bold uppercase tracking-wider text-sm">Abrir Novo Chamado</span>
            </button>
          </div>
        ) : success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="flex flex-col items-center justify-center rounded-[2rem] bg-white p-16 text-center shadow-xl border border-zinc-200 transition-colors"
          >
            <div className="mb-6 flex size-24 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 ring-8 ring-emerald-50/50 ">
              <CheckCircle className="size-12" />
            </div>
            <h2 className="text-3xl font-bold text-zinc-950 ">
              Chamado Enviado!
            </h2>
            <p className="mt-3 text-zinc-500 max-w-sm">
              Sua solicitação foi registrada. Acompanhe o status nesta tela.
            </p>
            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                setShowForm(false);
                setLoadingTickets(true);
                getUserOpenTickets().then(t => {
                  setOpenTickets(t || []);
                  setLoadingTickets(false);
                });
              }}
              className="mt-8 rounded-xl bg-zinc-100 px-6 py-3 font-semibold text-zinc-950 hover:bg-zinc-200 transition"
            >
              Ver meus chamados
            </button>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="transition-colors w-full"
          >
            {errorMsg && (
              <div className="mb-8 rounded-2xl bg-rose-50 p-5 text-sm font-semibold text-rose-600 border border-rose-100 ">
                {errorMsg}
              </div>
            )}

            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-6">
                {/* Título / Motivo */}
                <div>
                  <label className="mb-2.5 block text-xs font-bold uppercase tracking-widest text-zinc-500">
                    Motivo do Chamado
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Impressora do caixa 3 não liga"
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm font-medium outline-none transition focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-zinc-400 shadow-sm"
                    disabled={loading}
                    maxLength={100}
                  />
                </div>

                {/* Categoria */}
                <div className="relative">
                  <label className="mb-2.5 block text-xs font-bold uppercase tracking-widest text-zinc-500">
                    Categoria
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm font-medium outline-none transition focus:border-rose-500 focus:ring-1 focus:ring-rose-500 cursor-pointer shadow-sm"
                      disabled={loading}
                    >
                      <span>{category}</span>
                      <ChevronDown
                        className={`size-4 text-zinc-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
                        >
                          <div className="max-h-60 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-zinc-200 ">
                            {CATEGORIES.map((cat) => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => {
                                  setCategory(cat);
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full text-left rounded-xl px-4 py-3 text-sm transition-colors ${
                                  category === cat
                                    ? "bg-rose-50 text-rose-600 font-bold"
                                    : "text-zinc-600 hover:bg-zinc-50"
                                }`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <label className="mb-2.5 block text-xs font-bold uppercase tracking-widest text-zinc-500">
                    Descrição do Problema
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explique com detalhes o que está acontecendo. Quanto mais informações, mais rápido será o atendimento..."
                    rows={6}
                    className="w-full resize-none rounded-2xl border border-zinc-200 bg-white p-5 text-sm outline-none transition focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-zinc-400 shadow-sm"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-8">
                {/* Fotos */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <label className="block text-sm font-bold uppercase tracking-wider text-zinc-500">
                      Evidências Visuais
                    </label>
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-500">
                      {images.length}/4
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <AnimatePresence>
                      {images.map((img, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-100 border border-zinc-200 group shadow-sm"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img}
                            alt={`Anexo ${index + 1}`}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-rose-500/90 text-white backdrop-blur transition hover:bg-rose-600 hover:scale-110 shadow-lg"
                          >
                            <X className="size-4" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {images.length < 4 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex aspect-square flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 bg-white text-zinc-400 transition hover:border-rose-400 hover:bg-rose-50 hover:text-rose-500 shadow-sm"
                        disabled={loading}
                      >
                        <ImagePlus className="size-8" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">
                          Adicionar Foto
                        </span>
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment" // Pede para abrir a câmera no mobile
                    multiple
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleImageCapture}
                  />
                </div>
              </div>
            </div>
          </motion.form>
        )}
      </div>

      {/* Sticky Bottom Bar for Action Button */}
      {!success && showForm && !loadingTickets && (
        <div className="fixed bottom-24 sm:bottom-8 left-0 right-0 z-40 px-6 pointer-events-none flex justify-center">
          <div className="w-full max-w-4xl pointer-events-auto">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex w-full sm:w-auto ml-auto items-center justify-center gap-3 rounded-2xl bg-zinc-950 px-10 py-5 text-sm font-bold text-white shadow-xl shadow-zinc-900/10 transition hover:bg-zinc-800 active:scale-95 disabled:opacity-70 disabled:shadow-none"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <>
                  <Send className="size-5" />
                  Enviar Solicitação
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
