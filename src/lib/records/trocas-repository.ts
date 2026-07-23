import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

export type Troca = {
  id: string;
  storeId: string;
  managerId: string;
  managerName: string;
  dateKey: string;
  createdAt: string;
};

type DbTroca = {
  id: string;
  store_id: string;
  manager_id: string;
  manager_name: string;
  date_key: string;
  created_at: string;
};

function toTroca(row: DbTroca): Troca {
  return {
    id: row.id,
    storeId: row.store_id,
    managerId: row.manager_id,
    managerName: row.manager_name,
    dateKey: row.date_key,
    createdAt: row.created_at,
  };
}

export async function listTrocas(storeId?: string | null, dateKey?: string | null): Promise<Troca[]> {
  let query = supabaseAdmin
    .from("trocas")
    .select("*")
    .order("created_at", { ascending: false });

  if (storeId) query = query.eq("store_id", storeId);
  if (dateKey) query = query.eq("date_key", dateKey);

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return []; // table doesn't exist yet
    throw new Error(`Erro ao carregar trocas: ${error.message}`);
  }
  return (data as DbTroca[]).map(toTroca);
}

export async function createTroca(params: {
  storeId: string;
  managerId: string;
  managerName: string;
  dateKey: string;
}): Promise<Troca> {
  const { data, error } = await supabaseAdmin
    .from("trocas")
    .insert({
      store_id: params.storeId,
      manager_id: params.managerId,
      manager_name: params.managerName,
      date_key: params.dateKey,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "42P01") {
      throw new Error("A tabela trocas ainda não foi criada. Execute o SQL create-trocas-table.sql no Supabase.");
    }
    throw new Error(`Erro ao registrar troca: ${error.message}`);
  }
  return toTroca(data as DbTroca);
}

export async function deleteTroca(id: string, storeId?: string | null): Promise<void> {
  let query = supabaseAdmin.from("trocas").delete().eq("id", id);
  if (storeId) query = query.eq("store_id", storeId);
  const { error } = await query;
  if (error) throw new Error(`Erro ao deletar troca: ${error.message}`);
}
