import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createViradaPu } from "@/lib/records/viradas-pu-repository";
import { toDateKey } from "@/lib/utils/format";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { collaboratorId, collaboratorName, storeId } = body;

    if (!collaboratorId || !collaboratorName) {
      return NextResponse.json({ message: "Colaborador inválido" }, { status: 400 });
    }

    // Define store_id: Se admin global, pode passar storeId, senão usa do session
    const finalStoreId =
      ["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role) && storeId
        ? storeId
        : session.storeId;

    if (!finalStoreId) {
      return NextResponse.json({ message: "Loja não identificada" }, { status: 400 });
    }

    const dateKey = toDateKey(new Date().toISOString());

    const viradaPu = await createViradaPu({
      storeId: finalStoreId,
      collaboratorId,
      collaboratorName,
      dateKey,
    });

    return NextResponse.json({ viradaPu });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}
