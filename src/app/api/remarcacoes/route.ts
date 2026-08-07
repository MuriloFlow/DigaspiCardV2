import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession } from "@/lib/auth/session";
import {
  listRemarcacoes,
  createRemarcacao,
} from "@/lib/remarcacoes/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

function forbidden(msg = "Acesso negado.") {
  return NextResponse.json({ message: msg }, { status: 403, headers: noStore });
}

// ── GET /api/remarcacoes ─────────────────────────────────────
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return forbidden("Sessão inválida.");

    const url = new URL(request.url);
    const queryStoreId = url.searchParams.get("storeId");

    const isGlobalOrRegional = ["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role);
    let storeId: string | null = isGlobalOrRegional ? null : session.storeId;
    if (isGlobalOrRegional && queryStoreId) storeId = queryStoreId;

    const remarcacoes = await listRemarcacoes(storeId);
    return NextResponse.json({ remarcacoes }, { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao carregar remarcações." },
      { status: 500, headers: noStore },
    );
  }
}

// ── POST /api/remarcacoes ────────────────────────────────────
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400, headers: noStore });
  }

  try {
    const session = await getSession();
    if (!session) return forbidden("Sessão inválida.");
    if (session.role === "GLOBAL_ADMIN") {
      return forbidden("Administradores globais não registram remarcações diretamente.");
    }

    const isGlobalOrRegional = ["TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role);
    let storeId: string | null = isGlobalOrRegional ? null : session.storeId;

    // Extrai storeId do body para roles que podem escolher a loja
    const parsedBody = body as Record<string, unknown>;
    if (isGlobalOrRegional && parsedBody.storeId) {
      storeId = parsedBody.storeId as string;
    }

    if (!storeId) return forbidden("Unidade não identificada. Selecione uma unidade.");

    // Garante que o storeId no body bate com o da sessão (segurança)
    const inputWithStore = { ...parsedBody, storeId };

    const remarcacao = await createRemarcacao(
      inputWithStore,
      session.id,
      session.username,
    );

    return NextResponse.json({ remarcacao }, { status: 201, headers: noStore });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: error.issues.map((i) => ({ field: i.path.join("."), message: i.message })) },
        { status: 422, headers: noStore },
      );
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Não foi possível criar a remarcação." },
      { status: 500, headers: noStore },
    );
  }
}
