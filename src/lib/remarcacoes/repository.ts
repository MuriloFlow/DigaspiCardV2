import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import {
  createRemarcacaoSchema,
  updateRemarcacaoSchema,
  finalizeRemarcacaoSchema,
} from "./schema";
import type {
  Remarcacao,
  RemarcacaoHistorico,
  RemarcacaoHistoricoAction,
} from "./types";

// ── Mapeador DB → Domain ─────────────────────────────────────
// Sem Storage: label_photo_b64 e manager_signature_b64 são base64 direto

type DbRemarcacao = {
  id: string;
  store_id: string;
  collaborator_id: string | null;
  operator_name: string;
  barcode: string | null;
  internal_code: string | null;
  label_photo_b64: string | null;
  original_value_cents: number | null;
  remarked_value_cents: number | null;
  notes: string | null;
  manager_id: string | null;
  manager_name: string | null;
  manager_signature_b64: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
  stores?: { name: string } | null;
};

function toRemarcacao(row: DbRemarcacao): Remarcacao {
  return {
    id: row.id,
    storeId: row.store_id,
    collaboratorId: row.collaborator_id,
    operatorName: row.operator_name,
    barcode: row.barcode,
    internalCode: row.internal_code,
    labelPhotoB64: row.label_photo_b64,
    originalValueCents: row.original_value_cents,
    remarkedValueCents: row.remarked_value_cents,
    notes: row.notes,
    managerId: row.manager_id,
    managerName: row.manager_name,
    managerSignatureB64: row.manager_signature_b64,
    status: row.status as Remarcacao["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    deletedAt: row.deleted_at,
    storeName: row.stores?.name,
  };
}

// ── CRUD PRINCIPAL ────────────────────────────────────────────

/**
 * Lista remarcações não deletadas de uma loja.
 * GLOBAL_ADMIN / TI_ADMIN passa storeId=null para ver todas.
 * 
 * NOTA: campos base64 de foto/assinatura NÃO são retornados na listagem
 * para evitar payloads gigantes. Somente carregados no detalhe (getById).
 */
export async function listRemarcacoes(
  storeId?: string | null,
): Promise<Remarcacao[]> {
  // Seleciona tudo EXCETO os base64 pesados (foto + assinatura) para a lista
  const cols = [
    "id", "store_id", "collaborator_id", "operator_name",
    "barcode", "internal_code",
    "original_value_cents", "remarked_value_cents",
    "notes", "manager_id", "manager_name",
    "status", "created_at", "updated_at", "completed_at", "deleted_at",
    "stores(name)",
  ].join(", ");

  let query = supabaseAdmin
    .from("remarcacoes")
    .select(cols)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (storeId) query = query.eq("store_id", storeId);

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return []; // tabela não existe ainda
    throw new Error(`Erro ao carregar remarcações: ${error.message}`);
  }

  return (data as unknown as DbRemarcacao[]).map((row) => ({
    ...toRemarcacao(row),
    labelPhotoB64: null, // não carregado na lista — só no detalhe
    managerSignatureB64: null,
  }));
}

/**
 * Busca uma remarcação pelo ID — carrega TUDO incluindo base64.
 */
export async function getRemarcacaoById(
  id: string,
  storeId?: string | null,
): Promise<Remarcacao | null> {
  let query = supabaseAdmin
    .from("remarcacoes")
    .select("*, stores(name)")
    .eq("id", id)
    .is("deleted_at", null);

  if (storeId) query = query.eq("store_id", storeId);

  const { data, error } = await (query as any).maybeSingle();
  if (error) throw new Error(`Erro ao buscar remarcação: ${error.message}`);
  if (!data) return null;
  return toRemarcacao(data as DbRemarcacao);
}

/**
 * Busca remarcações por código de barras.
 */
