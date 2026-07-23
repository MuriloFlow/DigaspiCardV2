import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  getDigitacaoQuantity as getDigitacaoQuantityValue,
  sumDigitacoes as sumDigitacoesValues,
} from "./digitacoes-utils";

export type Digitacao = {
  id: string;
  collaboratorId: string;
  operatorName: string;
  clientName: string;
  quantity: number;
  createdAt: string;
  storeId?: string;
  subRole?: string;
};

type DbDigitacao = {
  id: string;
  collaborator_id: string;
  operator_name: string;
  client_name: string;
  quantity?: number | null;
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
    quantity: getDigitacaoQuantityValue(row),
    createdAt: row.created_at,
    storeId: row.store_id,
    subRole: row.collaborators?.sub_role ?? undefined,
  };
}

function isMissingQuantityColumn(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    error.message?.toLowerCase().includes("quantity") === true
  );
}

export function getDigitacaoQuantity(digitacao: Pick<Digitacao, "quantity">) {
  return getDigitacaoQuantityValue(digitacao);
}

export function sumDigitacoes(digitacoes: Pick<Digitacao, "quantity">[]) {
  return sumDigitacoesValues(digitacoes);
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
  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(`Erro ao carregar digitacoes: ${error.message}`);
  }

  return (data as DbDigitacao[]).map(toDigitacao);
}

export async function createDigitacao(params: {
  collaboratorId: string;
  clientName: string;
  operatorName: string;
  storeId: string;
  quantity?: number;
  dateKey?: string;
}): Promise<Digitacao> {
  const payload: any = {
    collaborator_id: params.collaboratorId,
    client_name: params.clientName.trim(),
    operator_name: params.operatorName,
    store_id: params.storeId,
    quantity: getDigitacaoQuantityValue({ quantity: params.quantity }),
  };

  if (params.dateKey) {
    payload.created_at = `${params.dateKey}T12:00:00Z`;
  }

  const { data, error } = await supabaseAdmin
    .from("digitacoes")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    if (isMissingQuantityColumn(error)) {
      const { quantity: _quantity, ...legacyPayload } = payload;
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from("digitacoes")
        .insert(legacyPayload)
        .select("*")
        .single();

      if (fallbackError) throw new Error(`Erro ao criar digitacao: ${fallbackError.message}`);
      return toDigitacao(fallbackData as DbDigitacao);
    }

    throw new Error(`Erro ao criar digitacao: ${error.message}`);
  }

  return toDigitacao(data as DbDigitacao);
}

export async function createMultipleDigitacoes(paramsArray: {
  collaboratorId: string;
  clientName: string;
  operatorName: string;
  storeId: string;
}[]): Promise<Digitacao[]> {
  const insertData = paramsArray.map((p) => ({
    collaborator_id: p.collaboratorId,
    client_name: p.clientName.trim(),
    operator_name: p.operatorName,
    store_id: p.storeId,
    quantity: 1,
  }));

  const { data, error } = await supabaseAdmin
    .from("digitacoes")
    .insert(insertData)
    .select("*");

  if (error) {
    if (isMissingQuantityColumn(error)) {
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from("digitacoes")
        .insert(insertData.map(({ quantity: _quantity, ...row }) => row))
        .select("*");

      if (fallbackError) throw new Error(`Erro ao criar digitacoes em lote: ${fallbackError.message}`);
      return (fallbackData as DbDigitacao[]).map(toDigitacao);
    }

    throw new Error(`Erro ao criar digitacoes em lote: ${error.message}`);
  }

  return (data as DbDigitacao[]).map(toDigitacao);
}

export async function deleteDigitacao(id: string, storeId?: string | null): Promise<void> {
  let query = supabaseAdmin.from("digitacoes").delete().eq("id", id);
  if (storeId) query = query.eq("store_id", storeId);
  const { error } = await query;
  if (error) throw new Error(`Erro ao deletar digitacao: ${error.message}`);
}

export async function updateDigitacao(id: string, updates: { clientName?: string }): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.clientName !== undefined) payload.client_name = updates.clientName.trim();

  if (Object.keys(payload).length === 0) return;

  const { error } = await supabaseAdmin.from("digitacoes").update(payload).eq("id", id);
  if (error) throw new Error(`Erro ao atualizar digitacao: ${error.message}`);
}
