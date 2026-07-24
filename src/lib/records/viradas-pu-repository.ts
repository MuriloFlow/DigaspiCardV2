import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

export type ViradaPu = {
  id: string;
  storeId: string;
  collaboratorId: string;
  collaboratorName: string;
  dateKey: string;
  createdAt: string;
};

type DbViradaPu = {
  id: string;
  store_id: string;
  collaborator_id: string;
  collaborator_name: string;
  date_key: string;
  created_at: string;
};

export async function createViradaPu(data: {
  storeId: string;
  collaboratorId: string;
  collaboratorName: string;
  dateKey: string;
}): Promise<ViradaPu> {
  const { data: inserted, error } = await supabaseAdmin
    .from("viradas_pu")
    .insert({
      store_id: data.storeId,
      collaborator_id: data.collaboratorId,
      collaborator_name: data.collaboratorName,
      date_key: data.dateKey,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    id: inserted.id,
    storeId: inserted.store_id,
    collaboratorId: inserted.collaborator_id,
    collaboratorName: inserted.collaborator_name,
    dateKey: inserted.date_key,
    createdAt: inserted.created_at,
  };
}

export async function listViradasPu(storeId?: string | null, dateKey?: string | null): Promise<ViradaPu[]> {
  let query = supabaseAdmin
    .from("viradas_pu")
    .select("*")
    .order("created_at", { ascending: false });

  if (storeId) query = query.eq("store_id", storeId);
  if (dateKey) query = query.eq("date_key", dateKey);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data as DbViradaPu[]).map((d) => ({
    id: d.id,
    storeId: d.store_id,
    collaboratorId: d.collaborator_id,
    collaboratorName: d.collaborator_name,
    dateKey: d.date_key,
    createdAt: d.created_at,
  }));
}
