import { PageContainer, PageHeader } from "@/components/layout/page-container";
import { getAdminData } from "./actions";
import { AdminPanel } from "./admin-panel";

export default async function AdminPage() {
  const data = await getAdminData();

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Gerenciamento Global"
        title="Rede & Usuários"
        description="Controle total sobre as lojas (unidades) e contas de acesso ao sistema."
      />
      <AdminPanel initialData={data} />
    </PageContainer>
  );
}
