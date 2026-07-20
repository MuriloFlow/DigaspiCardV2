"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, History, Home, Trophy, Users, LogOut } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/components/providers/auth-provider";

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
    roles: ["GLOBAL_ADMIN", "MANAGER"],
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

  if (pathname === "/login") return null;

  const visibleItems = items.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <nav
      aria-label="Navegacao principal"
      className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 sm:bottom-6"
    >
      <div className="flex w-full max-w-lg items-center justify-between gap-1 rounded-[2rem] border border-zinc-200/80 bg-white/95 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.14)] backdrop-blur-xl">
        {visibleItems.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[1.25rem] px-2 text-xs font-medium text-zinc-500 outline-none transition duration-300 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-950/15 sm:h-14 sm:gap-2 sm:rounded-[1.5rem] sm:text-sm",
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
        <button
          onClick={logout}
          title="Sair"
          className="ml-1 flex size-12 items-center justify-center rounded-[1.25rem] bg-rose-50 text-rose-600 transition duration-300 hover:bg-rose-100 hover:text-rose-700 sm:size-14 sm:rounded-[1.5rem]"
        >
          <LogOut className="size-4 sm:size-5" />
        </button>
      </div>
    </nav>
  );
}
