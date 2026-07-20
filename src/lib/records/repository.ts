import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import { normalizePersonName } from "./domain";
import { createRecordSchema } from "./schema";
import type { OperatorRecord, Collaborator } from "./types";

type DbRecord = {
  id: string;
  collaborator_id: string;
  operator_name: string;
  client_name: string;
  amount_in_cents: number;
  activated: boolean;
  created_at: string;
};

function toOperatorRecord(row: DbRecord): OperatorRecord {
  return {
    id: row.id,
    collaboratorId: row.collaborator_id,
    operatorName: row.operator_name,
    clientName: row.client_name,
    amountInCents: row.amount_in_cents,
    activated: row.activated,
    createdAt: row.created_at,
  };
}

export async function listRecords(): Promise<OperatorRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("records")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Erro ao carregar registros: ${error.message}`);

  return (data as DbRecord[]).map(toOperatorRecord);
}

export async function createRecord(input: unknown): Promise<OperatorRecord> {
  const payload = createRecordSchema.parse(input);
  const clientName = normalizePersonName(payload.clientName);

  // Busca o nome do colaborador
  const { data: collab, error: collabError } = await supabaseAdmin
    .from("collaborators")
    .select("name, is_active")
    .eq("id", payload.collaboratorId)
    .single();

  if (collabError || !collab) {
    throw new Error("Colaborador não encontrado.");
  }
  
  if (!collab.is_active) {
    throw new Error("Colaborador está inativo ou foi mesclado.");
  }

  const { data, error } = await supabaseAdmin
    .from("records")
    .insert({
      collaborator_id: payload.collaboratorId,
      operator_name: collab.name, // Guarda o nome histórico no registro
      client_name: clientName,
      amount_in_cents: payload.amountInCents,
      activated: payload.activated,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Erro ao criar registro: ${error.message}`);

  return toOperatorRecord(data as DbRecord);
}

export async function deleteRecord(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("records")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Erro ao deletar registro: ${error.message}`);
}

export async function updateRecord(id: string, updates: { clientName?: string, activated?: boolean }): Promise<void> {
  const payload: any = {};
  if (updates.clientName !== undefined) payload.client_name = normalizePersonName(updates.clientName);
  if (updates.activated !== undefined) payload.activated = updates.activated;
  
  if (Object.keys(payload).length === 0) return;

  const { error } = await supabaseAdmin
    .from("records")
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(`Erro ao atualizar registro: ${error.message}`);
}

export async function listCollaborators(): Promise<Collaborator[]> {
  const { data, error } = await supabaseAdmin
    .from("collaborators")
    .select("id, name, is_active, merged_into_id, created_at")
    .order("name", { ascending: true });

  if (error) throw new Error(`Erro ao carregar colaboradores: ${error.message}`);

  return data.map(d => ({
    id: d.id,
    name: d.name,
    isActive: d.is_active,
    mergedIntoId: d.merged_into_id,
    createdAt: d.created_at
  }));
}

export async function createCollaborator(name: string): Promise<void> {
  const normalized = normalizePersonName(name);
  if (!normalized) throw new Error("Nome é obrigatório.");

  const { error } = await supabaseAdmin
    .from("collaborators")
    .insert({ name: normalized });

  if (error) throw new Error(`Erro ao criar colaborador: ${error.message}`);
}


export async function listActiveCollaborators(): Promise<Collaborator[]> {
  const { data, error } = await supabaseAdmin
    .from("collaborators")
    .select("id, name, is_active, merged_into_id, created_at")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw new Error(`Erro ao carregar colaboradores: ${error.message}`);

  return data.map(d => ({
    id: d.id,
    name: d.name,
    isActive: d.is_active,
    mergedIntoId: d.merged_into_id,
    createdAt: d.created_at
  }));
}

export async function getCollaboratorRecords(collaboratorId: string): Promise<OperatorRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("records")
    .select("*")
    .eq("collaborator_id", collaboratorId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Erro ao carregar registros do colaborador: ${error.message}`);

  return (data as DbRecord[]).map(toOperatorRecord);
}

