import { z } from "zod";

const textField = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} precisa ter pelo menos 2 caracteres.`)
    .max(80, `${label} deve ter no maximo 80 caracteres.`)
    .regex(/\p{L}/u, `${label} precisa conter letras.`);

export const createRecordSchema = z
  .object({
    collaboratorId: z.string().uuid("Colaborador inválido."),
    clientName: textField("Nome do cliente"),
    amountInCents: z
      .coerce
      .number()
      .int("Valor do cartao precisa ser um numero inteiro em centavos.")
      .min(1, "Valor do cartao precisa ser maior que zero.")
      .max(99_999_999, "Valor do cartao excede o limite permitido."),
    amountUsedInCents: z
      .coerce
      .number()
      .int("Valor utilizado precisa ser um numero inteiro.")
      .min(0, "Valor utilizado nǜo pode ser negativo.")
      .optional(),
    activated: z.boolean().default(false),
  })
  .strict();

export type CreateRecordInput = z.infer<typeof createRecordSchema>;
