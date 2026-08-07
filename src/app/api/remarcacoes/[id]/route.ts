import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession } from "@/lib/auth/session";
import {
  getRemarcacaoById,
  softDeleteRemarcacao,
} from "@/lib/remarcacoes/repository";
import { updateRemarcacaoStatusSchema } from "@/lib/remarcacoes/schema";
import { supabaseAdmin } from "@/lib/supabase/server";

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
      return NextResponse.json({ message: "Lote de Remarcação não encontrado." }, { status: 404, headers: noStore });
    }

    return NextResponse.json({ remarcacao }, { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao buscar lote." },
      { status: 500, headers: noStore },
    );
  }
}

// ── PATCH /api/remarcacoes/[id] — atualiza status ──────
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

    const payload = updateRemarcacaoStatusSchema.parse(body);

    const isGlobalOrRegional = ["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role);
    const storeId = isGlobalOrRegional ? null : session.storeId;

    const existing = await getRemarcacaoById(id, storeId);
    if (!existing) throw new Error("Lote não encontrado.");

    const { data, error } = await supabaseAdmin
      .from("remarcacoes")
      .update({ status: payload.status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar status: ${error.message}`);

    return NextResponse.json({ success: true, remarcacao: data }, { headers: noStore });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: error.issues.map((i) => ({ field: i.path.join("."), message: i.message })) },
        { status: 422, headers: noStore },
      );
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao atualizar status." },
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
      return forbidden("Sem permissão para deletar lotes.");
    }

    const isGlobalOrRegional = ["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role);
    const storeId = isGlobalOrRegional ? null : session.storeId;

    await softDeleteRemarcacao(id, storeId);
    return NextResponse.json({ success: true }, { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao deletar lote." },
      { status: 500, headers: noStore },
    );
  }
}