export async function getRemarcacoesByBarcode(
  barcode: string,
  storeId?: string | null,
): Promise<Remarcacao[]> {
  const cols = [
    "id", "store_id", "collaborator_id", "operator_name",
    "barcode", "internal_code",
    "original_value_cents", "remarked_value_cents",
    "notes", "manager_id", "manager_name",
    "status", "created_at", "updated_at", "completed_at", "deleted_at",
    "stores(name)",
  ].join(", ");

  let query = supabaseAdmin
    .from("remarcacoes")
    .select(cols)
    .eq("barcode", barcode)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (storeId) query = query.eq("store_id", storeId);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar por barcode: ${error.message}`);
  return (data as unknown as DbRemarcacao[]).map((row) => ({
    ...toRemarcacao(row),
    labelPhotoB64: null,
    managerSignatureB64: null,
  }));
}

/**
 * Cria uma nova remarcação (rascunho inicial — auto-save).
 */
export async function createRemarcacao(
  input: unknown,
  actorId: string,
  actorName: string,
): Promise<Remarcacao> {
  const payload = createRemarcacaoSchema.parse(input);

  // Valida colaborador
  const { data: collab, error: collabError } = await supabaseAdmin
    .from("collaborators")
    .select("id, name, is_active, store_id")
    .eq("id", payload.collaboratorId)
    .maybeSingle();

  if (collabError || !collab) throw new Error("Colaborador não encontrado.");
  if (!collab.is_active) throw new Error("Colaborador está inativo.");
  if (collab.store_id !== payload.storeId) {
    throw new Error("Colaborador pertence a outra unidade.");
  }

  const { data, error } = await supabaseAdmin
    .from("remarcacoes")
    .insert({
      store_id: payload.storeId,
      collaborator_id: payload.collaboratorId,
      operator_name: payload.operatorName,
      status: "draft",
    })
    .select("*, stores(name)")
    .single();

  if (error) throw new Error(`Erro ao criar remarcação: ${error.message}`);

  const remarcacao = toRemarcacao(data as DbRemarcacao);

  await appendHistorico(remarcacao.id, {
    changedById: actorId,
    changedByName: actorName,
    action: "created",
    snapshot: remarcacao,
  });

  return remarcacao;
}

/**
 * Atualiza incrementalmente uma remarcação (auto-save).
 * Salva base64 de foto/assinatura diretamente nas colunas.
 */
export async function updateRemarcacao(
  id: string,
  input: unknown,
  storeId: string | null,
  actorId: string,
  actorName: string,
): Promise<Remarcacao> {
  const payload = updateRemarcacaoSchema.parse(input);
  if (Object.keys(payload).length === 0) throw new Error("Nenhum campo para atualizar.");

  const existing = await getRemarcacaoById(id, storeId);
  if (!existing) throw new Error("Remarcação não encontrada.");
  if (existing.status === "completed" || existing.status === "cancelled") {
    throw new Error("Não é possível alterar uma remarcação finalizada ou cancelada.");
  }

  const updatePayload: Record<string, unknown> = {};
  if (payload.barcode !== undefined)            updatePayload.barcode = payload.barcode;
  if (payload.internalCode !== undefined)       updatePayload.internal_code = payload.internalCode;
  if (payload.labelPhotoB64 !== undefined)      updatePayload.label_photo_b64 = payload.labelPhotoB64;
  if (payload.originalValueCents !== undefined) updatePayload.original_value_cents = payload.originalValueCents;
  if (payload.remarkedValueCents !== undefined) updatePayload.remarked_value_cents = payload.remarkedValueCents;
  if (payload.notes !== undefined)              updatePayload.notes = payload.notes;
  if (payload.status !== undefined)             updatePayload.status = payload.status;

  const { data, error } = await supabaseAdmin
    .from("remarcacoes")
    .update(updatePayload)
    .eq("id", id)
    .select("*, stores(name)")
    .single();

  if (error) throw new Error(`Erro ao atualizar remarcação: ${error.message}`);

  const updated = toRemarcacao(data as DbRemarcacao);

  let action: RemarcacaoHistoricoAction = "updated";
  if (payload.barcode)         action = "barcode_scanned";
  else if (payload.labelPhotoB64) action = "photo_added";
  else if (payload.originalValueCents !== undefined || payload.remarkedValueCents !== undefined) {
    action = "values_set";
  } else if (payload.status === "cancelled") action = "cancelled";

  await appendHistorico(updated.id, {
    changedById: actorId,
    changedByName: actorName,
    action,
    snapshot: updated,
  });

  return updated;
}

/**
 * Finaliza a remarcação salvando a assinatura do gerente como base64.
 */
export async function finalizeRemarcacao(
  id: string,
  input: unknown,
  storeId: string | null,
  actorId: string,
  actorName: string,
): Promise<Remarcacao> {
  const payload = finalizeRemarcacaoSchema.parse(input);

  const existing = await getRemarcacaoById(id, storeId);
  if (!existing) throw new Error("Remarcação não encontrada.");
  if (existing.status === "completed") throw new Error("Remarcação já finalizada.");
  if (existing.status === "cancelled") throw new Error("Remarcação cancelada não pode ser finalizada.");
  if (!existing.barcode && !existing.labelPhotoB64) {
    throw new Error("Remarcação incompleta: código ou foto da etiqueta são necessários.");
  }

  const { data, error } = await supabaseAdmin
    .from("remarcacoes")
    .update({
      manager_id: payload.managerId,
      manager_name: payload.managerName,
      manager_signature_b64: payload.managerSignatureB64,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*, stores(name)")
    .single();

  if (error) throw new Error(`Erro ao finalizar remarcação: ${error.message}`);

  const finalized = toRemarcacao(data as DbRemarcacao);

  await appendHistorico(finalized.id, {
    changedById: actorId,
    changedByName: actorName,
    action: "completed",
    snapshot: finalized,
  });

  return finalized;
}

/**
 * Soft delete de uma remarcação.
 */
export async function softDeleteRemarcacao(
  id: string,
  storeId: string | null,
): Promise<void> {
  let query = supabaseAdmin
    .from("remarcacoes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (storeId) query = query.eq("store_id", storeId);

  const { error } = await query;
  if (error) throw new Error(`Erro ao deletar remarcação: ${error.message}`);
}

// ── HISTÓRICO ─────────────────────────────────────────────────

type AppendHistoricoParams = {
  changedById: string;
  changedByName: string;
  action: RemarcacaoHistoricoAction;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  snapshot?: Omit<Remarcacao, "labelPhotoB64" | "managerSignatureB64">; // sem base64 no snapshot
};

async function appendHistorico(
  remarcacaoId: string,
  params: AppendHistoricoParams,
): Promise<void> {
  try {
    // Remove base64 do snapshot para não explodir o JSON
    const snapshotClean = params.snapshot
      ? { ...params.snapshot, labelPhotoB64: "[omitted]", managerSignatureB64: "[omitted]" }
      : null;

    await supabaseAdmin.from("remarcacoes_historico").insert({
      remarcacao_id: remarcacaoId,
      changed_by_id: params.changedById,
      changed_by_name: params.changedByName,
      action: params.action,
      field_changed: params.fieldChanged ?? null,
      old_value: params.oldValue ?? null,
      new_value: params.newValue ?? null,
      snapshot: snapshotClean ? JSON.stringify(snapshotClean) : null,
    });
  } catch {
    console.error("[remarcacoes] Falha ao registrar histórico:", remarcacaoId);
  }
}

export async function listHistorico(
  remarcacaoId: string,
): Promise<RemarcacaoHistorico[]> {
  const { data, error } = await supabaseAdmin
    .from("remarcacoes_historico")
    .select("*")
    .eq("remarcacao_id", remarcacaoId)
    .order("created_at", { ascending: true });

  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(`Erro ao carregar histórico: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    remarcacaoId: row.remarcacao_id,
    changedById: row.changed_by_id,
    changedByName: row.changed_by_name,
    action: row.action as RemarcacaoHistoricoAction,
    fieldChanged: row.field_changed,
    oldValue: row.old_value,
    newValue: row.new_value,
    snapshot: row.snapshot ? JSON.parse(row.snapshot) : null,
    createdAt: row.created_at,
  }));
}
