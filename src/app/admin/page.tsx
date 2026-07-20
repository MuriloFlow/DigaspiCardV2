import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { getAdminData } from "./actions";
import { AdminPanel } from "./admin-panel";
import { getGlobalMetrics } from "@/lib/records/repository";

export default async function AdminPage() {
  const [data, metrics] = await Promise.all([
    getAdminData(),
    getGlobalMetrics().catch(() => null),
  ]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Gerenciamento Global"
        title="Rede & Usuários"
        description="Controle centralizado de todas as unidades, contas e métricas da rede."
      />
      <AdminPanel initialData={data} metrics={metrics} />
    </PageContainer>
  );
}
