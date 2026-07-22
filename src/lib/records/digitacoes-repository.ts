import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

export type Digitacao = {
  id: string;
  collaboratorId: string;
  operatorName: string;
  clientName: string;
  createdAt: string;
  storeId?: string;
  subRole?: string;
};

type DbDigitacao = {
  id: string;
  collaborator_id: string;
  operator_name: string;
  client_name: string;
  created_at: string;
  store_id: string;
  collaborators?: { sub_role?: string } | null;
};

function toDigitacao(row: DbDigitacao): Digitacao {
  return {
    id: row.id,
    collaboratorId: row.collaborator_id,
    operatorName: row.operator_name,
    clientName: row.client_name,
    createdAt: row.created_at,
    storeId: row.store_id,
    subRole: row.collaborators?.sub_role ?? undefined,
  };
}

export async function listDigitacoes(storeId?: string | null): Promise<Digitacao[]> {
  let query = supabaseAdmin
    .from("digitacoes")
    .select("*, collaborators(sub_role)")
    .order("created_at", { ascending: false });

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao carregar digitações: ${error.message}`);
  return (data as DbDigitacao[]).map(toDigitacao);
}

export async function createDigitacao(params: {
  collaboratorId: string;
  clientName: string;
  operatorName: string;
  storeId: string;
}): Promise<Digitacao> {
  const { data, error } = await supabaseAdmin
    .from("digitacoes")
    .insert({
      collaborator_id: params.collaboratorId,
      client_name: params.clientName.trim(),
      operator_name: params.operatorName,
      store_id: params.storeId,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Erro ao criar digitação: ${error.message}`);
  return toDigitacao(data as DbDigitacao);
}
