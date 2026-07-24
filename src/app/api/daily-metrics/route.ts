import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { upsertDailyMetric } from "@/lib/records/daily-metrics-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !["MANAGER", "GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }

    // We can't await request.json() twice. Read it once.
    const body = await request.json();
    const { dateKey, totalCustomers, storeId: payloadStoreId } = body;

    if (!dateKey || typeof totalCustomers !== "number" || totalCustomers < 0) {
      return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
    }

    const storeId = (["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role)) ? payloadStoreId : session.storeId;
    
    if (!storeId) {
       return NextResponse.json({ message: "Loja não identificada." }, { status: 400 });
    }

    const metric = await upsertDailyMetric(storeId, dateKey, totalCustomers);
    
    return NextResponse.json({ metric, success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao salvar métricas diárias." },
      { status: 500 }
    );
  }
}
