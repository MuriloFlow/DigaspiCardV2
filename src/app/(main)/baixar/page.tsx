"use client";

import { useEffect, useState } from "react";
import { Download, QrCode, Smartphone, Info } from "lucide-react";
import Image from "next/image";

export default function BaixarPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    } else {
      // Instruções de fallback se o prompt nativo não disparar
      alert("Para instalar: \n\nNo Android: Clique nos 3 pontinhos do Chrome e 'Adicionar à Tela Inicial'.\n\nNo iPhone: Clique em Compartilhar e 'Adicionar à Tela de Início'.");
    }
  };

  const qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://digaspi.vercel.app/baixar&margin=10";

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-[2rem] p-8 md:p-12 shadow-2xl flex flex-col md:flex-row items-center gap-12">
        
        {/* Esquerda: Conteúdo */}
        <div className="flex-1 space-y-6 text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-full text-sm font-semibold border border-blue-500/20">
            <Smartphone className="size-4" />
            <span>App Oficial</span>
          </div>
          
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              Instale o Digaspi
            </h1>
            <p className="text-zinc-400 leading-relaxed">
              Tenha o controle completo das vendas e gestão de cartões direto na tela inicial do seu celular. Rápido, leve e não ocupa memória.
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-3 bg-white text-zinc-950 hover:bg-zinc-100 transition-all font-bold text-lg px-6 py-4 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95"
            >
              <Download className="size-5" />
              {isInstallable ? "Instalar App Agora" : "Baixar App"}
            </button>
            <p className="mt-4 flex items-center justify-center md:justify-start gap-2 text-xs font-medium text-zinc-500">
              <Info className="size-4" />
              Compatível com Android e iOS
            </p>
          </div>
        </div>

        {/* Direita: QR Code */}
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-4 rounded-3xl shadow-xl ring-1 ring-black/5">
            <Image
              src={qrCodeUrl}
              alt="QR Code para baixar o app"
              width={200}
              height={200}
              className="rounded-xl pointer-events-none"
              unoptimized
            />
          </div>
          <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
            <QrCode className="size-4" />
            <span>Escaneie com a câmera</span>
          </div>
        </div>

      </div>
    </div>
  );
}
