"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type SelectOption = {
  value: string;
  label: string;
  icon?: React.ReactNode;
  /** Se true, renderiza como cabeçalho de grupo (não clicável) */
  isHeader?: boolean;
};

type CustomSelectProps = {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  disabled = false,
  className,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [direction, setDirection] = useState<"down" | "up">("down");
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((o) => !o.isHeader && o.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  function handleToggle() {
    if (disabled) return;
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // Se houver menos de 340px abaixo (tamanho máximo do menu + folga) e houver mais espaço em cima, abre pra cima.
      if (spaceBelow < 340 && rect.top > spaceBelow) {
        setDirection("up");
      } else {
        setDirection("down");
      }
    }
    setIsOpen(!isOpen);
  }

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium outline-none transition",
          isOpen ? "border-zinc-950 ring-2 ring-zinc-950/10" : "hover:bg-zinc-50",
          disabled && "cursor-not-allowed bg-zinc-50 text-zinc-500 opacity-80"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption ? (
            <>
              <span className="truncate text-zinc-950">{selectedOption.label}</span>
              {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
            </>
          ) : (
            <span className="truncate text-zinc-500">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={cn("size-4 shrink-0 text-zinc-400 transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: direction === "down" ? -4 : 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: direction === "down" ? -4 : 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute left-0 right-0 z-50 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl",
              "max-h-[340px]", // Permite ver até ~8 itens antes de rolar
              "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 hover:[&::-webkit-scrollbar-thumb]:bg-zinc-400",
              direction === "down" ? "mt-2 top-full" : "mb-2 bottom-full"
            )}
          >
            {options.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-zinc-500">Nenhuma opção disponível.</div>
            ) : (
              options.map((option, i) =>
                option.isHeader ? (
                  // ── Cabeçalho de grupo (não clicável) ──
                  <div
                    key={`header-${i}`}
                    className="flex items-center gap-2 px-3 pb-1 pt-2.5 first:pt-1"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{option.label}</span>
                    <div className="h-px flex-1 bg-zinc-100" />
                  </div>
                ) : (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition",
                      value === option.value ? "bg-zinc-100 text-zinc-950" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="truncate">{option.label}</span>
                      {option.icon && <span className="shrink-0">{option.icon}</span>}
                    </div>
                    {value === option.value && <Check className="size-4 shrink-0 text-zinc-950" />}
                  </button>
                )
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
