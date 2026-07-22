import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import { normalizePersonName } from "./domain";
import { createRecordSchema } from "./schema";
import type { OperatorRecord, Collaborator } from "./types";
import {
  DEFAULT_COLLABORATOR_SUBROLE,
  normalizeCollaboratorSubRole,
} from "./collaborator-subroles";

type DbRecord = {
  id: string;
  collaborator_id: string;
  store_id: string | null;
  operator_name: string;
  client_name: string;
  amount_in_cents: number;
  amount_used_in_cents?: number | null;
  activated: boolean;
  activated_later?: boolean;
  created_at: string;
  collaborators?: { sub_role: string } | null;
};

function toOperatorRecord(row: DbRecord): OperatorRecord {
  return {
    id: row.id,
    collaboratorId: row.collaborator_id,
    operatorName: row.operator_name,
    clientName: row.client_name,
    amountInCents: row.amount_in_cents,
    amountUsedInCents: row.amount_used_in_cents ?? undefined,
    activated: row.activated,
    activatedLater: row.activated_later,
    createdAt: row.created_at,
    storeName: (row as any).stores?.name,
    subRole: row.collaborators?.sub_role ?? undefined,
  };
}

// ─── RECORDS ─────────────────────────────────────────────────────────────────

/**
 * Lista registros. Se storeId for null (GLOBAL_ADMIN), retorna todos.
 * Se storeId for fornecido (MANAGER/EMPLOYEE), filtra pela loja.
 */
export async function listRecords(storeId?: string | null): Promise<OperatorRecord[]> {
  let query = supabaseAdmin
    .from("records")
    .select("*, stores(name), collaborators(sub_role)")
    .order("created_at", { ascending: false });

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao carregar registros: ${error.message}`);
  return (data as DbRecord[]).map(toOperatorRecord);
}

/**
 * Cria um registro. storeId é SEMPRE extraído do JWT no servidor, nunca do cliente.
 * Aceita tanto IDs de colaboradores quanto IDs de usuários MANAGER/VM (auto-cria colaborador se necessário).
 */
export async function createRecord(input: unknown, storeId: string | null): Promise<OperatorRecord> {
  const payload = createRecordSchema.parse(input);
  const clientName = normalizePersonName(payload.clientName);

  // ── Tenta buscar como colaborador normal ──────────────────────────────────
  let { data: collab, error: collabError } = await supabaseAdmin
    .from("collaborators")
    .select("id, name, is_active, store_id")
    .eq("id", payload.collaboratorId)
    .maybeSingle();

  // ── Se não encontrou como colaborador, verifica se é um usuário MANAGER/VM ─
  if (!collab) {
    const { data: managerUser } = await supabaseAdmin
      .from("app_users")
      .select("id, name, username, role, store_id")
      .eq("id", payload.collaboratorId)
      .in("role", ["MANAGER", "VM"])
      .eq("is_active", true)
      .maybeSingle();

    if (!managerUser) {
      throw new Error("Colaborador não encontrado.");
    }

    const managerStoreId = managerUser.store_id ?? storeId;
    if (!managerStoreId) throw new Error("Gerente sem loja vinculada.");

    const managerName = managerUser.name || managerUser.username;

    // Verifica se já existe um colaborador criado para este gerente (por referência no campo sub_role)
    const { data: existing } = await supabaseAdmin
      .from("collaborators")
      .select("id, name, is_active, store_id")
      .eq("store_id", managerStoreId)
      .eq("name", normalizePersonName(managerName))
      .in("sub_role", ["Gerente", "VM"])
      .maybeSingle();

    if (existing) {
      collab = existing;
    } else {
      // Auto-cria colaborador para o gerente na primeira vez
      const subRole = managerUser.role === "VM" ? "VM" : "Gerente";
      const { data: created, error: createError } = await supabaseAdmin
        .from("collaborators")
        .insert({
          name: normalizePersonName(managerName),
          store_id: managerStoreId,
          sub_role: subRole,
          is_active: true,
        })
        .select("id, name, is_active, store_id")
        .single();

      if (createError || !created) {
        throw new Error("Erro ao registrar gerente como colaborador.");
      }
      collab = created;
    }
  }

  if (!collab) throw new Error("Colaborador não encontrado.");
  if (!collab.is_active) throw new Error("Colaborador está inativo ou foi mesclado.");

  // MANAGER/EMPLOYEE só podem registrar para colaboradores da sua própria loja
  if (storeId && collab.store_id !== storeId) {
    throw new Error("Acesso negado: colaborador pertence a outra unidade.");
  }

  const { data, error } = await supabaseAdmin
    .from("records")
    .insert({
      collaborator_id: collab.id,
      store_id: storeId ?? collab.store_id,
      operator_name: collab.name,
      client_name: clientName,
      amount_in_cents: payload.amountInCents,
      activated: payload.activated,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Erro ao criar registro: ${error.message}`);
  return toOperatorRecord(data as DbRecord);
}

