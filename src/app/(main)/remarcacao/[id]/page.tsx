import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { getRemarcacaoById } from "@/lib/remarcacoes/repository";
import { listHistorico } from "@/lib/remarcacoes/repository";
import { RemarcacaoDetailView } from "@/components/remarcacoes/remarcacao-detail-view";
import { RemarcacoesProvider } from "@/components/providers/remarcacoes-provider";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return {
    title: `Remarcação ${id.slice(0, 8)} | Sistema`,
  };
}

export default async function RemarcacaoDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const isGlobalOrRegional = ["GLOBAL_ADMIN", "TI_ADMIN", "REGIONAL_MANAGER"].includes(session.role);
  const storeId = isGlobalOrRegional ? null : session.storeId;

  const [remarcacao, historico] = await Promise.all([
    getRemarcacaoById(id, storeId),
    listHistorico(id),
  ]);

  if (!remarcacao) notFound();

  return (
    <RemarcacoesProvider>
      <RemarcacaoDetailView remarcacao={remarcacao} historico={historico} />
    </RemarcacoesProvider>
  );
}
