"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { User, Loader2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      setError("Preencha todos os campos.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Erro de autenticação.");
      }

      // Sucesso!
      // Atualiza a página inteira para recarregar o layout do Next.js
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login.");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Panel - Branding (Oculto no mobile, visível em telas lg) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-950 items-center justify-center overflow-hidden">
        {/* Background Premium Glows */}
        <div className="absolute top-[20%] left-[10%] h-[600px] w-[600px] rounded-full bg-blue-500/20 blur-[120px] pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-[10%] right-[10%] h-[600px] w-[600px] rounded-full bg-emerald-500/15 blur-[120px] pointer-events-none mix-blend-screen" />
        
        {/* Abstract Grid / Texture (Opcional, usando apenas border sutis para dar textura) */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:24px_24px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-lg px-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="mb-8 flex size-20 items-center justify-center rounded-3xl bg-zinc-900/50 p-4 ring-1 ring-white/10 backdrop-blur-xl shadow-2xl">
              <img src="/lg-sem-fundo.png" alt="Card+ Logo" className="h-full w-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl leading-[1.1]">
              Gestão Inteligente,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 to-zinc-500">
                Resultados Reais.
              </span>
            </h1>
            
            <p className="mt-6 text-lg text-zinc-400 font-medium leading-relaxed">
              O sistema oficial da Digaspi desenvolvido para elevar o acompanhamento operacional, controle de metas e ranking de captação de cartões ao mais alto nível.
            </p>
            
            <div className="mt-14 flex items-center gap-4 border-t border-zinc-800/50 pt-8">
              <div className="flex -space-x-3">
                <div className="flex size-10 items-center justify-center rounded-full border-2 border-zinc-950 bg-zinc-800 text-xs font-bold text-zinc-300">OP</div>
                <div className="flex size-10 items-center justify-center rounded-full border-2 border-zinc-950 bg-zinc-800 text-xs font-bold text-zinc-300">GE</div>
                <div className="flex size-10 items-center justify-center rounded-full border-2 border-zinc-950 bg-zinc-800 text-xs font-bold text-zinc-300">AD</div>
              </div>
              <p className="text-sm font-medium text-zinc-500">
                Ambiente corporativo restrito.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Formulário de Login */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-white px-4 py-12 sm:px-6 lg:px-8 relative">
        <div className="w-full max-w-[360px] relative z-10">
          {/* Header versão Mobile (Oculto no Desktop, mostra a logo e infos básicas) */}
          <div className="lg:hidden mb-10">
            <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-zinc-950 shadow-lg">
              <img src="/lg-sem-fundo.png" alt="Card+ Logo" className="h-10 w-10 object-contain drop-shadow-sm" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-950">Card+</h2>
            <p className="mt-1 text-sm font-medium text-zinc-500">Sistema operacional Digaspi</p>
          </div>

          <div className="hidden lg:block mb-12 text-center">
            <h2 className="text-[1.85rem] font-bold text-zinc-950 tracking-[-0.02em]">Acesso ao Painel</h2>
            <p className="mt-2 text-[15px] text-zinc-500">Insira suas credenciais para continuar.</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-semibold text-zinc-700">
                  Usuário
                </label>
                <input
                  required autoFocus
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full rounded-[0.85rem] border border-zinc-200/80 bg-zinc-50/50 px-4 py-3.5 text-[15px] text-zinc-950 outline-none transition-all focus:border-zinc-900 focus:bg-white focus:ring-[3px] focus:ring-zinc-900/10 placeholder:text-zinc-400"
                  placeholder="Ex: operacao.41"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-zinc-700">
                  Senha
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-[0.85rem] border border-zinc-200/80 bg-zinc-50/50 px-4 py-3.5 text-[15px] text-zinc-950 outline-none transition-all focus:border-zinc-900 focus:bg-white focus:ring-[3px] focus:ring-zinc-900/10 placeholder:text-zinc-400"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="rounded-[1rem] bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-inset ring-rose-500/20"
                >
                  {error}
                </motion.p>
              )}

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative flex w-full items-center justify-center gap-2 rounded-[0.85rem] bg-zinc-950 px-4 py-3.5 text-[15px] font-medium text-white transition-all hover:bg-zinc-800 hover:shadow-md hover:shadow-zinc-900/10 active:scale-[0.98] disabled:opacity-50 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  <span className="relative z-10 flex items-center gap-2">
                    {isLoading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />}
                    Continuar
                  </span>
                </button>
              </div>
            </form>
          </motion.div>

          <div className="mt-16 text-center">
            <p className="text-[13px] font-medium text-zinc-400">
              © {new Date().getFullYear()} Digaspi. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
