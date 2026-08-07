// ============================================================
// DTOs e Tipos — Módulo de Remarcação
// Sem Storage — tudo salvo como base64 direto no Supabase
// ============================================================

export type RemarcacaoStatus = "draft" | "pending_approval" | "completed" | "cancelled";

export type Remarcacao = {
  id: string;
  storeId: string;
  collaboratorId: string | null;
  operatorName: string;

  // Produto
  barcode: string | null;
  internalCode: string | null;

  // Foto da etiqueta (base64: "data:image/jpeg;base64,...")
  labelPhotoB64: string | null;

  // Valores
  originalValueCents: number | null;
  remarkedValueCents: number | null;

  // Complementares
  notes: string | null;

  // Aprovação
  managerId: string | null;
  managerName: string | null;

  // Assinatura do gerente (base64: "data:image/png;base64,...")
  managerSignatureB64: string | null;

  // Status
  status: RemarcacaoStatus;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  deletedAt: string | null;

  // Relation opcional (quando JOIN'd)
  storeName?: string;
};

export type RemarcacaoHistorico = {
  id: string;
  remarcacaoId: string;
  changedById: string | null;
  changedByName: string;
  action: RemarcacaoHistoricoAction;
  fieldChanged: string | null;
  oldValue: string | null;
  newValue: string | null;
  snapshot: Remarcacao | null;
  createdAt: string;
};

export type RemarcacaoHistoricoAction =
  | "created"
  | "updated"
  | "photo_added"
  | "barcode_scanned"
  | "values_set"
  | "completed"
  | "cancelled";

// ── DTOs de Entrada ──────────────────────────────────────────

export type CreateRemarcacaoDTO = {
  storeId: string;
  collaboratorId: string;
  operatorName: string;
};

export type UpdateRemarcacaoDTO = {
  barcode?: string;
  internalCode?: string;
  labelPhotoB64?: string;       // base64 da foto da etiqueta
  originalValueCents?: number;
  remarkedValueCents?: number;
  notes?: string;
  status?: RemarcacaoStatus;
};

export type FinalizeRemarcacaoDTO = {
  managerId: string;
  managerName: string;
  managerSignatureB64: string;  // base64 da assinatura do gerente
};

// ── Summary ──────────────────────────────────────────────────

export type RemarcacaoSummary = {
  total: number;
  completed: number;
  draft: number;
  pendingApproval: number;
  totalSavings: number; // soma de (original - remarked) para concluídas
};
