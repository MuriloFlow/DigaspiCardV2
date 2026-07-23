"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, History, Home, Trophy, Users, LogOut, Building, Settings, UserCircle2, Moon, Headset, Bug, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/components/providers/auth-provider";
import { useTheme } from "@/components/providers/main-theme-provider";
import { cn } from "@/lib/utils/cn";

type NavItem = {
  label: string;
  href: string;
  icon: any;
  match: (path: string) => boolean;
  roles?: string[];
};

const items: NavItem[] = [
  {
    label: "Inicio",
    href: "/",
    icon: Home,
    match: (path: string) => path === "/",
  },
  {
    label: "Historico",
    href: "/historico",
    icon: History,
    match: (path: string) => path.startsWith("/historico"),
  },
  {
    label: "Equipe",
    href: "/colaboradores",
    icon: Users,
    match: (path: string) => path.startsWith("/colaboradores"),
    roles: ["GLOBAL_ADMIN", "MANAGER", "REGIONAL_MANAGER", "TI_ADMIN"],
  },
  {
    label: "Lojas",
    href: "/admin",
    icon: Building,
    match: (path: string) => path.startsWith("/admin"),
    roles: ["GLOBAL_ADMIN", "TI_ADMIN"],
  },
  {
    label: "Ranking",
    href: "/ranking",
    icon: Trophy,
    match: (path: string) => path.startsWith("/ranking"),
  },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    }
    if (showSettings) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSettings]);

  if (pathname === "/login" || pathname.startsWith("/dev")) return null;

  const visibleItems = items.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const roleLabel: Record<string, string> = {
    EMPLOYEE: "Funcionário",
    MANAGER: "Gerente",
    VM: "VM",
    GLOBAL_ADMIN: "Admin Global",
    TI_ADMIN: "TI (Dev)",
    REGIONAL_MANAGER: "Regional",
  };

  return (
    <nav
      id="bottom-nav"
      aria-label="Navegacao principal"
      className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 sm:bottom-6 transition-all duration-300"
    >
      <div
        className="flex w-full max-w-lg sm:max-w-2xl md:max-w-3xl items-center justify-between gap-1 sm:gap-2 rounded-[2rem] p-2 sm:p-2.5 shadow-[0_20px_60px_rgba(15,23,42,0.14)] backdrop-blur-xl border"
        style={{
          backgroundColor: "var(--nav-bg, rgba(255,255,255,0.95))",
          borderColor: "var(--nav-border, rgba(228,228,231,0.8))",
        }}
      >
        {visibleItems.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[1.25rem] px-2 sm:px-4 text-xs font-medium text-zinc-500 outline-none transition duration-300 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-950/15 sm:h-14 sm:gap-2.5 sm:rounded-[1.5rem] sm:text-[13px] md:text-sm whitespace-nowrap",
                active && "text-zinc-950",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 rounded-[1.25rem] bg-zinc-950 shadow-[0_12px_28px_rgba(17,24,39,0.18)] sm:rounded-[1.5rem]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              ) : null}
              <span className="relative flex items-center gap-1.5 sm:gap-2">
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "size-4 transition duration-300 group-hover:scale-105 sm:size-5",
                    active && "text-white",
                  )}
                  strokeWidth={active ? 2.35 : 2}
                />
                <span
                  className={cn(
                    "hidden sm:inline",
                    active ? "text-white" : "text-inherit",
                  )}
                >
                  {item.label}
                </span>
              </span>
            </Link>
          );
        })}
        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            title="Configurações"
            className={cn(
              "group relative ml-1 flex size-12 items-center justify-center rounded-[1.25rem] text-zinc-500 outline-none transition duration-300 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-950/15 sm:size-14 sm:rounded-[1.5rem]",
              showSettings && "text-zinc-950"
            )}
          >
            <Settings className="size-4 transition duration-300 group-hover:scale-105 sm:size-5" strokeWidth={showSettings ? 2.35 : 2} />
          </button>

          <AnimatePresence>
            {showSettings && user && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="absolute bottom-full right-0 mb-4 w-64 rounded-3xl p-2 shadow-2xl origin-bottom-right border"
                style={{
                  backgroundColor: "var(--nav-bg, rgba(255,255,255,0.98))",
                  borderColor: "var(--nav-border, rgba(228,228,231,0.8))",
                }}
              >
                <div className="flex flex-col items-center gap-2 p-4 pb-3">
                  <div className="flex size-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                    <UserCircle2 className="size-8" />
                  </div>
                  <div className="text-center">
                    <h3 className="flex items-center justify-center gap-1.5 text-base font-bold text-zinc-950">
                      {user.role === "TI_ADMIN" && <Bug className="size-4 shrink-0 fill-emerald-500/20 text-emerald-500" />}
                      {(user as any).is_primary && <Star className="size-4 shrink-0 fill-amber-400 text-amber-400" />}
                      {user.name || user.username}
                    </h3>
                    <span className={cn(
                      "mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      user.role === "GLOBAL_ADMIN" ? "bg-purple-100 text-purple-700" :
                      user.role === "TI_ADMIN" ? "bg-emerald-100 text-emerald-700" :
                      user.role === "REGIONAL_MANAGER" ? "bg-indigo-100 text-indigo-700" :
                      user.role === "MANAGER" ? "bg-blue-100 text-blue-700" :
                      "bg-zinc-100 text-zinc-600"
                    )}>
                      {roleLabel[user.role as keyof typeof roleLabel] || user.role}
                    </span>
                  </div>
                </div>

                <div className="px-2 pb-2 space-y-1">
                  {["MANAGER", "GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER", "VM"].includes(user.role) && (
                    <Link
                      href="/chamados/novo"
                      onClick={() => setShowSettings(false)}
                      className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                    >
                      <div className="flex items-center gap-2 text-rose-600">
                        <Headset className="size-4" />
                        Abrir Chamado (TI)
                      </div>
                    </Link>
                  )}
                  <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                  >
                    <div className="flex items-center gap-2">
                      <Moon className="size-4" />
                      Tema Escuro
                    </div>
                    <div className={cn(
                      "flex h-5 w-8 cursor-pointer items-center rounded-full p-0.5 transition-colors",
                      theme === "dark" ? "bg-zinc-950" : "bg-zinc-200"
                    )}>
                      <div className={cn(
                        "size-4 rounded-full bg-white shadow-sm transition-transform",
                        theme === "dark" ? "translate-x-3" : "translate-x-0"
                      )} />
                    </div>
                  </button>
                  <button
                    onClick={() => { setShowSettings(false); logout(); }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-100"
                  >
                    <LogOut className="size-4" />
                    Encerrar Sessão
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}
