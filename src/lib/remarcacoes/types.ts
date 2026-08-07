// ============================================================
// DTOs e Tipos — Módulo de Remarcação (Lotes)
// ============================================================

export type RemarcacaoStatus = "draft" | "pending_approval" | "completed" | "cancelled";

export type RemarcacaoItem = {
  id: string;
  remarcacaoId: string;
  barcode: string;
  internalCode: string | null;
  labelPhotoB64: string;
  originalValueCents: number;
  remarkedValueCents: number;
  notes: string | null;
  createdAt: string;
  deletedAt: string | null;
};

export type Remarcacao = {
  id: string;
  storeId: string;
  collaboratorId: string | null;
  operatorName: string;

  // Aprovação
  managerId: string | null;
  managerName: string | null;
  managerSignatureB64: string | null;

  // Status
  status: RemarcacaoStatus;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  deletedAt: string | null;

  // Relacionamentos Opcionais
  storeName?: string;
  itens?: RemarcacaoItem[];
};

export type RemarcacaoHistorico = {
  id: string;
  remarcacaoId: string;
  itemId: string | null;
  changedById: string | null;
  changedByName: string;
  action: RemarcacaoHistoricoAction;
  fieldChanged: string | null;
  oldValue: string | null;
  newValue: string | null;
  snapshot: any | null;
  createdAt: string;
};

export type RemarcacaoHistoricoAction =
  | "created"
  | "added_item"
  | "removed_item"
  | "updated_status"
  | "completed"
  | "cancelled"
  | "reopened"
  | "deleted";

// ── DTOs de Entrada ──────────────────────────────────────────

export type CreateRemarcacaoDTO = {
  storeId: string;
  collaboratorId: string;
  operatorName: string;
};

export type AddItemDTO = {
  remarcacaoId: string;
  barcode: string;
  internalCode?: string;
  labelPhotoB64: string;
  originalValueCents: number;
  remarkedValueCents: number;
  notes?: string;
};

export type UpdateRemarcacaoStatusDTO = {
  status: RemarcacaoStatus;
};

export type FinalizeRemarcacaoDTO = {
  managerId: string;
  managerName: string;
  managerSignatureB64: string; 
};

// ── Summary ──────────────────────────────────────────────────

export type RemarcacaoSummary = {
  totalBatches: number;
  completedBatches: number;
  draftBatches: number;
  totalItems: number;
  totalSavings: number; // soma de (original - remarked) de todos os itens concluídos
};
