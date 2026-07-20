import { NextResponse } from "next/server";
import { getGlobalMetrics, getStoreMetrics } from "@/lib/records/repository";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "GLOBAL_ADMIN") {
      return NextResponse.json({ message: "Acesso restrito ao Admin Global." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (storeId) {
      const metrics = await getStoreMetrics(storeId);
      return NextResponse.json(metrics, { headers: noStore });
    }

    const metrics = await getGlobalMetrics();
    return NextResponse.json(metrics, { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao carregar métricas." },
      { status: 500, headers: noStore },
    );
  }
}
