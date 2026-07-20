"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Lock, User, Loader2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 sm:px-6 lg:px-8">
      {/* Background gradients for premium feel */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[40%] left-[50%] h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-[40%] right-[10%] h-[600px] w-[600px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="rounded-[2.5rem] border border-zinc-200/80 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-10">
          <div className="text-center">
            <div className="mx-auto mb-6 flex size-20 items-center justify-center">
              <img src="/logov2.png" alt="Card+ Logo" className="h-full w-full object-contain" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-950">
              Card+
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Gestão de Performance e Gamificação.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="mb-1.5 block text-sm font-semibold text-zinc-950"
                >
                  Usuário
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <User className="size-5 text-zinc-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 py-3.5 pl-12 pr-4 text-zinc-950 outline-none transition duration-300 placeholder:text-zinc-400 focus:border-zinc-950 focus:bg-white focus:ring-4 focus:ring-zinc-950/10 sm:text-sm"
                    placeholder="ex: operacao.41"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-semibold text-zinc-950"
                >
                  Senha
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Lock className="size-5 text-zinc-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 py-3.5 pl-12 pr-4 text-zinc-950 outline-none transition duration-300 placeholder:text-zinc-400 focus:border-zinc-950 focus:bg-white focus:ring-4 focus:ring-zinc-950/10 sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 py-3.5 text-sm font-semibold text-white transition duration-300 hover:bg-zinc-800 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-950/20 disabled:opacity-75"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  Entrar no painel
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
