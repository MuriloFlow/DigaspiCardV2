import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  createRecord,
  deleteRecord,
  getRecordById,
  updateRecord,
} from "@/lib/records/repository";
import { loadRecordsPayload } from "@/lib/records/payload";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };
const elevatedRoles = ["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"];
const managerRoles = ["MANAGER", ...elevatedRoles];

function forbidden(msg = "Acesso negado.") {
  return NextResponse.json({ message: msg }, { status: 403, headers: noStore });
}

function isElevatedRole(role: string) {
  return elevatedRoles.includes(role);
}

function scopedStoreId(
  role: string,
  sessionStoreId: string | null,
  requestedStoreId?: string | null,
) {
  return isElevatedRole(role) ? requestedStoreId ?? null : sessionStoreId;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return forbidden("Sessao invalida.");

    const url = new URL(request.url);
    const storeId = scopedStoreId(
      session.role,
      session.storeId,
      url.searchParams.get("storeId"),
    );

    return NextResponse.json(await loadRecordsPayload(storeId), { headers: noStore });
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
    return NextResponse.json({ message: "JSON invalido." }, { status: 400, headers: noStore });
  }

  try {
    const session = await getSession();
    if (!session) return forbidden("Sessao invalida.");

    const bodyStoreId =
      typeof body === "object" && body && "storeId" in body
        ? String((body as { storeId?: unknown }).storeId ?? "")
        : null;
    const storeId = scopedStoreId(
      session.role,
      session.storeId,
      bodyStoreId || null,
    );

    const record = await createRecord(body, storeId);

    return NextResponse.json(
      { record, ...(await loadRecordsPayload(storeId)) },
      { status: 201, headers: noStore },
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
        { status: 422, headers: noStore },
      );
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Nao foi possivel salvar o registro." },
      { status: 500, headers: noStore },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) return forbidden("Sessao invalida.");

    const body = await request.json();
    if (!body.id || typeof body.id !== "string") {
      return NextResponse.json(
        { message: "ID nao fornecido." },
        { status: 400, headers: noStore },
      );
    }

    const existingRecord = await getRecordById(body.id);
    if (!existingRecord) {
      return NextResponse.json(
        { message: "Registro nao encontrado." },
        { status: 404, headers: noStore },
      );
    }

    const isElevated = isElevatedRole(session.role);
    const isManagerOrAdmin = managerRoles.includes(session.role);
    const responseStoreId = isElevated
      ? typeof body.storeId === "string"
        ? body.storeId
        : existingRecord.storeId ?? null
      : session.storeId;

    if (!isElevated && existingRecord.storeId !== session.storeId) {
      return forbidden("Acesso negado: registro pertence a outra unidade.");
    }

    const updates: {
      clientName?: string;
      activated?: boolean;
      amountInCents?: number;
      amountUsedInCents?: number | null;
    } = {};

    if (typeof body.clientName === "string") {
      const clientName = body.clientName.trim();
      if (clientName.length < 2 || clientName.length > 80) {
        return NextResponse.json(
          { message: "Nome do cliente invalido." },
          { status: 422, headers: noStore },
        );
      }
      updates.clientName = clientName;
    }

    if (typeof body.activated === "boolean") {
      if (
        !isManagerOrAdmin &&
        existingRecord.amountUsedInCents &&
        body.activated === false
      ) {
        return forbidden("Cartao com valor utilizado so pode ser desativado por gerente.");
      }
      updates.activated = body.activated;
    }

    if (body.amountInCents !== undefined) {
      if (!isManagerOrAdmin) {
        return forbidden("Sem permissao para alterar valor do cartao.");
      }

      const amountInCents = Number(body.amountInCents);
      if (
        !Number.isInteger(amountInCents) ||
        amountInCents <= 0 ||
        amountInCents > 99_999_999
      ) {
        return NextResponse.json(
          { message: "Valor do cartao invalido." },
          { status: 422, headers: noStore },
        );
      }
      updates.amountInCents = amountInCents;
    }

    if (body.amountUsedInCents !== undefined) {
      if (!isManagerOrAdmin) {
        return forbidden("Sem permissao para alterar valor utilizado.");
      }

      const amountUsedInCents =
        body.amountUsedInCents === null ? null : Number(body.amountUsedInCents);
      if (
        amountUsedInCents !== null &&
        (!Number.isInteger(amountUsedInCents) || amountUsedInCents < 0)
      ) {
        return NextResponse.json(
          { message: "Valor utilizado invalido." },
          { status: 422, headers: noStore },
        );
      }
      updates.amountUsedInCents = amountUsedInCents;
    }

    await updateRecord(body.id, updates, responseStoreId);

    return NextResponse.json(
      { success: true, ...(await loadRecordsPayload(responseStoreId)) },
      { headers: noStore },
    );
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
  if (!id) {
    return NextResponse.json({ message: "ID obrigatorio." }, { status: 400, headers: noStore });
  }

  try {
    const session = await getSession();
    if (!session) return forbidden("Sessao invalida.");

    if (!managerRoles.includes(session.role)) {
      return forbidden("Sem permissao para deletar registros.");
    }

    const storeId = scopedStoreId(
      session.role,
      session.storeId,
      searchParams.get("storeId"),
    );
    await deleteRecord(id, storeId);

    return NextResponse.json(await loadRecordsPayload(storeId), { headers: noStore });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao deletar." },
      { status: 500, headers: noStore },
    );
  }
}
