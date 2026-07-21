"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Bug, History, ShieldAlert, ArrowLeft, Headset, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useDevTheme } from "./dev-theme-provider";

export function DevLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useDevTheme();

  const navItems = [
    { name: "Painel Geral", href: "/dev", icon: LayoutDashboard },
    { name: "Erros Ativos", href: "/dev/errors", icon: Bug },
    { name: "Chamados TI", href: "/dev/tickets", icon: Headset },
    { name: "Histórico", href: "/dev/history", icon: History },
  ];

  return (
    <div className="flex-1 flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 md:flex transition-colors">
        <div className="flex h-16 items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 px-6 transition-colors">
          <div className="flex size-8 items-center justify-center rounded-lg bg-rose-500 text-white">
            <ShieldAlert className="size-5" />
          </div>
          <span className="text-sm font-bold text-zinc-950 dark:text-white">Dev Console</span>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white"
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                <item.icon className={cn("size-5", isActive ? "text-zinc-950 dark:text-white" : "text-zinc-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 space-y-2 transition-colors">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500 dark:text-zinc-400 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white"
          >
            {theme === "dark" ? <Sun className="size-5 text-amber-500" /> : <Moon className="size-5 text-indigo-500" />}
            {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
          </button>
          
          <Link
            href="/"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500 dark:text-zinc-400 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white"
          >
            <ArrowLeft className="size-5" />
            Sair do Console
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
