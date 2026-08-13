import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { upsertDailyMetric } from "@/lib/records/daily-metrics-repository";
import { isValidDateKey } from "@/lib/records/planning-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };
const elevatedRoles = ["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"];
const allowedRoles = ["MANAGER", ...elevatedRoles];

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !allowedRoles.includes(session.role)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403, headers: noStore });
    }

    const body = (await request.json()) as {
      dateKey?: string;
      totalCustomers?: number;
      storeId?: string;
    };

    if (
      !body.dateKey ||
      !isValidDateKey(body.dateKey) ||
      typeof body.totalCustomers !== "number" ||
      !Number.isInteger(body.totalCustomers) ||
      body.totalCustomers < 0 ||
      body.totalCustomers > 200_000
    ) {
      return NextResponse.json({ message: "Dados invalidos." }, { status: 400, headers: noStore });
    }

    const storeId = elevatedRoles.includes(session.role) ? body.storeId : session.storeId;
    if (!storeId) {
      return NextResponse.json({ message: "Loja nao identificada." }, { status: 400, headers: noStore });
    }

    const metric = await upsertDailyMetric(storeId, body.dateKey, body.totalCustomers);

    return NextResponse.json({ metric, success: true }, { status: 201, headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao salvar metricas diarias." },
      { status: 500, headers: noStore },
    );
  }
}
