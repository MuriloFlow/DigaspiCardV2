import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { buildRecordsPayload } from "@/lib/records/domain";
import { createRecord, listRecords, deleteRecord, updateRecord } from "@/lib/records/repository";
import { listDigitacoes } from "@/lib/records/digitacoes-repository";
import { listDailyMetrics } from "@/lib/records/daily-metrics-repository";
import { listTrocas } from "@/lib/records/trocas-repository";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

function forbidden(msg = "Acesso negado.") {
  return NextResponse.json({ message: msg }, { status: 403, headers: noStore });
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return forbidden("Sessão inválida.");

    const url = new URL(request.url);
    const queryStoreId = url.searchParams.get("storeId");

    let storeId = (["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role)) ? null : session.storeId;
    if ((["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role)) && queryStoreId) {
      storeId = queryStoreId;
    }
    const [records, digitacoes, dailyMetrics, trocas] = await Promise.all([
      listRecords(storeId),
      listDigitacoes(storeId),
      listDailyMetrics(storeId),
      listTrocas(storeId)
    ]);
    return NextResponse.json(buildRecordsPayload(records, digitacoes, dailyMetrics, trocas), { headers: noStore });
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

    let storeId = (["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role)) ? null : session.storeId;
    
    // Para roles globais/regionais, permite pegar o storeId do body
    if (["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role)) {
      const parsedBody = body as { storeId?: string };
      if (parsedBody.storeId) {
        storeId = parsedBody.storeId;
      }
    }

    const record = await createRecord(body, storeId);
    
    const [records, digitacoes, dailyMetrics, trocas] = await Promise.all([
      listRecords(storeId),
      listDigitacoes(storeId),
      listDailyMetrics(storeId),
      listTrocas(storeId)
    ]);

    return NextResponse.json({ record, ...buildRecordsPayload(records, digitacoes, dailyMetrics, trocas) }, { status: 201, headers: noStore });
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

    await updateRecord(body.id, { 
      clientName: body.clientName, 
      activated: body.activated,
      amountInCents: body.amountInCents,
      amountUsedInCents: body.amountUsedInCents !== undefined ? body.amountUsedInCents : undefined
    });

    let storeId = (["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role)) ? null : session.storeId;
    if (["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role)) {
      const parsedBody = body as { storeId?: string };
      if (parsedBody.storeId) storeId = parsedBody.storeId;
    }
    const [records, digitacoes, dailyMetrics, trocas] = await Promise.all([
      listRecords(storeId),
      listDigitacoes(storeId),
      listDailyMetrics(storeId),
      listTrocas(storeId)
    ]);
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

    // EMPLOYEE não deleta
    if (session.role === "EMPLOYEE") {
      return forbidden("Sem permissão para deletar registros.");
    }

    let storeId = (["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role)) ? null : session.storeId;
    if (["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role)) {
      const queryStoreId = searchParams.get("storeId");
      if (queryStoreId) storeId = queryStoreId;
    }
    await deleteRecord(id, storeId);
    
    const [records, digitacoes, dailyMetrics, trocas] = await Promise.all([
      listRecords(storeId),
      listDigitacoes(storeId),
      listDailyMetrics(storeId),
      listTrocas(storeId)
    ]);
    return NextResponse.json(buildRecordsPayload(records, digitacoes, dailyMetrics, trocas), { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao deletar." },
      { status: 500, headers: noStore },
    );
  }
}
