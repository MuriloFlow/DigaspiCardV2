import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession } from "@/lib/auth/session";
import { addRemarcacaoItem } from "@/lib/remarcacoes/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

function forbidden(msg = "Acesso negado.") {
  return NextResponse.json({ message: msg }, { status: 403, headers: noStore });
}

type RouteCtx = { params: Promise<{ id: string }> };

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

    // O corpo da requisição já deve ter os dados do item
    // Forçamos o remarcacaoId a ser o id da URL
    const payload = { ...(body as Record<string, unknown>), remarcacaoId: id };

    const item = await addRemarcacaoItem(
      payload,
      session.id,
      session.username,
    );

    return NextResponse.json({ item }, { status: 201, headers: noStore });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: error.issues.map((i) => ({ field: i.path.join("."), message: i.message })) },
        { status: 422, headers: noStore },
      );
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao adicionar item." },
      { status: 500, headers: noStore },
    );
  }
}
