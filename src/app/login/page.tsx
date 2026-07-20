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
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 pt-12 pb-8 sm:px-6 sm:pb-12 lg:px-8 lg:pb-12">
      {/* Background gradients for premium feel */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] left-[20%] h-[1000px] w-[1000px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[800px] w-[800px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute top-[40%] right-[30%] h-[600px] w-[600px] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-md flex flex-col flex-1">
        {/* Header no topo alinhado com o card */}
        <div className="flex-1">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="mb-5 flex size-[88px] items-center justify-center">
              <img src="/lg-sem-fundo.png" alt="Card+ Logo" className="h-full w-full object-contain drop-shadow-sm" />
            </div>
            <h1 className="text-[2rem] font-bold tracking-tight text-zinc-950">
              Card+
            </h1>
            <p className="mt-2 text-base font-medium text-zinc-500 max-w-sm">
              Sistema de gestão e operacional Digaspi
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", damping: 28, stiffness: 380, delay: 0.1 }}
          className="w-full rounded-[2rem] bg-white p-8 shadow-[0_30px_100px_-15px_rgba(15,23,42,0.15)] relative backdrop-blur-3xl border border-zinc-100/50"
        >
        <div className="mb-6">
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-zinc-950">
            <User className="size-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-zinc-950">Acesso ao Sistema</h2>
          <p className="mt-1 text-sm text-zinc-500">Preencha os dados para acessar o painel.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Usuário
            </label>
            <input
              required autoFocus
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full rounded-[1rem] border border-zinc-200/80 bg-zinc-50/50 px-4 py-3.5 text-sm font-medium text-zinc-950 outline-none transition-all focus:border-zinc-900 focus:bg-white focus:ring-[3px] focus:ring-zinc-900/10 placeholder:text-zinc-400"
              placeholder="Ex: operacao.41"
            />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-[1rem] border border-zinc-200/80 bg-zinc-50/50 px-4 py-3.5 text-sm font-medium text-zinc-950 outline-none transition-all focus:border-zinc-900 focus:bg-white focus:ring-[3px] focus:ring-zinc-900/10 placeholder:text-zinc-400"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-[1rem] bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
            >
              {error}
            </motion.p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="group flex flex-1 items-center justify-center gap-2 rounded-[1rem] bg-zinc-950 px-4 py-4 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all hover:bg-zinc-800 hover:shadow-lg hover:shadow-zinc-900/20 active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              Entrar
            </button>
          </div>
        </form>
        </motion.div>
      </div>
    </div>
  );
}
