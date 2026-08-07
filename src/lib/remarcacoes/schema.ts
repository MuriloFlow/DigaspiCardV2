import { z } from "zod";

// ── Criar remarcação (rascunho inicial) ─────────────────────
export const createRemarcacaoSchema = z.object({
  storeId: z.string().uuid("storeId deve ser um UUID válido."),
  collaboratorId: z.string().uuid("collaboratorId deve ser um UUID válido."),
  operatorName: z.string().min(1, "Nome do operador é obrigatório.").max(200),
});

// ── Atualização incremental (auto-save) ──────────────────────
export const updateRemarcacaoSchema = z.object({
  barcode: z.string().max(100).optional(),
  internalCode: z.string().max(100).optional(),
  // Base64 da foto da etiqueta
  labelPhotoB64: z
    .string()
    .refine(
      (v) => v.startsWith("data:image/"),
      "labelPhotoB64 deve ser uma imagem em base64 (data:image/...).",
    )
    .optional(),
  originalValueCents: z
    .number()
    .int("Valor deve ser inteiro (centavos).")
    .min(0, "Valor deve ser positivo.")
    .optional(),
  remarkedValueCents: z
    .number()
    .int("Valor deve ser inteiro (centavos).")
    .min(0, "Valor deve ser positivo.")
    .optional(),
  notes: z.string().max(1000).optional(),
  status: z
    .enum(["draft", "pending_approval", "completed", "cancelled"])
    .optional(),
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
export type UpdateRemarcacaoInput = z.infer<typeof updateRemarcacaoSchema>;
export type FinalizeRemarcacaoInput = z.infer<typeof finalizeRemarcacaoSchema>;
