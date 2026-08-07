import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import {
  createRemarcacaoSchema,
  addItemSchema,
  updateRemarcacaoStatusSchema,
  finalizeRemarcacaoSchema,
} from "./schema";
import type {
  Remarcacao,
  RemarcacaoItem,
  RemarcacaoHistorico,
  RemarcacaoHistoricoAction,
} from "./types";

// ── Mapeadores DB → Domain ─────────────────────────────────────

type DbRemarcacao = {
  id: string;
  store_id: string;
  collaborator_id: string | null;
  operator_name: string;
  manager_id: string | null;
  manager_name: string | null;
  manager_signature_b64: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
  stores?: { name: string } | null;
  remarcacao_itens?: DbRemarcacaoItem[];
};

type DbRemarcacaoItem = {
  id: string;
  remarcacao_id: string;
  barcode: string;
  internal_code: string | null;
  label_photo_b64: string | null; // null on lists to save bandwidth
  original_value_cents: number;
  remarked_value_cents: number;
  notes: string | null;
  created_at: string;
  deleted_at: string | null;
};

function toRemarcacaoItem(row: DbRemarcacaoItem): RemarcacaoItem {
  return {
    id: row.id,
    remarcacaoId: row.remarcacao_id,
    barcode: row.barcode,
    internalCode: row.internal_code,
    labelPhotoB64: row.label_photo_b64 || "",
    originalValueCents: row.original_value_cents,
    remarkedValueCents: row.remarked_value_cents,
    notes: row.notes,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

function toRemarcacao(row: DbRemarcacao): Remarcacao {
  return {
    id: row.id,
    storeId: row.store_id,
    collaboratorId: row.collaborator_id,
    operatorName: row.operator_name,
    managerId: row.manager_id,
    managerName: row.manager_name,
    managerSignatureB64: row.manager_signature_b64,
    status: row.status as Remarcacao["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    deletedAt: row.deleted_at,
    storeName: row.stores?.name,
    itens: row.remarcacao_itens ? row.remarcacao_itens.map(toRemarcacaoItem) : undefined,
  };
}

// ── CRUD LOTES ────────────────────────────────────────────

export async function listRemarcacoes(storeId?: string | null): Promise<Remarcacao[]> {
  // Para lista, carregamos o cabeçalho e os itens (mas sem a foto em b64 para não travar)
  let query = supabaseAdmin
    .from("remarcacoes")
    .select(`
      id, store_id, collaborator_id, operator_name, manager_id, manager_name, status,
      created_at, updated_at, completed_at, deleted_at,
      stores(name),
      remarcacao_itens(id, remarcacao_id, barcode, original_value_cents, remarked_value_cents, created_at, deleted_at)
    `)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (storeId) query = query.eq("store_id", storeId);

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(`Erro ao carregar remarcações: ${error.message}`);
  }

  return (data as unknown as DbRemarcacao[]).map((row) => {
    // Filtra itens deletados logicamente
    if (row.remarcacao_itens) {
      row.remarcacao_itens = row.remarcacao_itens.filter(i => !i.deleted_at);
    }
    return toRemarcacao(row);
  });
}

export async function getRemarcacaoById(id: string, storeId?: string | null): Promise<Remarcacao | null> {
  // Carrega TUDO incluindo base64 para detalhe
  let query = supabaseAdmin
    .from("remarcacoes")
    .select(`
      *,
      stores(name),
      remarcacao_itens(*)
    `)
    .eq("id", id)
    .is("deleted_at", null)
    .order("created_at", { referencedTable: "remarcacao_itens", ascending: true });

  if (storeId) query = query.eq("store_id", storeId);

  const { data, error } = await (query as any).maybeSingle();
  if (error) throw new Error(`Erro ao buscar remarcação: ${error.message}`);
  if (!data) return null;

  const dbRem = data as DbRemarcacao;
  if (dbRem.remarcacao_itens) {
    dbRem.remarcacao_itens = dbRem.remarcacao_itens.filter(i => !i.deleted_at);
  }
  return toRemarcacao(dbRem);
}

export async function createRemarcacao(
  input: unknown,
  actorId: string,
  actorName: string,
): Promise<Remarcacao> {
  const payload = createRemarcacaoSchema.parse(input);

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

  if (error) throw new Error(`Erro ao criar lote de remarcação: ${error.message}`);

  const remarcacao = toRemarcacao(data as DbRemarcacao);

  await appendHistorico(remarcacao.id, null, {
    changedById: actorId,
    changedByName: actorName,
    action: "created",
  });

  return remarcacao;
}

// ── CRUD ITENS ────────────────────────────────────────────

export async function addRemarcacaoItem(
  input: unknown,
  actorId: string,
  actorName: string,
): Promise<RemarcacaoItem> {
  const payload = addItemSchema.parse(input);

  const existing = await getRemarcacaoById(payload.remarcacaoId);
  if (!existing) throw new Error("Lote de Remarcação não encontrado.");
  if (existing.status !== "draft" && existing.status !== "pending_approval") {
    throw new Error("Não é possível adicionar itens a um lote finalizado.");
  }

  const { data, error } = await supabaseAdmin
    .from("remarcacao_itens")
    .insert({
      remarcacao_id: payload.remarcacaoId,
      barcode: payload.barcode,
      internal_code: payload.internalCode || null,
      label_photo_b64: payload.labelPhotoB64,
      original_value_cents: payload.originalValueCents,
      remarked_value_cents: payload.remarkedValueCents,
      notes: payload.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Erro ao adicionar item: ${error.message}`);

  const item = toRemarcacaoItem(data as DbRemarcacaoItem);

  // Atualiza o updatedAt do lote pai
  await supabaseAdmin.from("remarcacoes").update({ updated_at: new Date().toISOString() }).eq("id", existing.id);

  await appendHistorico(existing.id, item.id, {
    changedById: actorId,
    changedByName: actorName,
    action: "added_item",
    newValue: payload.barcode,
  });

  return item;
}

export async function removeRemarcacaoItem(
  itemId: string,
  remarcacaoId: string,
  actorId: string,
  actorName: string,
): Promise<void> {
  const existing = await getRemarcacaoById(remarcacaoId);
  if (!existing) throw new Error("Lote não encontrado.");
  if (existing.status !== "draft" && existing.status !== "pending_approval") {
    throw new Error("Não é possível remover itens de um lote finalizado.");
  }

  const { error } = await supabaseAdmin
    .from("remarcacao_itens")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("remarcacao_id", remarcacaoId);

  if (error) throw new Error(`Erro ao remover item: ${error.message}`);

  await supabaseAdmin.from("remarcacoes").update({ updated_at: new Date().toISOString() }).eq("id", remarcacaoId);

  await appendHistorico(remarcacaoId, itemId, {
    changedById: actorId,
    changedByName: actorName,
    action: "removed_item",
  });
}

// ── FINALIZAÇÃO ────────────────────────────────────────────

export async function finalizeRemarcacao(
  id: string,
  input: unknown,
  storeId: string | null,
  actorId: string,
  actorName: string,
): Promise<Remarcacao> {
  const payload = finalizeRemarcacaoSchema.parse(input);

  const existing = await getRemarcacaoById(id, storeId);
  if (!existing) throw new Error("Lote não encontrado.");
  if (existing.status === "completed") throw new Error("Lote já finalizado.");
  if (existing.status === "cancelled") throw new Error("Lote cancelado.");
  
  if (!existing.itens || existing.itens.length === 0) {
    throw new Error("Não é possível finalizar um lote sem nenhum item.");
  }

  const { data, error } = await supabaseAdmin
    .from("remarcacoes")
    .update({
      manager_id: payload.managerId,
      manager_name: payload.managerName,
      manager_signature_b64: payload.managerSignatureB64,
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*, stores(name)")
    .single();

  if (error) throw new Error(`Erro ao finalizar lote: ${error.message}`);

  const finalized = toRemarcacao(data as DbRemarcacao);

  await appendHistorico(finalized.id, null, {
    changedById: actorId,
    changedByName: actorName,
    action: "completed",
  });

  return finalized;
}

export async function reopenRemarcacao(
  id: string,
  storeId: string | null,
  actorId: string,
  actorName: string,
): Promise<Remarcacao> {
  const existing = await getRemarcacaoById(id, storeId);
  if (!existing) throw new Error("Lote não encontrado.");
  if (existing.status !== "completed" && existing.status !== "pending_approval") {
    throw new Error("Apenas lotes concluídos ou pendentes podem ser reabertos.");
  }

  const { data, error } = await supabaseAdmin
    .from("remarcacoes")
    .update({
      status: "draft",
      manager_id: null,
      manager_name: null,
      manager_signature_b64: null,
      completed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*, stores(name)")
    .single();

  if (error) throw new Error(`Erro ao reabrir lote: ${error.message}`);

  const reopened = toRemarcacao(data as DbRemarcacao);

  await appendHistorico(reopened.id, null, {
    changedById: actorId,
    changedByName: actorName,
    action: "reopened",
    oldValue: existing.status,
    newValue: "draft",
  });

  return reopened;
}

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
  if (error) throw new Error(`Erro ao deletar lote: ${error.message}`);
}

// ── BUSCA POR PRODUTO (HISTÓRICO) ──────────────────────────

export async function getRemarcacoesByBarcode(barcode: string, storeId?: string | null): Promise<Remarcacao[]> {
  // Busca todos os lotes que possuem um item com esse barcode
  let itemsQuery = supabaseAdmin
    .from("remarcacao_itens")
    .select("remarcacao_id")
    .eq("barcode", barcode)
    .is("deleted_at", null);

  const { data: itemData, error: itemError } = await itemsQuery;
  if (itemError) throw new Error(`Erro ao buscar itens: ${itemError.message}`);
  
  if (!itemData || itemData.length === 0) return [];
  
  const batchIds = [...new Set(itemData.map(i => i.remarcacao_id))];

  let query = supabaseAdmin
    .from("remarcacoes")
    .select(`
      id, store_id, collaborator_id, operator_name, manager_id, manager_name, status,
      created_at, updated_at, completed_at, deleted_at,
      stores(name),
      remarcacao_itens(id, remarcacao_id, barcode, original_value_cents, remarked_value_cents, created_at, deleted_at)
    `)
    .in("id", batchIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (storeId) query = query.eq("store_id", storeId);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar lotes do barcode: ${error.message}`);

  return (data as unknown as DbRemarcacao[]).map((row) => {
    if (row.remarcacao_itens) {
      row.remarcacao_itens = row.remarcacao_itens.filter(i => !i.deleted_at && i.barcode === barcode);
    }
    return toRemarcacao(row);
  });
}

// ── HISTÓRICO ─────────────────────────────────────────────────

type AppendHistoricoParams = {
  changedById: string;
  changedByName: string;
  action: RemarcacaoHistoricoAction;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  snapshot?: any;
};

async function appendHistorico(
  remarcacaoId: string,
  itemId: string | null,
  params: AppendHistoricoParams,
): Promise<void> {
  try {
    await supabaseAdmin.from("remarcacao_historico").insert({
      remarcacao_id: remarcacaoId,
      item_id: itemId,
      changed_by_id: params.changedById,
      changed_by_name: params.changedByName,
      action: params.action,
      field_changed: params.fieldChanged ?? null,
      old_value: params.oldValue ?? null,
      new_value: params.newValue ?? null,
      snapshot: params.snapshot ? JSON.stringify(params.snapshot) : null,
    });
  } catch (err) {
    console.error("[remarcacoes] Falha ao registrar histórico:", err);
  }
}

export async function listHistorico(remarcacaoId: string): Promise<RemarcacaoHistorico[]> {
  const { data, error } = await supabaseAdmin
    .from("remarcacao_historico")
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
    itemId: row.item_id,
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