export async function deleteRecord(id: string, storeId?: string | null): Promise<void> {
  let query = supabaseAdmin.from("records").delete().eq("id", id);
  // MANAGER só pode deletar registros da sua loja
  if (storeId) query = query.eq("store_id", storeId);
  const { error } = await query;
  if (error) throw new Error(`Erro ao deletar registro: ${error.message}`);
}

export async function updateRecord(id: string, updates: { clientName?: string; activated?: boolean; amountInCents?: number; amountUsedInCents?: number | null }): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.clientName !== undefined) payload.client_name = normalizePersonName(updates.clientName);
  if (updates.amountInCents !== undefined) payload.amount_in_cents = updates.amountInCents;
  if (updates.amountUsedInCents !== undefined) payload.amount_used_in_cents = updates.amountUsedInCents;

  if (updates.activated !== undefined) {
    payload.activated = updates.activated;
    
    // Check old record to set activated_later
    const { data: oldRecord } = await supabaseAdmin.from("records").select("activated").eq("id", id).single();
    if (oldRecord) {
      if (!oldRecord.activated && updates.activated) {
        payload.activated_later = true;
      } else if (!updates.activated) {
        payload.activated_later = false;
      }
    }
  }

  if (Object.keys(payload).length === 0) return;

  const { error } = await supabaseAdmin.from("records").update(payload).eq("id", id);
  if (error) throw new Error(`Erro ao atualizar registro: ${error.message}`);
}

// ─── COLLABORATORS ────────────────────────────────────────────────────────────

/**
 * Lista colaboradores. GLOBAL_ADMIN vê todos (storeId null). Outros veem apenas sua loja.
 */
export async function listCollaborators(storeId?: string | null): Promise<Collaborator[]> {
  let query = supabaseAdmin
    .from("collaborators")
    .select("*")
    .order("name", { ascending: true });

  if (storeId) query = query.eq("store_id", storeId);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao carregar colaboradores: ${error.message}`);

  return data.map((d) => ({
    id: d.id,
    name: d.name,
    subRole: normalizeCollaboratorSubRole(d.sub_role),
    isActive: d.is_active,
    mergedIntoId: d.merged_into_id,
    storeId: d.store_id,
    createdAt: d.created_at,
  }));
}

/**
 * Lista apenas colaboradores ativos de uma loja.
 */
export async function listActiveCollaborators(storeId?: string | null): Promise<Collaborator[]> {
  let query = supabaseAdmin
    .from("collaborators")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (storeId) query = query.eq("store_id", storeId);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao carregar colaboradores: ${error.message}`);

  return data.map((d) => ({
    id: d.id,
    name: d.name,
    subRole: normalizeCollaboratorSubRole(d.sub_role),
    isActive: d.is_active,
    mergedIntoId: d.merged_into_id,
    storeId: d.store_id,
    createdAt: d.created_at,
  }));
}

/**
 * Cria colaborador. storeId é OBRIGATÓRIO e vem do JWT (nunca do frontend).
 */
