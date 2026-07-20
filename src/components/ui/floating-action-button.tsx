"use client";

import { Plus } from "lucide-react";
import { motion } from "motion/react";

export function FloatingActionButton({ onClick, icon }: { onClick: () => void; icon?: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-label="Ação rápida"
      onClick={onClick}
      whileHover={{ y: -3, scale: 1.03 }}
      whileTap={{ scale: 0.94 }}
      className="fixed bottom-24 right-5 z-30 flex size-16 items-center justify-center rounded-full bg-zinc-950 text-white shadow-[0_22px_48px_rgba(17,24,39,0.28)] transition duration-300 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-950/15 sm:bottom-28 sm:right-8"
    >
      {icon ? icon : <Plus aria-hidden="true" className="size-7" strokeWidth={2.4} />}
    </motion.button>
  );
}
