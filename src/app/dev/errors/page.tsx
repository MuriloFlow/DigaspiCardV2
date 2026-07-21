import { getSystemErrors } from "../actions";
import Link from "next/link";
import { Bug, ArrowRight, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function DevErrorsPage() {
  const errors = await getSystemErrors("open");

  return (
    <div className="p-8 max-w-5xl mx-auto pb-32">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-white">Erros Ativos</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Lista de chamados que precisam de validação e correção do desenvolvedor.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center">
            <Bug className="mb-4 size-10 text-zinc-300 dark:text-zinc-700" />
            <h3 className="text-lg font-bold text-zinc-950 dark:text-white">Nenhum erro ativo</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Seu sistema está 100% limpo no momento.</p>
          </div>
        ) : (
          errors.map((error) => (
            <div key={error.id} className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-zinc-900/50 p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500">
                  <Bug className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-full bg-rose-100 dark:bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      Urgente
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {format(new Date(error.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <h3 className="mt-1 text-base font-bold text-zinc-950 dark:text-white line-clamp-1">{error.message}</h3>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                    {error.context} • {error.user_info} • {error.store_info}
                  </p>
                </div>
              </div>

              <Link
                href={`/dev/${error.id}/validate`}
                className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-950 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 transition hover:bg-zinc-800 dark:hover:bg-zinc-200 sm:w-auto w-full"
              >
                Validar
                <ArrowRight className="size-4" />
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
