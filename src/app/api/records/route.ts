import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { buildRecordsPayload } from "@/lib/records/domain";
import { createRecord, listRecords, deleteRecord, updateRecord } from "@/lib/records/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
  try {
    const records = await listRecords();

    return NextResponse.json(buildRecordsPayload(records), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao carregar registros." },
      { status: 500, headers: noStoreHeaders },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "JSON invalido. Revise os dados enviados." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  try {
    const record = await createRecord(body);
    const records = await listRecords();

    return NextResponse.json(
      {
        record,
        ...buildRecordsPayload(records),
      },
      { status: 201, headers: noStoreHeaders },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "Dados invalidos.",
          errors: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 422, headers: noStoreHeaders },
      );
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Nao foi possivel salvar o registro agora." },
      { status: 500, headers: noStoreHeaders },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ message: "ID não fornecido." }, { status: 400 });
    }
    await updateRecord(body.id, { clientName: body.clientName, activated: body.activated });
    
    // Atualiza cache e revalida
    const records = await listRecords();
    return NextResponse.json({ records, success: true }, { headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro desconhecido." },
      { status: 400, headers: noStoreHeaders }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { message: "ID do registro é obrigatório." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  try {
    await deleteRecord(id);
    const records = await listRecords();

    return NextResponse.json(buildRecordsPayload(records), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao deletar registro." },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
