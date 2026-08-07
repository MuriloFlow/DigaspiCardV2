import type { Remarcacao, RemarcacaoStatus, RemarcacaoSummary } from "./types";

// ── Labels de status ─────────────────────────────────────────

export const REMARCACAO_STATUS_LABEL: Record<RemarcacaoStatus, string> = {
  draft: "Rascunho",
  pending_approval: "Aguardando Gerente",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export const REMARCACAO_STATUS_COLOR: Record<
  RemarcacaoStatus,
  { bg: string; text: string }
> = {
  draft: { bg: "bg-amber-100", text: "text-amber-700" },
  pending_approval: { bg: "bg-blue-100", text: "text-blue-700" },
  completed: { bg: "bg-emerald-100", text: "text-emerald-700" },
  cancelled: { bg: "bg-rose-100", text: "text-rose-700" },
};

export function formatRemarcacaoStatus(status: RemarcacaoStatus): string {
  return REMARCACAO_STATUS_LABEL[status] ?? status;
}

// ── Ordenação ────────────────────────────────────────────────

export function sortRemarcacoesByNewest(items: Remarcacao[]): Remarcacao[] {
  return [...items].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

// ── Summary ──────────────────────────────────────────────────

export function buildRemarcacaoSummary(
  items: Remarcacao[],
): RemarcacaoSummary {
  const active = items.filter((r) => !r.deletedAt);
  const completed = active.filter((r) => r.status === "completed");

  const totalSavings = completed.reduce((acc, r) => {
    const batchSavings = (r.itens || []).reduce((batchAcc, item) => {
      const orig = item.originalValueCents ?? 0;
      const rem = item.remarkedValueCents ?? 0;
      return batchAcc + Math.max(0, orig - rem);
    }, 0);
    return acc + batchSavings;
  }, 0);

  const totalItems = active.reduce((acc, r) => acc + (r.itens?.length || 0), 0);

  return {
    totalBatches: active.length,
    completedBatches: completed.length,
    draftBatches: active.filter((r) => r.status === "draft").length,
    totalItems,
    totalSavings,
  };
}

// ── Formatação de valores ────────────────────────────────────

export function formatSavingPercent(
  originalCents: number | null,
  remarkedCents: number | null,
): string | null {
  if (!originalCents || !remarkedCents || originalCents === 0) return null;
  const diff = originalCents - remarkedCents;
  const pct = (diff / originalCents) * 100;
  if (pct === 0) return null;
  return `${pct > 0 ? "-" : "+"}${Math.abs(pct).toFixed(0)}%`;
}

// ── Histórico — action labels ────────────────────────────────

export const HISTORICO_ACTION_LABEL: Record<string, string> = {
  created: "Remarcação criada",
  updated: "Dados atualizados",
  photo_added: "Foto da etiqueta adicionada",
  barcode_scanned: "Código de barras escaneado",
  values_set: "Valores informados",
  completed: "Remarcação concluída com assinatura",
  cancelled: "Remarcação cancelada",
};
