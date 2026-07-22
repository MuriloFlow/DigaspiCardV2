import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  listDigitacoes,
  createDigitacao,
  deleteDigitacao,
  updateDigitacao,
} from "@/lib/records/digitacoes-repository";
import { listCollaborators } from "@/lib/records/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

function forbidden(msg = "Acesso negado.") {
  return NextResponse.json({ message: msg }, { status: 403, headers: noStore });
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return forbidden("Sessão inválida.");

    const storeId = session.role === "GLOBAL_ADMIN" ? null : session.storeId;
    const digitacoes = await listDigitacoes(storeId);
    return NextResponse.json({ digitacoes }, { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao carregar digitações." },
      { status: 500, headers: noStore },
    );
  }
}

export async function POST(request: Request) {
  let body: { collaboratorId?: string; clientName?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400, headers: noStore });
  }

  try {
    const session = await getSession();
    if (!session) return forbidden("Sessão inválida.");
    if (!session.storeId) return forbidden("Admin global não pode registrar digitações diretamente.");

    const { collaboratorId, clientName } = body;
    if (!collaboratorId || !clientName?.trim()) {
      return NextResponse.json(
        { message: "collaboratorId e clientName são obrigatórios." },
        { status: 422, headers: noStore },
      );
    }

    // Busca o nome do colaborador para gravar operatorName
    const collabs = await listCollaborators(session.storeId);
    const collab = collabs.find((c) => c.id === collaboratorId);
    if (!collab) {
      return NextResponse.json({ message: "Colaborador não encontrado." }, { status: 404, headers: noStore });
    }

    const digitacao = await createDigitacao({
      collaboratorId,
      clientName: clientName.trim(),
      operatorName: collab.name,
      storeId: session.storeId,
    });

    const digitacoes = await listDigitacoes(session.storeId);
    return NextResponse.json({ digitacao, digitacoes }, { status: 201, headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao salvar digitação." },
      { status: 500, headers: noStore },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) return forbidden("Sessão inválida.");

    const body = await request.json();
    if (!body.id) return NextResponse.json({ message: "ID não fornecido." }, { status: 400 });

    await updateDigitacao(body.id, { clientName: body.clientName });

    const storeId = session.role === "GLOBAL_ADMIN" ? null : session.storeId;
    const digitacoes = await listDigitacoes(storeId);
    return NextResponse.json({ digitacoes, success: true }, { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao atualizar digitação." },
      { status: 400, headers: noStore },
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ message: "ID obrigatório." }, { status: 400, headers: noStore });

  try {
    const session = await getSession();
    if (!session) return forbidden("Sessão inválida.");

    if (session.role === "EMPLOYEE") return forbidden("Sem permissão para deletar registros.");

    const storeId = session.role === "GLOBAL_ADMIN" ? null : session.storeId;
    await deleteDigitacao(id, storeId);
    
    const digitacoes = await listDigitacoes(storeId);
    return NextResponse.json({ digitacoes, success: true }, { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao deletar digitação." },
      { status: 500, headers: noStore },
    );
  }
}
