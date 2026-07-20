import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { buildRecordsPayload } from "@/lib/records/domain";
import { createRecord, listRecords, deleteRecord, updateRecord } from "@/lib/records/repository";
import { getSession } from "@/lib/auth/session";

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

    const records = await listRecords(session.role === "GLOBAL_ADMIN" ? null : session.storeId);
    return NextResponse.json(buildRecordsPayload(records), { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao carregar registros." },
      { status: 500, headers: noStore },
    );
  }
}

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

    // storeId vem SEMPRE do JWT — nunca do body do cliente
    const storeId = session.role === "GLOBAL_ADMIN" ? null : session.storeId;

    const record = await createRecord(body, storeId);
    const records = await listRecords(storeId);

    return NextResponse.json({ record, ...buildRecordsPayload(records) }, { status: 201, headers: noStore });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: error.issues.map((i) => ({ field: i.path.join("."), message: i.message })) },
        { status: 422, headers: noStore },
      );
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Não foi possível salvar o registro." },
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

    await updateRecord(body.id, { clientName: body.clientName, activated: body.activated });

    const storeId = session.role === "GLOBAL_ADMIN" ? null : session.storeId;
    const records = await listRecords(storeId);
    return NextResponse.json({ records, success: true }, { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao atualizar." },
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

    // EMPLOYEE não pode deletar
    if (session.role === "EMPLOYEE") return forbidden("Sem permissão para deletar registros.");

    const storeId = session.role === "GLOBAL_ADMIN" ? null : session.storeId;
    await deleteRecord(id, storeId);
    const records = await listRecords(storeId);
    return NextResponse.json(buildRecordsPayload(records), { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao deletar." },
      { status: 500, headers: noStore },
    );
  }
}
