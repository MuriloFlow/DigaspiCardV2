import { getSystemErrors } from "../actions";
import { History, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function DevHistoryPage() {
  const errors = await getSystemErrors("resolved");

  return (
    <div className="p-8 max-w-5xl mx-auto pb-32">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-white">Histórico de Chamados</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Registro de todos os bugs e problemas resolvidos no sistema.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center">
            <History className="mb-4 size-10 text-zinc-300 dark:text-zinc-700" />
            <h3 className="text-lg font-bold text-zinc-950 dark:text-white">Nenhum histórico encontrado</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Nenhum chamado foi resolvido ainda.</p>
          </div>
        ) : (
          errors.map((error) => (
            <div key={error.id} className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Resolvido
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {error.resolved_at ? format(new Date(error.resolved_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR }) : ""}
                    </span>
                  </div>
                  <h3 className="mt-1 text-base font-bold text-zinc-950 dark:text-white line-clamp-1 opacity-75">{error.message}</h3>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                    {error.context} • Resolvido no ID: {error.id.split('-')[0]}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
