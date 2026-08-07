import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { RemarcacoesProvider } from "@/components/providers/remarcacoes-provider";
import { RemarcacoesView } from "@/components/remarcacoes/remarcacoes-view";

export const metadata = {
  title: "Remarcações | Sistema",
  description: "Registre e acompanhe remarcações de preço de produtos com rastreabilidade completa.",
};

export default async function RemarcacaoPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <RemarcacoesProvider>
      <RemarcacoesView />
    </RemarcacoesProvider>
  );
}
