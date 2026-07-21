/**
 * Mapa centralizado de tags de subcargo.
 * Usado em RecordCard, RankingView, OperatorPieChart e afins.
 */

const ROLE_TAG_MAP: Record<string, { abbr: string; cls: string }> = {
  "Funcionario Operacional": { abbr: "OP", cls: "bg-purple-100 text-purple-700" },
  "Caixa":                   { abbr: "CX", cls: "bg-blue-100 text-blue-700" },
  "Lider de Caixa":          { abbr: "LC", cls: "bg-rose-100 text-rose-700" },
  "VM":                      { abbr: "VM", cls: "bg-pink-100 text-pink-700" },
  "Vendedor":                { abbr: "VD", cls: "bg-emerald-100 text-emerald-700" },
  "Gerente":                 { abbr: "GR", cls: "bg-yellow-100 text-yellow-700" },
};

export type SubRoleTagProps = {
  subRole?: string;
  className?: string;
};

/**
 * Renderiza uma tag compacta (2 letras) do subcargo do colaborador.
 * Retorna null se subRole for desconhecido ou ausente.
 */
export function SubRoleTag({ subRole, className = "" }: SubRoleTagProps) {
  if (!subRole) return null;
  const tag = ROLE_TAG_MAP[subRole];
  if (!tag) return null;

  return (
    <span
      className={`inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tag.cls} ${className}`}
      title={subRole}
    >
      {tag.abbr}
    </span>
  );
}
