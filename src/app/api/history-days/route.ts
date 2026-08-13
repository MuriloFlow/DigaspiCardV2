import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { upsertDailyMetric } from "@/lib/records/daily-metrics-repository";
import { loadRecordsPayload } from "@/lib/records/payload";
import { isValidDateKey } from "@/lib/records/planning-repository";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };
const allowedRoles = ["GLOBAL_ADMIN", "TI_ADMIN"];

class DuplicateHistoryDayError extends Error {}

function forbidden(msg = "Acesso negado.") {
  return NextResponse.json({ message: msg }, { status: 403, headers: noStore });
}

function getNextDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  return date.toISOString().slice(0, 10);
}

function isOptionalTableError(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "42703" || error?.code === "PGRST204";
}

async function assertNoExistingHistoryDay(storeId: string, dateKey: string) {
  const nextDateKey = getNextDateKey(dateKey);
  const start = `${dateKey}T00:00:00.000Z`;
  const end = `${nextDateKey}T00:00:00.000Z`;

  const checks = await Promise.all([
    supabaseAdmin
      .from("daily_metrics")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("date_key", dateKey),
    supabaseAdmin
      .from("records")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .gte("created_at", start)
      .lt("created_at", end),
    supabaseAdmin
      .from("digitacoes")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .gte("created_at", start)
      .lt("created_at", end),
    supabaseAdmin
      .from("trocas")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("date_key", dateKey),
    supabaseAdmin
      .from("viradas_pu")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("date_key", dateKey),
    supabaseAdmin
      .from("daily_goals")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("date_key", `daily-sale:${dateKey}`),
  ]);

  for (const check of checks) {
    if (check.error && !isOptionalTableError(check.error)) {
      throw new Error(`Erro ao verificar dia existente: ${check.error.message}`);
    }

    if ((check.count ?? 0) > 0) {
      throw new DuplicateHistoryDayError(
        "Este dia ja existe no historico. Nao e possivel inserir o mesmo dia novamente.",
      );
    }
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return forbidden("Sessao invalida.");
    if (!allowedRoles.includes(session.role)) {
      return forbidden("Apenas Administrador Global ou Dev TI pode inserir dias vazios.");
    }

    const body = (await request.json()) as { dateKey?: string; storeId?: string };
    if (!body.dateKey || !isValidDateKey(body.dateKey)) {
      return NextResponse.json({ message: "Data invalida." }, { status: 422, headers: noStore });
    }

    const storeId = typeof body.storeId === "string" && body.storeId.trim()
      ? body.storeId.trim()
      : null;
    if (!storeId) {
      return forbidden("Selecione uma unidade antes de inserir o dia.");
    }

    await assertNoExistingHistoryDay(storeId, body.dateKey);
    await upsertDailyMetric(storeId, body.dateKey, 0);

    return NextResponse.json(
      { success: true, ...(await loadRecordsPayload(storeId)) },
      { status: 201, headers: noStore },
    );
  } catch (error) {
    if (error instanceof DuplicateHistoryDayError) {
      return NextResponse.json({ message: error.message }, { status: 409, headers: noStore });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao inserir dia." },
      { status: 500, headers: noStore },
    );
  }
}
