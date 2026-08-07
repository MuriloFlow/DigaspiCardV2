import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { removeRemarcacaoItem } from "@/lib/remarcacoes/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

function forbidden(msg = "Acesso negado.") {
  return NextResponse.json({ message: msg }, { status: 403, headers: noStore });
}

type RouteCtx = { params: Promise<{ id: string; itemId: string }> };

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const { id, itemId } = await ctx.params;
    const session = await getSession();
    if (!session) return forbidden("Sessão inválida.");

    await removeRemarcacaoItem(
      itemId,
      id,
      session.id,
      session.username,
    );

    return NextResponse.json({ success: true }, { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao remover item." },
      { status: 500, headers: noStore },
    );
  }
}
