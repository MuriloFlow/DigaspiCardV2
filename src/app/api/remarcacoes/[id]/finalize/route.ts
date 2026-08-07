import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession } from "@/lib/auth/session";
import { finalizeRemarcacao } from "@/lib/remarcacoes/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

function forbidden(msg = "Acesso negado.") {
  return NextResponse.json({ message: msg }, { status: 403, headers: noStore });
}

type RouteCtx = { params: Promise<{ id: string }> };

// ── POST /api/remarcacoes/[id]/finalize ──────────────────────
export async function POST(request: Request, ctx: RouteCtx) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400, headers: noStore });
  }

  try {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return forbidden("Sessão inválida.");

    // Apenas gerentes e acima podem assinar
    if (!["MANAGER", "TI_ADMIN", "REGIONAL_MANAGER", "GLOBAL_ADMIN"].includes(session.role)) {
      return forbidden("Apenas gerentes podem finalizar remarcações.");
    }

    const isGlobalOrRegional = ["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role);
    const storeId = isGlobalOrRegional ? null : session.storeId;

    const finalized = await finalizeRemarcacao(
      id,
      body,
      storeId,
      session.id,
      session.username,
    );

    return NextResponse.json({ remarcacao: finalized }, { headers: noStore });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: error.issues.map((i) => ({ field: i.path.join("."), message: i.message })) },
        { status: 422, headers: noStore },
      );
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao finalizar remarcação." },
      { status: 500, headers: noStore },
    );
  }
}
