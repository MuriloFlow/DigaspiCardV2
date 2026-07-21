"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export function DevBanner() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const channel = supabase.channel("public:dev_alerts")
      .on("broadcast", { event: "DEV_HEARTBEAT" }, () => {
        setActive(true);
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setActive(false);
        }, 6000);
      })
      .on("broadcast", { event: "DEV_RESOLVED" }, () => {
        setActive(false);
        clearTimeout(timeoutId);
      })
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="w-full bg-emerald-600 px-4 py-2.5 shadow-md flex items-center justify-center gap-3 z-50 overflow-hidden"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/20">
            <ShieldCheck className="size-4 text-white" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-white">
            Atenção: Desenvolvedor atuando no sistema no momento.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
