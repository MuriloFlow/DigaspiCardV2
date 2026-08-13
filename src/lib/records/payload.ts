import "server-only";

import { buildRecordsPayload } from "./domain";
import { listDailyMetrics } from "./daily-metrics-repository";
import { listDigitacoes } from "./digitacoes-repository";
import { listDailySales, listMonthlyGoals } from "./planning-repository";
import { listRecords } from "./repository";
import { listTrocas } from "./trocas-repository";
import { listViradasPu } from "./viradas-pu-repository";

export async function loadRecordsPayload(storeId?: string | null) {
  const [
    records,
    digitacoes,
    dailyMetrics,
    trocas,
    viradasPu,
    monthlyGoals,
    dailySales,
  ] = await Promise.all([
    listRecords(storeId),
    listDigitacoes(storeId),
    listDailyMetrics(storeId),
    listTrocas(storeId),
    listViradasPu(storeId),
    listMonthlyGoals(storeId),
    listDailySales(storeId),
  ]);

  return buildRecordsPayload(
    records,
    digitacoes,
    dailyMetrics,
    trocas,
    viradasPu,
    monthlyGoals,
    dailySales,
  );
}
