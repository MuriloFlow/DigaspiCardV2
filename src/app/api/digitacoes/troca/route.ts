import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createTroca, listTrocas } from "@/lib/records/trocas-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

function forbidden(msg = "Acesso negado.") {
  return NextResponse.json({ message: msg }, { status: 403, headers: noStore });
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return forbidden("Sessão inválida.");

    const url = new URL(request.url);
    const queryStoreId = url.searchParams.get("storeId");
    const queryDateKey = url.searchParams.get("dateKey");

    let storeId = (["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role)) ? null : session.storeId;
    if (["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role) && queryStoreId) {
      storeId = queryStoreId;
    }

    const trocas = await listTrocas(storeId, queryDateKey || null);
    return NextResponse.json({ trocas }, { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao carregar trocas." },
      { status: 500, headers: noStore },
    );
  }
}

export async function POST(request: Request) {
  let body: { storeId?: string; managerId?: string; dateKey?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400, headers: noStore });
  }

  try {
    const session = await getSession();
    if (!session) return forbidden("Sessão inválida.");

    if (!["MANAGER", "GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role)) {
      return forbidden("Apenas gerentes podem registrar trocas.");
    }

    let storeId = (["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role)) ? null : session.storeId;
    if (["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role)) {
      if (body.storeId) storeId = body.storeId;
    }

    if (!storeId) return forbidden("Selecione uma loja para registrar a Troca.");

    if (!body.managerId) return forbidden("Nenhum gerente selecionado.");

    const { data: managerData, error: managerError } = await supabaseAdmin
      .from("app_users")
      .select("id, name, username, role, store_id, is_active")
      .eq("id", body.managerId)
      .in("role", ["MANAGER", "VM"])
      .eq("is_active", true)
      .single();

    if (managerError || !managerData) {
      return NextResponse.json({ message: "Gerente não encontrado no sistema." }, { status: 404, headers: noStore });
    }
    const managerName = managerData.name || managerData.username || "Gerente Desconhecido";
    const dateKey = body.dateKey || toDateKey(new Date());

    const troca = await createTroca({ storeId, managerId: body.managerId, managerName, dateKey });

    // Update daily_metrics total_trocas
    try {
      const { data: existingMetric } = await supabaseAdmin
        .from("daily_metrics")
        .select("id, total_trocas")
        .eq("store_id", storeId)
        .eq("date_key", dateKey)
        .maybeSingle();

      if (existingMetric) {
        await supabaseAdmin
          .from("daily_metrics")
          .update({ total_trocas: (existingMetric.total_trocas ?? 0) + 1 })
          .eq("id", existingMetric.id);
      } else {
        await supabaseAdmin
          .from("daily_metrics")
          .insert({ store_id: storeId, date_key: dateKey, total_customers: 0, total_trocas: 1 });
      }
    } catch {
      // Silently ignore if daily_metrics column doesn't exist yet
    }

    const trocas = await listTrocas(storeId, dateKey);
    return NextResponse.json({ success: true, troca, trocas }, { status: 201, headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao registrar troca." },
      { status: 500, headers: noStore },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) return forbidden("Sessão inválida.");

    if (!["MANAGER", "GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role)) {
      return forbidden("Sem permissão para deletar trocas.");
    }

    const url = new URL(request.url);
    const trocaId = url.searchParams.get("id");
    if (!trocaId) {
      return NextResponse.json({ message: "ID da troca não informado." }, { status: 400, headers: noStore });
    }

    const { deleteTroca } = await import("@/lib/records/trocas-repository");
    const storeId = (["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role)) ? null : session.storeId;
    await deleteTroca(trocaId, storeId);

    return NextResponse.json({ success: true }, { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao deletar troca." },
      { status: 500, headers: noStore },
    );
  }
}
