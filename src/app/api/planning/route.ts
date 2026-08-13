import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { loadRecordsPayload } from "@/lib/records/payload";
import {
  deleteMonthlyCardGoal,
  deleteMonthlySalesGoal,
  isValidDateKey,
  isValidMonthKey,
  upsertDailySale,
  upsertMonthlyCardGoal,
  upsertMonthlySalesGoal,
} from "@/lib/records/planning-repository";

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

function resolveStoreId(role: string, sessionStoreId: string | null, bodyStoreId?: unknown) {
  if (isElevatedRole(role)) {
    return typeof bodyStoreId === "string" && bodyStoreId.trim()
      ? bodyStoreId.trim()
      : null;
  }

  return sessionStoreId;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return forbidden("Sessao invalida.");
    if (!managerRoles.includes(session.role)) {
      return forbidden("Sem permissao para alterar metas ou vendas.");
    }

    const body = (await request.json()) as {
      action?: string;
      storeId?: string;
      monthKey?: string;
      dateKey?: string;
      cardsGoal?: number;
      salesGoalInCents?: number;
      amountInCents?: number;
    };

    const storeId = resolveStoreId(session.role, session.storeId, body.storeId);
    if (!storeId) return forbidden("Selecione uma unidade antes de continuar.");

    if (body.action === "monthly-cards-goal") {
      if (!body.monthKey || !isValidMonthKey(body.monthKey)) {
        return NextResponse.json({ message: "Mes invalido." }, { status: 422, headers: noStore });
      }
      const cardsGoal = Number(body.cardsGoal);
      if (!Number.isFinite(cardsGoal)) {
        return NextResponse.json({ message: "Meta de cartoes invalida." }, { status: 422, headers: noStore });
      }
      if (cardsGoal <= 0) {
        await deleteMonthlyCardGoal(storeId, body.monthKey);
      } else {
        await upsertMonthlyCardGoal(storeId, body.monthKey, cardsGoal);
      }
    } else if (body.action === "monthly-sales-goal") {
      if (!body.monthKey || !isValidMonthKey(body.monthKey)) {
        return NextResponse.json({ message: "Mes invalido." }, { status: 422, headers: noStore });
      }
      const salesGoalInCents = Number(body.salesGoalInCents);
      if (!Number.isFinite(salesGoalInCents)) {
        return NextResponse.json({ message: "Meta de venda invalida." }, { status: 422, headers: noStore });
      }
      if (salesGoalInCents <= 0) {
        await deleteMonthlySalesGoal(storeId, body.monthKey);
      } else {
        await upsertMonthlySalesGoal(storeId, body.monthKey, salesGoalInCents);
      }
    } else if (body.action === "daily-sale") {
      if (!body.dateKey || !isValidDateKey(body.dateKey)) {
        return NextResponse.json({ message: "Data invalida." }, { status: 422, headers: noStore });
      }
      await upsertDailySale(storeId, body.dateKey, Number(body.amountInCents));
    } else {
      return NextResponse.json({ message: "Acao invalida." }, { status: 400, headers: noStore });
    }

    return NextResponse.json(
      { success: true, ...(await loadRecordsPayload(storeId)) },
      { headers: noStore },
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro ao salvar planejamento." },
      { status: 500, headers: noStore },
    );
  }
}
