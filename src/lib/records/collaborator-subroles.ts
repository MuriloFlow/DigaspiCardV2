import type { CollaboratorSubRole } from "./types";

export const COLLABORATOR_SUBROLES: CollaboratorSubRole[] = [
  "Funcionario Operacional",
  "Caixa",
  "Lider de Caixa",
  "VM",
];

export const DEFAULT_COLLABORATOR_SUBROLE: CollaboratorSubRole =
  "Funcionario Operacional";

export function normalizeCollaboratorSubRole(value: unknown): CollaboratorSubRole {
  if (typeof value !== "string") return DEFAULT_COLLABORATOR_SUBROLE;
  return COLLABORATOR_SUBROLES.includes(value as CollaboratorSubRole)
    ? (value as CollaboratorSubRole)
    : DEFAULT_COLLABORATOR_SUBROLE;
}
