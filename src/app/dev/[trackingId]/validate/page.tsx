"use client";

import { useState, use, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, ShieldCheck, Bug, Loader2, FileCode2, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { resolveErrorTicket, checkErrorTicketStatus } from "../../actions";

export default function ValidateErrorPage({ params }: { params: Promise<{ trackingId: string }> }) {
  const [resolved, setResolved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorData, setErrorData] = useState<any>(null);
  const [showLogModal, setShowLogModal] = useState(false);

  // Desempacota param (Next 15+ Async Params)
  const { trackingId } = use(params);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let isActive = true;
    
    // Usa o canal global, mas previne re-inscrição
    const channel = supabase.channel("public:dev_alerts");

    async function init() {
      const data = await checkErrorTicketStatus(trackingId);
      const status = data.status;
      if (status !== "not_found") {
        setErrorData(data);
      }
      
      if (status === "open" && isActive) {
        
        // Se o canal já está em uso (ex: HMR ou Strict Mode), não recria
        if (channel.state === "joined" || channel.state === "joining") {
          return;
        }

        // Ticket válido e aberto. Inicia heartbeat.
        channel.subscribe((subStatus) => {
          if (subStatus === "SUBSCRIBED" && isActive) {
            // Manda imediatamente o primeiro pulso
            channel.send({ type: "broadcast", event: "DEV_HEARTBEAT" });
            
            // Continua mandando a cada 3 segundos enquanto a guia estiver aberta
            intervalId = setInterval(() => {
              if (isActive) {
                channel.send({ type: "broadcast", event: "DEV_HEARTBEAT" });
              }
            }, 3000);
          }
        });
      } else if (status === "resolved" && isActive) {
        setResolved(true);
      }
    }

    init();

    return () => {
      isActive = false;
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [trackingId]);

  async function handleResolve() {
    setLoading(true);
    
    try {
      // Resolve no banco de dados primeiro
      await resolveErrorTicket(trackingId);
    } catch (err) {
      console.error("Erro ao resolver no banco:", err);
      alert("Falha ao salvar a resolução no banco, mas a notificação será encerrada.");
    }

    // Avisa todos os usuários do sistema que o problema foi resolvido
    // Avisa todos os usuários do sistema que o problema foi resolvido
    const resolveChannel = supabase.channel("public:dev_alerts");
    
    // Para resolver, mandamos o broadcast de qualquer forma
    // Não precisamos re-inscrever se já estiver no canal
    resolveChannel.send({
      type: "broadcast",
      event: "DEV_RESOLVED"
    });
    
    setTimeout(() => {
      setLoading(false);
      setResolved(true);
      supabase.removeChannel(resolveChannel);
    }, 800);
  }

  if (errorData?.status === "not_found") {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-950 dark:text-white transition-colors">
        <Bug className="size-16 text-zinc-300 dark:text-zinc-800 mb-6" />
        <h1 className="text-2xl font-bold">Ticket Inválido</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400 text-center max-w-md">
          O Tracking ID ({trackingId}) não foi encontrado ou já não existe no sistema de logs.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-theme(spacing.16))] bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden flex flex-col transition-colors">
      {/* BANNER ANIMADO FIXO NO TOPO */}
      <AnimatePresence>
        {!resolved && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="w-full bg-emerald-600 px-4 py-3 shadow-lg flex items-center justify-center gap-3 z-50 sticky top-0"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20">
              <ShieldCheck className="size-5 text-white" />
            </div>
            <p className="text-sm font-semibold text-white">
              Atenção: Desenvolvedor está em ação já corrigindo este problema!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTEÚDO DA PÁGINA */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-lg rounded-[2rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-2xl transition-colors"
        >
          {resolved ? (
            <div className="text-center">
              <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 ring-8 ring-emerald-50/50 dark:ring-emerald-500/5">
                <CheckCircle2 className="size-10" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">Erro Resolvido!</h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                A correção para o ticket <strong>{trackingId.split('-')[0]}</strong> foi validada e documentada com sucesso.
              </p>
              <button
                onClick={() => window.close()}
                className="mt-8 w-full rounded-xl bg-zinc-950 dark:bg-white py-3.5 text-sm font-bold text-white dark:text-zinc-950 transition hover:bg-zinc-800 dark:hover:bg-zinc-200"
              >
                Fechar Aba
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-6 flex items-center gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-500">
                  <Bug className="size-7" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Validar Correção</p>
                  <h1 className="text-xl font-bold text-zinc-950 dark:text-white">Tracking ID: {trackingId.split('-')[0]}...</h1>
                </div>
              </div>

              <div className="mb-8 rounded-2xl bg-zinc-50 dark:bg-zinc-950 p-5 border border-zinc-100 dark:border-zinc-800 transition-colors">
                <h3 className="mb-2 text-sm font-semibold text-zinc-950 dark:text-white">Instruções</h3>
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Verifique os logs da aplicação e valide se o fix para este erro já foi implementado. Ao marcar como resolvido, o chamado será encerrado.
                </p>
              </div>

              <div className="flex flex-col gap-3 mt-8">
                <button
                  onClick={handleResolve}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 shadow-[0_4px_14px_rgba(5,150,105,0.3)] hover:shadow-[0_6px_20px_rgba(5,150,105,0.4)] disabled:opacity-70"
                >
                  {loading ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}
                  Marcar erro como Resolvido
                </button>
                
                {errorData && (
                  <button
                    onClick={() => setShowLogModal(true)}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-bold text-white transition hover:bg-zinc-800"
                  >
                    <FileCode2 className="size-4" />
                    Ver LOG Detalhado
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* MODAL DE LOGS */}
      <AnimatePresence>
        {showLogModal && errorData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowLogModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-[2rem] bg-white dark:bg-zinc-950 p-1 flex flex-col shadow-2xl border border-zinc-200 dark:border-zinc-800 transition-colors"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                    <FileCode2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white">Log de Erro (Tracking ID)</h3>
                    <p className="text-xs text-zinc-500">{trackingId}</p>
                  </div>
                </div>
                <button onClick={() => setShowLogModal(false)} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition">
                  <X className="size-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-5 space-y-6 flex-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-700">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">Contexto & Usuário</p>
                  <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-4 border border-zinc-200/50 dark:border-zinc-800/50 text-sm text-zinc-700 dark:text-zinc-300">
                    <p><strong className="text-zinc-950 dark:text-white">Ação:</strong> {errorData.context}</p>
                    <p className="mt-1"><strong className="text-zinc-950 dark:text-white">Usuário logado:</strong> {errorData.user_info}</p>
                    <p className="mt-1"><strong className="text-zinc-950 dark:text-white">Unidade base:</strong> {errorData.store_info}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-500">Mensagem do Erro</p>
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-4 border border-rose-100 dark:border-rose-500/20 text-sm text-rose-900 dark:text-rose-200">
                    {errorData.message}
                  </div>
                </div>

                {errorData.stack_trace && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Stack Trace</p>
                    <div className="rounded-xl bg-zinc-100 dark:bg-[#0d0d0d] p-4 border border-zinc-200 dark:border-zinc-800/50">
                      <pre className="text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-400 whitespace-pre-wrap font-mono">
                        {errorData.stack_trace}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
