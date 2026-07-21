"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export function DevModeToggle() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (active) {
      // Reusa o canal que o DevBanner já criou no cliente
      const channels = supabase.getChannels();
      let channel = channels.find(c => c.topic === "realtime:public:dev_alerts" || c.topic === "public:dev_alerts");
      
      if (!channel) {
        channel = supabase.channel("public:dev_alerts");
        channel.subscribe();
      }

      channel.send({ type: "broadcast", event: "DEV_HEARTBEAT" });
      interval = setInterval(() => {
        channel.send({ type: "broadcast", event: "DEV_HEARTBEAT" });
      }, 3000);

      return () => {
        clearInterval(interval);
      };
    } else {
      const channels = supabase.getChannels();
      const channel = channels.find(c => c.topic === "realtime:public:dev_alerts" || c.topic === "public:dev_alerts");
      if (channel) {
        channel.send({ type: "broadcast", event: "DEV_RESOLVED" });
      }
    }
  }, [active]);

  return (
    <button
      onClick={() => setActive(!active)}
      className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all shadow-sm ${
        active 
          ? "bg-rose-500 text-white hover:bg-rose-600 shadow-[0_0_15px_rgba(244,63,94,0.4)]" 
          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
      }`}
    >
      {active ? <ShieldAlert className="size-5" /> : <ShieldCheck className="size-5" />}
      {active ? "Modo Dev: LIGADO (Notificando Rede)" : "Ativar Modo Desenvolvedor (Manual)"}
    </button>
  );
}