export async function createCollaborator(
  name: string,
  storeId: string,
  subRole: unknown = DEFAULT_COLLABORATOR_SUBROLE,
): Promise<void> {
  const normalized = normalizePersonName(name);
  const normalizedSubRole = normalizeCollaboratorSubRole(subRole);
  if (!normalized) throw new Error("Nome é obrigatório.");
  if (!storeId) throw new Error("Unidade (loja) é obrigatória para criar um colaborador.");

  const { error } = await supabaseAdmin
    .from("collaborators")
    .insert({ name: normalized, store_id: storeId, sub_role: normalizedSubRole });

  if (error) {
    if (error.code === "PGRST204" || error.code === "42703") {
      const retry = await supabaseAdmin
        .from("collaborators")
        .insert({ name: normalized, store_id: storeId });
      if (retry.error) throw new Error(`Erro ao criar colaborador: ${retry.error.message}`);
      return;
    }
    throw new Error(`Erro ao criar colaborador: ${error.message}`);
  }
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

// ─── MESCLAGEM REVERSÍVEL ─────────────────────────────────────────────────────

export async function mergeCollaborators(keepId: string, mergeId: string): Promise<void> {
  const { error: mergeError } = await supabaseAdmin
    .from("collaborators")
    .update({ is_active: false, merged_into_id: keepId })
    .eq("id", mergeId);

  if (mergeError) throw new Error(`Erro ao mesclar colaborador: ${mergeError.message}`);

  const { error: updateError } = await supabaseAdmin
    .from("records")
    .update({ collaborator_id: keepId })
    .eq("collaborator_id", mergeId);

  if (updateError) throw new Error(`Erro ao transferir registros: ${updateError.message}`);
}

export async function unmergeCollaborator(mergeId: string): Promise<void> {
  const { data: collabData, error: fetchError } = await supabaseAdmin
    .from("collaborators")
    .select("name, merged_into_id")
    .eq("id", mergeId)
    .single();

  if (fetchError || !collabData || !collabData.merged_into_id) {
    throw new Error("Falha ao recuperar informações de mesclagem.");
  }

  const { error: activateError } = await supabaseAdmin
    .from("collaborators")
    .update({ is_active: true, merged_into_id: null })
    .eq("id", mergeId);

  if (activateError) throw new Error(`Erro ao restaurar colaborador: ${activateError.message}`);

  // Devolve os registros pelo operator_name histórico (estratégia robusta)
  const { error: recordsError } = await supabaseAdmin
    .from("records")
    .update({ collaborator_id: mergeId })
    .eq("collaborator_id", collabData.merged_into_id)
    .eq("operator_name", collabData.name);

  if (recordsError) throw new Error(`Erro ao propagar nome nos registros: ${recordsError.message}`);
}

export async function transferCollaborator(id: string, newStoreId: string): Promise<void> {
  const { error: collabError } = await supabaseAdmin
    .from("collaborators")
    .update({ store_id: newStoreId })
    .eq("id", id);
  if (collabError) throw new Error(`Erro ao transferir colaborador: ${collabError.message}`);

  const { error: recordsError } = await supabaseAdmin
    .from("records")
    .update({ store_id: newStoreId })
    .eq("collaborator_id", id);
  if (recordsError) throw new Error(`Erro ao transferir registros do colaborador: ${recordsError.message}`);
}

export async function renameCollaborator(id: string, newName: string): Promise<void> {
  const normalized = normalizePersonName(newName);

  const { error: collabError } = await supabaseAdmin
    .from("collaborators")
    .update({ name: normalized })
    .eq("id", id);

  if (collabError) throw new Error(`Erro ao renomear colaborador: ${collabError.message}`);

  const { error: recordsError } = await supabaseAdmin
    .from("records")
    .update({ operator_name: normalized })
    .eq("collaborator_id", id);

  if (recordsError) throw new Error(`Erro ao atualizar registros: ${recordsError.message}`);
}

export async function deleteCollaborator(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("collaborators")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw new Error(`Erro ao desativar colaborador: ${error.message}`);
}

export async function toggleCollaboratorActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabaseAdmin
    .from("collaborators")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw new Error(`Erro ao alterar status do colaborador: ${error.message}`);
}

