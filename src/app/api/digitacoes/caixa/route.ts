import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createDigitacao, listDigitacoes } from "@/lib/records/digitacoes-repository";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

function forbidden(msg = "Acesso negado.") {
  return NextResponse.json({ message: msg }, { status: 403, headers: noStore });
}

/**
 * Garante que existe um colaborador "CAIXA" para a loja.
 * Primeiro tenta buscar, se não existir cria.
 * Tolerante a falhas de constraint (sub_role).
 */
async function ensureCaixaColaborador(storeId: string): Promise<string> {
  // Try to find existing CAIXA collaborator
  const { data: existing } = await supabaseAdmin
    .from("collaborators")
    .select("id")
    .eq("store_id", storeId)
    .ilike("name", "CAIXA")
    .maybeSingle();

  if (existing?.id) return existing.id;

  // Try inserting with sub_role Caixa
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("collaborators")
    .insert({ name: "CAIXA", store_id: storeId, sub_role: "Caixa" })
    .select("id")
    .single();

  if (!insertError && inserted?.id) return inserted.id;

  // Fallback: try without sub_role (use default)
  const { data: inserted2, error: insertError2 } = await supabaseAdmin
    .from("collaborators")
    .insert({ name: "CAIXA", store_id: storeId })
    .select("id")
    .single();

  if (!insertError2 && inserted2?.id) return inserted2.id;

  // Last chance: re-query (another request might have created it in parallel)
  const { data: reQuery } = await supabaseAdmin
    .from("collaborators")
    .select("id")
    .eq("store_id", storeId)
    .ilike("name", "CAIXA")
    .maybeSingle();

  if (reQuery?.id) return reQuery.id;

  throw new Error(`Não foi possível criar/encontrar colaborador CAIXA: ${insertError?.message ?? insertError2?.message}`);
}

export async function POST(request: Request) {
  let body: { storeId?: string; quantity?: number; dateKey?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400, headers: noStore });
  }

  try {
    const session = await getSession();
    if (!session) return forbidden("Sessão inválida.");

    let storeId = (["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role))
      ? (body.storeId ?? null)
      : session.storeId;

    if (!storeId) return forbidden("Selecione uma loja para registrar a digitação no Caixa.");

    const quantity = Number(body.quantity);
    if (!quantity || quantity <= 0 || quantity > 500) {
      return NextResponse.json({ message: "Quantidade inválida (1–500)." }, { status: 422, headers: noStore });
    }

    const caixaId = await ensureCaixaColaborador(storeId);

    await createDigitacao({
      collaboratorId: caixaId,
      clientName: "Digitacoes Caixa",
      operatorName: "CAIXA",
      storeId: storeId as string,
      quantity,
      dateKey: body.dateKey,
    });

    const dateKey = new Date().toISOString().slice(0, 10);
    try {
      const { data: existingMetric } = await supabaseAdmin
        .from("daily_metrics")
        .select("id, total_caixa")
        .eq("store_id", storeId)
        .eq("date_key", dateKey)
        .maybeSingle();

      if (existingMetric) {
        await supabaseAdmin
          .from("daily_metrics")
          .update({ total_caixa: (existingMetric.total_caixa ?? 0) + quantity })
          .eq("id", existingMetric.id);
      } else {
        await supabaseAdmin
          .from("daily_metrics")
          .insert({ store_id: storeId, date_key: dateKey, total_customers: 0, total_caixa: quantity });
      }
    } catch {
      // Ignore if daily_metrics column doesn't exist yet
    }

    const digitacoes = await listDigitacoes(storeId);
    return NextResponse.json({ success: true, digitacoes }, { status: 201, headers: noStore });
  } catch (error) {
    console.error("[digitacoes/caixa] Error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao salvar digitações do caixa." },
      { status: 500, headers: noStore },
    );
  }
}
