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
    <div className="flex min-h-screen flex-col items-center justify-end bg-zinc-50 px-4 pb-12 sm:px-6 lg:px-8">
      {/* Background gradients for premium feel */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[40%] left-[50%] h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-[40%] right-[10%] h-[600px] w-[600px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", damping: 28, stiffness: 380 }}
        className="w-full max-w-md rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-2xl relative"
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
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 uppercase tracking-wide">
              Usuário
            </label>
            <input
              required autoFocus
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition bg-transparent text-zinc-950 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10 placeholder:text-zinc-400"
              placeholder="Ex: operacao.41"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 uppercase tracking-wide">
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition bg-transparent text-zinc-950 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10 placeholder:text-zinc-400"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              Entrar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
