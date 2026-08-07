import { z } from "zod";

// ── Criar remarcação (lote inicial) ─────────────────────
export const createRemarcacaoSchema = z.object({
  storeId: z.string().uuid("storeId deve ser um UUID válido."),
  collaboratorId: z.string().uuid("collaboratorId deve ser um UUID válido."),
  operatorName: z.string().min(1, "Nome do operador é obrigatório.").max(200),
});

// ── Adicionar Item ao Lote ──────────────────────────────────
export const addItemSchema = z.object({
  remarcacaoId: z.string().uuid("remarcacaoId deve ser um UUID válido."),
  barcode: z.string().min(1).max(100),
  internalCode: z.string().max(100).optional(),
  labelPhotoB64: z
    .string()
    .refine(
      (v) => v.startsWith("data:image/"),
      "labelPhotoB64 deve ser uma imagem em base64 (data:image/...).",
    ),
  originalValueCents: z
    .number()
    .int("Valor deve ser inteiro (centavos).")
    .min(0, "Valor deve ser positivo."),
  remarkedValueCents: z
    .number()
    .int("Valor deve ser inteiro (centavos).")
    .min(0, "Valor deve ser positivo."),
  notes: z.string().max(1000).optional(),
});

// ── Atualizar status do Lote ──────────────────────────────────
export const updateRemarcacaoStatusSchema = z.object({
  status: z.enum(["draft", "pending_approval", "completed", "cancelled"]),
});

// ── Finalização com assinatura do gerente ────────────────────
export const finalizeRemarcacaoSchema = z.object({
  managerId: z.string().uuid("managerId deve ser um UUID válido."),
  managerName: z.string().min(1, "Nome do gerente é obrigatório.").max(200),
  managerSignatureB64: z
    .string()
    .min(50, "Assinatura inválida.")
    .refine(
      (v) => v.startsWith("data:image/"),
      "Assinatura deve ser uma imagem base64 (data:image/png;base64,...).",
    ),
});

// ── Busca por código de barras ───────────────────────────────
export const searchByBarcodeSchema = z.object({
  barcode: z.string().min(1, "Código de barras é obrigatório.").max(100),
});

export type CreateRemarcacaoInput = z.infer<typeof createRemarcacaoSchema>;
export type AddItemInput = z.infer<typeof addItemSchema>;
export type UpdateRemarcacaoStatusInput = z.infer<typeof updateRemarcacaoStatusSchema>;
export type FinalizeRemarcacaoInput = z.infer<typeof finalizeRemarcacaoSchema>;
