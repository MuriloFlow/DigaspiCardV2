import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { DailySale, MonthlyGoal } from "./types";

type DbGoalRow = {
  id: string;
  store_id: string;
  date_key: string;
  goal: number;
  created_at: string;
};

const MONTH_CARDS_PREFIX = "month-cards:";
const MONTH_SALES_PREFIX = "month-sales:";
const DAILY_SALE_PREFIX = "daily-sale:";

export function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isValidMonthKey(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const [year, month] = value.split("-").map(Number);
  return year >= 2000 && year <= 2100 && month >= 1 && month <= 12;
}

function monthCardsKey(monthKey: string) {
  return `${MONTH_CARDS_PREFIX}${monthKey}`;
}

function monthSalesKey(monthKey: string) {
  return `${MONTH_SALES_PREFIX}${monthKey}`;
}

function dailySaleKey(dateKey: string) {
  return `${DAILY_SALE_PREFIX}${dateKey}`;
}

export async function listMonthlyGoals(storeId?: string | null): Promise<MonthlyGoal[]> {
  let cardsQuery = supabaseAdmin
    .from("daily_goals")
    .select("id, store_id, date_key, goal, created_at")
    .like("date_key", `${MONTH_CARDS_PREFIX}%`);

  let salesQuery = supabaseAdmin
    .from("daily_goals")
    .select("id, store_id, date_key, goal, created_at")
    .like("date_key", `${MONTH_SALES_PREFIX}%`);

  if (storeId) {
    cardsQuery = cardsQuery.eq("store_id", storeId);
    salesQuery = salesQuery.eq("store_id", storeId);
  }

  const [cardsResult, salesResult] = await Promise.all([cardsQuery, salesQuery]);
  if (cardsResult.error) {
    throw new Error(`Erro ao carregar metas de cartoes: ${cardsResult.error.message}`);
  }
  if (salesResult.error) {
    throw new Error(`Erro ao carregar metas de venda: ${salesResult.error.message}`);
  }

  const byMonth = new Map<string, MonthlyGoal>();

  for (const row of [
    ...((cardsResult.data ?? []) as DbGoalRow[]),
    ...((salesResult.data ?? []) as DbGoalRow[]),
  ]) {
    const isCardsGoal = row.date_key.startsWith(MONTH_CARDS_PREFIX);
    const isSalesGoal = row.date_key.startsWith(MONTH_SALES_PREFIX);
    const monthKey = isCardsGoal
      ? row.date_key.slice(MONTH_CARDS_PREFIX.length)
      : row.date_key.slice(MONTH_SALES_PREFIX.length);

    if (!isValidMonthKey(monthKey)) continue;

    const key = `${row.store_id}:${monthKey}`;
    const current = byMonth.get(key) ?? {
      id: key,
      storeId: row.store_id,
      monthKey,
      cardsGoal: null,
      salesGoalInCents: null,
      createdAt: row.created_at,
    };

    byMonth.set(key, {
      ...current,
      id: current.id === key ? row.id : current.id,
      cardsGoal: isCardsGoal ? row.goal : current.cardsGoal,
      salesGoalInCents: isSalesGoal ? row.goal : current.salesGoalInCents,
      createdAt:
        Date.parse(row.created_at) < Date.parse(current.createdAt)
          ? row.created_at
          : current.createdAt,
    });
  }

  return Array.from(byMonth.values()).sort((left, right) =>
    right.monthKey.localeCompare(left.monthKey),
  );
}

export async function listDailySales(storeId?: string | null): Promise<DailySale[]> {
  let query = supabaseAdmin
    .from("daily_goals")
    .select("id, store_id, date_key, goal, created_at")
    .like("date_key", `${DAILY_SALE_PREFIX}%`)
    .order("created_at", { ascending: false });

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao carregar vendas: ${error.message}`);

  return ((data ?? []) as DbGoalRow[])
    .map<DailySale | null>((row) => {
      const dateKey = row.date_key.slice(DAILY_SALE_PREFIX.length);
      if (!isValidDateKey(dateKey)) return null;

      return {
        id: row.id,
        storeId: row.store_id,
        dateKey,
        amountInCents: row.goal,
        createdAt: row.created_at,
      };
    })
    .filter((sale): sale is DailySale => sale !== null)
    .sort((left, right) => right.dateKey.localeCompare(left.dateKey));
}

export async function upsertMonthlyCardGoal(
  storeId: string,
  monthKey: string,
  cardsGoal: number,
) {
  if (!isValidMonthKey(monthKey)) throw new Error("Mes invalido.");
  if (!Number.isInteger(cardsGoal) || cardsGoal <= 0 || cardsGoal > 100_000) {
    throw new Error("Meta de cartoes invalida.");
  }

  const { error } = await supabaseAdmin.from("daily_goals").upsert(
    {
      store_id: storeId,
      date_key: monthCardsKey(monthKey),
      goal: cardsGoal,
    },
    { onConflict: "store_id, date_key" },
  );

  if (error) throw new Error(`Erro ao salvar meta de cartoes: ${error.message}`);
}

export async function deleteMonthlyCardGoal(storeId: string, monthKey: string) {
  if (!isValidMonthKey(monthKey)) throw new Error("Mes invalido.");

  const { error } = await supabaseAdmin
    .from("daily_goals")
    .delete()
    .eq("store_id", storeId)
    .eq("date_key", monthCardsKey(monthKey));

  if (error) throw new Error(`Erro ao apagar meta de cartoes: ${error.message}`);
}

export async function upsertMonthlySalesGoal(
  storeId: string,
  monthKey: string,
  salesGoalInCents: number,
) {
  if (!isValidMonthKey(monthKey)) throw new Error("Mes invalido.");
  if (
    !Number.isInteger(salesGoalInCents) ||
    salesGoalInCents <= 0 ||
    salesGoalInCents > 999_999_999_99
  ) {
    throw new Error("Meta de venda invalida.");
  }

  const { error } = await supabaseAdmin.from("daily_goals").upsert(
    {
      store_id: storeId,
      date_key: monthSalesKey(monthKey),
      goal: salesGoalInCents,
    },
    { onConflict: "store_id, date_key" },
  );

  if (error) throw new Error(`Erro ao salvar meta de venda: ${error.message}`);
}

export async function deleteMonthlySalesGoal(storeId: string, monthKey: string) {
  if (!isValidMonthKey(monthKey)) throw new Error("Mes invalido.");

  const { error } = await supabaseAdmin
    .from("daily_goals")
    .delete()
    .eq("store_id", storeId)
    .eq("date_key", monthSalesKey(monthKey));

  if (error) throw new Error(`Erro ao apagar meta de venda: ${error.message}`);
}

export async function upsertDailySale(
  storeId: string,
  dateKey: string,
  amountInCents: number,
) {
  if (!isValidDateKey(dateKey)) throw new Error("Data invalida.");
  if (
    !Number.isInteger(amountInCents) ||
    amountInCents < 0 ||
    amountInCents > 999_999_999_99
  ) {
    throw new Error("Valor de venda invalido.");
  }

  const { data, error } = await supabaseAdmin
    .from("daily_goals")
    .upsert(
      {
        store_id: storeId,
        date_key: dailySaleKey(dateKey),
        goal: amountInCents,
      },
      { onConflict: "store_id, date_key" },
    )
    .select("id, store_id, date_key, goal, created_at")
    .single();

  if (error) throw new Error(`Erro ao salvar venda do dia: ${error.message}`);

  return {
    id: data.id,
    storeId: data.store_id,
    dateKey,
    amountInCents: data.goal,
    createdAt: data.created_at,
  } satisfies DailySale;
}