export async function hardDeleteCollaborator(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("collaborators")
    .delete()
    .eq("id", id);

  if (error) {
    if (error.code === '23503') {
      throw new Error("Não é possível excluir um funcionário que possui cartões registrados. Experimente inativá-lo em vez de excluí-lo.");
    }
    throw new Error(`Erro ao excluir colaborador: ${error.message}`);
  }
}

export async function findSimilarCollaborators(name: string, storeId?: string | null) {
  const normalized = normalizePersonName(name).toLowerCase();
  let query = supabaseAdmin.from("collaborators").select("id, name").eq("is_active", true);
  if (storeId) query = query.eq("store_id", storeId);

  const { data: all } = await query;
  if (!all) return [];

  return all
    .map((c) => ({
      ...c,
      similarity: computeSimilarity(normalized, c.name.toLowerCase()),
    }))
    .filter((c) => c.similarity > 0.6 && c.name.toLowerCase() !== normalized)
    .sort((a, b) => b.similarity - a.similarity);
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

/**
 * Métricas globais para o GLOBAL_ADMIN (todas as lojas).
 */
export async function getGlobalMetrics() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  const lastMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth() - 1, 1);
  const lastMonthEnd = new Date(todayStart.getFullYear(), todayStart.getMonth(), 0, 23, 59, 59);

  const [storesRes, collabsRes, todayRes, monthRes, lastMonthRes] = await Promise.all([
    supabaseAdmin.from("stores").select("id, name", { count: "exact" }),
    supabaseAdmin.from("collaborators").select("id", { count: "exact" }).eq("is_active", true),
    supabaseAdmin.from("records").select("id, amount_in_cents", { count: "exact" }).gte("created_at", todayStart.toISOString()),
    supabaseAdmin.from("records").select("id, amount_in_cents", { count: "exact" }).gte("created_at", monthStart.toISOString()),
    supabaseAdmin.from("records").select("id, amount_in_cents", { count: "exact" }).gte("created_at", lastMonthStart.toISOString()).lte("created_at", lastMonthEnd.toISOString()),
  ]);

  const todayCount = todayRes.count ?? 0;
  const monthCount = monthRes.count ?? 0;
  const lastMonthCount = lastMonthRes.count ?? 0;
  const growth = lastMonthCount > 0 ? ((monthCount - lastMonthCount) / lastMonthCount) * 100 : 0;

  return {
    totalStores: storesRes.count ?? 0,
    totalCollaborators: collabsRes.count ?? 0,
    cardsToday: todayCount,
    cardsThisMonth: monthCount,
    cardsLastMonth: lastMonthCount,
    growthPercent: parseFloat(growth.toFixed(1)),
    stores: storesRes.data ?? [],
  };
}

/**
 * Métricas por loja para o GLOBAL_ADMIN.
 */
export async function getStoreMetrics(storeId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

  const [storeRes, collabsRes, todayRes, monthRes] = await Promise.all([
    supabaseAdmin.from("stores").select("id, name").eq("id", storeId).single(),
    supabaseAdmin.from("collaborators").select("id, name", { count: "exact" }).eq("store_id", storeId).eq("is_active", true),
    supabaseAdmin.from("records").select("id, amount_in_cents", { count: "exact" }).eq("store_id", storeId).gte("created_at", todayStart.toISOString()),
    supabaseAdmin.from("records").select("id, amount_in_cents", { count: "exact" }).eq("store_id", storeId).gte("created_at", monthStart.toISOString()),
  ]);

  return {
    store: storeRes.data,
    collaboratorsCount: collabsRes.count ?? 0,
    collaborators: collabsRes.data ?? [],
    cardsToday: todayRes.count ?? 0,
    cardsThisMonth: monthRes.count ?? 0,
  };
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────

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
