"use client";

import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils/cn";

type FABColor = "black" | "red" | "amber" | "blue";

const colorMap: Record<FABColor, { bg: string; hover: string; ring: string; shadow: string }> = {
  black: {
    bg: "bg-zinc-950",
    hover: "hover:bg-zinc-800",
    ring: "focus-visible:ring-zinc-950/15",
    shadow: "shadow-[0_22px_48px_rgba(17,24,39,0.28)]",
  },
  red: {
    bg: "bg-rose-600",
    hover: "hover:bg-rose-500",
    ring: "focus-visible:ring-rose-600/20",
    shadow: "shadow-[0_22px_48px_rgba(225,29,72,0.30)]",
  },
  amber: {
    bg: "bg-amber-400",
    hover: "hover:bg-amber-300",
    ring: "focus-visible:ring-amber-400/20",
    shadow: "shadow-[0_22px_48px_rgba(251,191,36,0.35)]",
  },
  blue: {
    bg: "bg-blue-600",
    hover: "hover:bg-blue-500",
    ring: "focus-visible:ring-blue-600/20",
    shadow: "shadow-[0_22px_48px_rgba(37,99,235,0.30)]",
  },
};

export function FloatingActionButton({
  onClick,
  icon,
  color = "black",
  offset = 0,
  ariaLabel = "Ação rápida",
}: {
  onClick: () => void;
  icon?: React.ReactNode;
  color?: FABColor;
  /** Offset vertical em px para empilhar múltiplos FABs. Ex: 76 para o segundo */
  offset?: number;
  ariaLabel?: string;
}) {
  const c = colorMap[color];
  const textColor = color === "amber" ? "text-zinc-950" : "text-white";

  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      whileHover={{ y: -3, scale: 1.03 }}
      whileTap={{ scale: 0.94 }}
      style={{ bottom: `${96 + offset}px` }}
      className={cn(
        "fixed right-5 z-30 flex size-16 items-center justify-center rounded-full transition duration-300 focus-visible:outline-none focus-visible:ring-4 sm:right-8",
        c.bg,
        c.hover,
        c.ring,
        c.shadow,
        textColor,
      )}
    >
      {icon ? icon : <Plus aria-hidden="true" className="size-7" strokeWidth={2.4} />}
    </motion.button>
  );
}