// MESCLAGEM REVERSÍVEL
export async function mergeCollaborators(
  keepId: string,
  mergeId: string,
): Promise<void> {
  // 1. Desativa o mergeId e aponta para o keepId (Soft Merge)
  const { error: mergeError } = await supabaseAdmin
    .from("collaborators")
    .update({
      is_active: false,
      merged_into_id: keepId
    })
    .eq("id", mergeId);

  if (mergeError) throw new Error(`Erro ao mesclar colaborador: ${mergeError.message}`);

  // 2. Transfere os registros mantendo o histórico de quem operou, 
  // mas mudando o ID.
  const { error: updateError } = await supabaseAdmin
    .from("records")
    .update({ collaborator_id: keepId })
    .eq("collaborator_id", mergeId);

  if (updateError) throw new Error(`Erro ao transferir registros: ${updateError.message}`);
}

// DESFAZER MESCLAGEM
export async function unmergeCollaborator(mergeId: string): Promise<void> {
  // 1. Pega os dados originais do colaborador (precisa do nome original dele pra recuperar os registros)
  const { data: collabData, error: fetchError } = await supabaseAdmin
    .from("collaborators")
    .select("name, merged_into_id")
    .eq("id", mergeId)
    .single();

  if (fetchError || !collabData || !collabData.merged_into_id) {
    throw new Error("Falha ao recuperar informações de mesclagem.");
  }

  // 2. Reativa o colaborador
  const { error: activateError } = await supabaseAdmin
    .from("collaborators")
    .update({
      is_active: true,
      merged_into_id: null
    })
    .eq("id", mergeId);

  if (activateError) throw new Error(`Erro ao restaurar colaborador: ${activateError.message}`);

  // 3. Devolve os registros que pertenciam a ele (buscando pelo operator_name histórico)
  const { error: recordsError } = await supabaseAdmin
    .from("records")
    .update({ collaborator_id: mergeId })
    .eq("collaborator_id", collabData.merged_into_id)
    .eq("operator_name", collabData.name);

  if (recordsError) throw new Error(`Erro ao devolver registros: ${recordsError.message}`);
}

export async function renameCollaborator(id: string, newName: string): Promise<void> {
  const normalized = normalizePersonName(newName);

  const { error: collabError } = await supabaseAdmin
    .from("collaborators")
    .update({ name: normalized })
    .eq("id", id);

  if (collabError) throw new Error(`Erro ao renomear colaborador: ${collabError.message}`);

  // Renomeia o histórico nos registros atrelados a ele
  const { error: recordsError } = await supabaseAdmin
    .from("records")
    .update({ operator_name: normalized })
    .eq("collaborator_id", id);

  if (recordsError) throw new Error(`Erro ao atualizar registros: ${recordsError.message}`);
}

export async function deleteCollaborator(id: string): Promise<void> {
  // Alterado para Soft Delete para não quebrar referências históricas e auditorias
  const { error } = await supabaseAdmin
    .from("collaborators")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw new Error(`Erro ao desativar colaborador: ${error.message}`);
}

// Mantido para compatibilidade ou uso futuro
export async function findSimilarCollaborators(name: string) {
  const normalized = normalizePersonName(name).toLowerCase();
  const { data: all } = await supabaseAdmin
    .from("collaborators")
    .select("id, name")
    .eq("is_active", true);

  if (!all) return [];

  return all
    .map((c) => ({
      ...c,
      similarity: computeSimilarity(normalized, c.name.toLowerCase()),
    }))
    .filter((c) => c.similarity > 0.6 && c.name.toLowerCase() !== normalized)
    .sort((a, b) => b.similarity - a.similarity);
}

function computeSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigramsA = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bigram = a.substring(i, i + 2);
    bigramsA.set(bigram, (bigramsA.get(bigram) ?? 0) + 1);
  }

  let matches = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bigram = b.substring(i, i + 2);
    const count = bigramsA.get(bigram);
    if (count && count > 0) {
      bigramsA.set(bigram, count - 1);
      matches++;
    }
  }

  return (2 * matches) / (a.length + b.length - 2);
}
