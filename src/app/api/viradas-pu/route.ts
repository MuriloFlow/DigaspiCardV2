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
    const { collaboratorId, collaboratorName, storeId, dateKey: bodyDateKey } = body;

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

    const dateKey = bodyDateKey || toDateKey(new Date().toISOString());

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

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const canDelete = ["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER", "MANAGER"].includes(session.role);
    if (!canDelete) {
      return NextResponse.json({ message: "Sem permissão" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "ID não fornecido" }, { status: 400 });
    }

    const { deleteViradaPu } = await import("@/lib/records/viradas-pu-repository");
    await deleteViradaPu(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}
