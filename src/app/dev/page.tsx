import { ShieldAlert, Bug, History } from "lucide-react";
import Link from "next/link";
import { getSystemErrors } from "./actions";
import { formatInteger } from "@/lib/utils/format";
import { DevModeToggle } from "./components/dev-mode-toggle";

export const dynamic = "force-dynamic";

export default async function DevHomePage() {
  const allErrors = await getSystemErrors();
  const openCount = allErrors.filter((e) => e.status === "open").length;
  const resolvedCount = allErrors.filter((e) => e.status === "resolved").length;

  return (
    <div className="p-8 max-w-4xl mx-auto pb-32">
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-white">Painel Geral</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Visão geral da saúde do sistema e chamados abertos.
          </p>
        </div>
        <DevModeToggle />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card: Ativos */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
              <Bug className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Erros Ativos</p>
              <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">{formatInteger(openCount)}</h2>
            </div>
          </div>
          <Link
            href="/dev/errors"
            className="mt-6 block w-full rounded-lg bg-zinc-100 dark:bg-zinc-800 py-2.5 text-center text-sm font-semibold text-zinc-900 dark:text-white transition hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            Ver chamados
          </Link>
        </div>

        {/* Card: Resolvidos */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <History className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Resolvidos</p>
              <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">{formatInteger(resolvedCount)}</h2>
            </div>
          </div>
          <Link
            href="/dev/history"
            className="mt-6 block w-full rounded-lg bg-zinc-100 dark:bg-zinc-800 py-2.5 text-center text-sm font-semibold text-zinc-900 dark:text-white transition hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            Ver histórico
          </Link>
        </div>

        {/* Card: Status Geral */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex flex-col h-full items-center justify-center text-center">
            {openCount > 0 ? (
              <>
                <ShieldAlert className="size-10 text-rose-500 mb-3" />
                <h3 className="text-base font-bold text-zinc-950 dark:text-white">Atenção Necessária</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Existem tickets aguardando validação.</p>
              </>
            ) : (
              <>
                <ShieldAlert className="size-10 text-emerald-500 mb-3" />
                <h3 className="text-base font-bold text-zinc-950 dark:text-white">Sistema Saudável</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Todos os bugs foram corrigidos.</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
