import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession } from "@/lib/auth/session";
import {
  getRemarcacaoById,
  updateRemarcacao,
  softDeleteRemarcacao,
} from "@/lib/remarcacoes/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

function forbidden(msg = "Acesso negado.") {
  return NextResponse.json({ message: msg }, { status: 403, headers: noStore });
}

type RouteCtx = { params: Promise<{ id: string }> };

// ── GET /api/remarcacoes/[id] — carrega TUDO (inclui base64) ─
export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return forbidden("Sessão inválida.");

    const isGlobalOrRegional = ["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role);
    const storeId = isGlobalOrRegional ? null : session.storeId;

    const remarcacao = await getRemarcacaoById(id, storeId);
    if (!remarcacao) {
      return NextResponse.json({ message: "Remarcação não encontrada." }, { status: 404, headers: noStore });
    }

    return NextResponse.json({ remarcacao }, { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao buscar remarcação." },
      { status: 500, headers: noStore },
    );
  }
}

// ── PATCH /api/remarcacoes/[id] — auto-save incremental ──────
// Aceita labelPhotoB64 e outros campos diretamente como base64
export async function PATCH(request: Request, ctx: RouteCtx) {
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

    const isGlobalOrRegional = ["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role);
    const storeId = isGlobalOrRegional ? null : session.storeId;

    const updated = await updateRemarcacao(
      id,
      body,
      storeId,
      session.id,
      session.username,
    );

    return NextResponse.json({ remarcacao: updated }, { headers: noStore });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: error.issues.map((i) => ({ field: i.path.join("."), message: i.message })) },
        { status: 422, headers: noStore },
      );
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao atualizar remarcação." },
      { status: 500, headers: noStore },
    );
  }
}

// ── DELETE /api/remarcacoes/[id] — soft delete ───────────────
export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const session = await getSession();
    if (!session) return forbidden("Sessão inválida.");

    if (session.role === "EMPLOYEE") {
      return forbidden("Sem permissão para deletar remarcações.");
    }

    const isGlobalOrRegional = ["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role);
    const storeId = isGlobalOrRegional ? null : session.storeId;

    await softDeleteRemarcacao(id, storeId);
    return NextResponse.json({ success: true }, { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao deletar remarcação." },
      { status: 500, headers: noStore },
    );
  }
}
