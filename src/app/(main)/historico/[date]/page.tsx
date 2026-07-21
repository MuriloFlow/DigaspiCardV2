import { HistoryDetailView } from "@/components/records/history-detail-view";

export default async function HistoricoDetalhePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  return <HistoryDetailView dateKey={date} />;
}
