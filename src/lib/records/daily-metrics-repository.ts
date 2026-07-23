import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { DailyMetric } from "./types";

type DbDailyMetric = {
  id: string;
  store_id: string;
  date_key: string;
  total_customers: number;
  total_trocas?: number;
  created_at: string;
};

function toDailyMetric(row: DbDailyMetric): DailyMetric {
  return {
    id: row.id,
    storeId: row.store_id,
    dateKey: row.date_key,
    totalCustomers: row.total_customers,
    totalTrocas: row.total_trocas ?? 0,
    createdAt: row.created_at,
  };
}

export async function listDailyMetrics(storeId?: string | null): Promise<DailyMetric[]> {
  let query = supabaseAdmin
    .from("daily_metrics")
    .select("*")
    .order("date_key", { ascending: false });

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  const { data, error } = await query;
  
  if (error) {
    // If the table doesn't exist yet, return empty array to not break the app
    if (error.code === '42P01') return [];
    throw new Error(`Erro ao carregar métricas diárias: ${error.message}`);
  }
  
  return (data as DbDailyMetric[]).map(toDailyMetric);
}

export async function upsertDailyMetric(
  storeId: string,
  dateKey: string,
  totalCustomers: number
): Promise<DailyMetric> {
  const { data, error } = await supabaseAdmin
    .from("daily_metrics")
    .upsert(
      {
        store_id: storeId,
        date_key: dateKey,
        total_customers: totalCustomers,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'store_id, date_key' }
    )
    .select("*")
    .single();

  if (error) {
    if (error.code === '42P01') {
      throw new Error("A tabela daily_metrics ainda não foi criada no banco de dados.");
    }
    throw new Error(`Erro ao salvar métrica diária: ${error.message}`);
  }
  
  return toDailyMetric(data as DbDailyMetric);
}
