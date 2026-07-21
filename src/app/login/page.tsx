"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login.");
      setIsLoading(false);
    }
  }

  return (
    <div className="dark relative flex min-h-screen flex-col items-center justify-center bg-[#070709] px-4 overflow-hidden selection:bg-[#6387FB]/30 selection:text-[#B19FFC] font-sans">
      
      {/* Background Ambient Glows (Vibe do Screenshot) */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="absolute top-[10%] h-[500px] w-[500px] rounded-full bg-gradient-to-b from-[#3C44F9]/20 to-transparent blur-[120px]" />
        <div className="absolute top-[30%] h-[300px] w-[300px] rounded-full bg-[#B19FFC]/10 blur-[100px]" />
      </div>

      <AnimatePresence mode="wait">
        {!showForm ? (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex w-full max-w-sm flex-col items-center text-center"
          >
            <motion.div 
              animate={{ y: [0, -10, 0] }} 
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="mb-8 flex h-36 items-center justify-center"
            >
              <img src="/lg-sem-fundo.png" alt="Card+ Logo" className="h-full w-auto object-contain drop-shadow-[0_0_30px_rgba(99,135,251,0.3)]" />
            </motion.div>
            
            <h1 className="text-[2.5rem] font-extrabold tracking-[-0.03em] text-[#ffffff] leading-none">
              Card+
            </h1>
            <p className="mt-4 text-[15px] font-medium text-[#a1a1aa]">
              Sistema Operacional Digaspi – 
              <span className="text-[#B19FFC]"> Captação de Cartões para Alta Performance</span>
            </p>

            <div className="mt-16 w-full">
              <button
                onClick={() => setShowForm(true)}
                className="group relative w-full rounded-full bg-gradient-to-r from-[#3C44F9] via-[#6387FB] to-[#B19FFC] p-[1px] shadow-[0_0_40px_-10px_rgba(99,135,251,0.5)] transition-all hover:shadow-[0_0_60px_-15px_rgba(99,135,251,0.6)] active:scale-[0.98]"
              >
                <div className="flex h-14 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#3C44F9] via-[#6387FB] to-[#B19FFC] px-8 text-[15px] font-bold text-[#ffffff] tracking-wide">
                  Acessar Conta
                </div>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="relative z-10 w-full max-w-[340px]"
          >
            <div className="mb-10 text-center">
              <div className="mx-auto mb-6 flex h-24 items-center justify-center">
                <img src="/lg-sem-fundo.png" alt="Card+ Logo" className="h-full w-auto object-contain drop-shadow-[0_0_20px_rgba(99,135,251,0.2)]" />
              </div>
              <h2 className="text-[1.5rem] font-bold tracking-tight text-[#ffffff]">Acesso ao Painel</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-[13px] font-medium text-[#a1a1aa] tracking-wide">
                  Usuário
                </label>
                <input
                  required autoFocus
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="login-input w-full rounded-full border border-[#ffffff]/10 bg-[#ffffff]/5 px-5 py-4 text-[15px] font-medium text-[#ffffff] shadow-inner outline-none transition-all placeholder:text-[#ffffff]/40 focus:border-[#6387FB]/50 focus:bg-[#ffffff]/10 focus:ring-4 focus:ring-[#6387FB]/10"
                  placeholder="Ex: operacao.41"
                />
              </div>

              <div>
                <label className="mb-2 block text-[13px] font-medium text-[#a1a1aa] tracking-wide">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="login-input w-full rounded-full border border-[#ffffff]/10 bg-[#ffffff]/5 py-4 pl-5 pr-12 text-[15px] font-medium text-[#ffffff] shadow-inner outline-none transition-all placeholder:text-[#ffffff]/40 focus:border-[#6387FB]/50 focus:bg-[#ffffff]/10 focus:ring-4 focus:ring-[#6387FB]/10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#ffffff]/40 hover:text-[#ffffff]/80 transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </div>

              <div className="h-2" />

              {error && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-center text-[13px] font-medium text-rose-400"
                >
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full rounded-full bg-gradient-to-r from-[#3C44F9] via-[#6387FB] to-[#B19FFC] p-[1px] shadow-[0_0_30px_-10px_rgba(99,135,251,0.4)] transition-all hover:shadow-[0_0_50px_-10px_rgba(99,135,251,0.6)] active:scale-[0.98] disabled:opacity-50"
              >
                <div className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#3C44F9] via-[#6387FB] to-[#B19FFC] text-[15px] font-bold text-[#ffffff] tracking-wide">
                  {isLoading ? <Loader2 className="size-5 animate-spin" /> : "Entrar no Painel"}
                </div>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
