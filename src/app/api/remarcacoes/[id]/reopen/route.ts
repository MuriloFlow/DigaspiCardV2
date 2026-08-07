import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { reopenRemarcacao } from "@/lib/remarcacoes/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

function forbidden(msg = "Acesso negado.") {
  return NextResponse.json({ message: msg }, { status: 403, headers: noStore });
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return forbidden("Sessão inválida.");

    // Apenas gerentes, TI e Global Admins podem reabrir
    const allowedRoles = ["MANAGER", "REGIONAL_MANAGER", "TI_ADMIN", "GLOBAL_ADMIN"];
    if (!allowedRoles.includes(session.role)) {
      return forbidden("Sem permissão para reabrir remarcações.");
    }

    const isGlobalOrRegional = ["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role);
    const storeId = isGlobalOrRegional ? null : session.storeId;

    const reopened = await reopenRemarcacao(
      id,
      storeId,
      session.id,
      session.username,
    );

    return NextResponse.json({ remarcacao: reopened }, { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao reabrir remarcação." },
      { status: 500, headers: noStore },
    );
  }
}
