import {
  formatLongDate,
  formatRelativeDate,
  toDateKey,
  formatMonth,
  toMonthKey,
} from "@/lib/utils/format";
import { getOperatorColor } from "./colors";
import type {
  DashboardSummary,
  DateGroup,
  OperatorRecord,
  OperatorSummary,
  RecordsPayload,
  MonthGroup,
  MonthlyGoal,
  DailySale,
} from "./types";

export function normalizePersonName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function sortRecordsByNewest(records: OperatorRecord[]) {
  return [...records].sort(
    (left, right) =>
      Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
}

export function getRecentRecords(records: OperatorRecord[], limit = 6) {
  return sortRecordsByNewest(records).slice(0, limit);
}

export function aggregateByOperator(records: OperatorRecord[]) {
  const totals = new Map<string, { count: number; totalInCents: number; collaboratorId?: string; subRole?: string }>();

  records.forEach((record) => {
    const current = totals.get(record.operatorName) ?? {
      count: 0,
      totalInCents: 0,
    };

    totals.set(record.operatorName, {
      count: current.count + 1,
      totalInCents: current.totalInCents + record.amountInCents,
      collaboratorId: record.collaboratorId || current.collaboratorId,
      subRole: current.subRole ?? record.subRole,
    });
  });

  const totalCards = records.length;

  return Array.from(totals.entries())
    .map<OperatorSummary>(([operatorName, total], index) => ({
      operatorName,
      collaboratorId: total.collaboratorId,
      subRole: total.subRole,
      count: total.count,
      totalInCents: total.totalInCents,
      averageInCents: Math.round(total.totalInCents / total.count),
      percentage: totalCards ? (total.count / totalCards) * 100 : 0,
      color: getOperatorColor(operatorName, index),
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return right.totalInCents - left.totalInCents;
    });
}


export function aggregateByStore(records: OperatorRecord[]) {
  const totals = new Map<string, { count: number; totalInCents: number }>();

  records.forEach((record) => {
    const storeName = record.storeName || "Unidade Desconhecida";
    const current = totals.get(storeName) ?? { count: 0, totalInCents: 0 };
    totals.set(storeName, {
      count: current.count + 1,
      totalInCents: current.totalInCents + record.amountInCents,
    });
  });

  const totalCards = records.length;

  return Array.from(totals.entries())
    .map<OperatorSummary>(([storeName, total], index) => ({
      operatorName: storeName, // Usamos operatorName no pie chart/ranking
      count: total.count,
      totalInCents: total.totalInCents,
      averageInCents: Math.round(total.totalInCents / total.count),
      percentage: totalCards ? (total.count / totalCards) * 100 : 0,
      color: getOperatorColor(storeName, index),
    }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      return right.totalInCents - left.totalInCents;
    });
}


export function buildDashboardSummary(
  records: OperatorRecord[],
): DashboardSummary {
  const operators = aggregateByOperator(records);

  return {
    totalCards: records.length,
    totalAmountInCents: records.reduce(
      (total, record) => total + record.amountInCents,
      0,
    ),
    operatorCount: operators.length,
    topOperator: operators[0] ?? null,
  };
}


export function groupRecordsByDate(
  records: OperatorRecord[],
  digitacoes: import("./digitacoes-repository").Digitacao[] = [],
  dailyMetrics: import("./types").DailyMetric[] = [],
  trocas: import("./trocas-repository").Troca[] = [],
  viradasPu: import("./viradas-pu-repository").ViradaPu[] = [],
  dailySales: DailySale[] = [],
) {
  const groups = new Map<string, OperatorRecord[]>();
  const allDateKeys = new Set<string>();
  const salesByDate = new Map<string, number>();

  sortRecordsByNewest(records).forEach((record) => {
    const dateKey = toDateKey(record.createdAt);
    allDateKeys.add(dateKey);
    const current = groups.get(dateKey) ?? [];
    groups.set(dateKey, [...current, record]);
  });

  digitacoes.forEach((dig) => {
    allDateKeys.add(toDateKey(dig.createdAt));
  });

  dailyMetrics.forEach((metric) => {
    allDateKeys.add(metric.dateKey);
  });

  trocas.forEach((troca) => {
    allDateKeys.add(troca.dateKey);
  });

  viradasPu.forEach((v) => {
    allDateKeys.add(v.dateKey);
  });

  dailySales.forEach((sale) => {
    allDateKeys.add(sale.dateKey);
    salesByDate.set(
      sale.dateKey,
      (salesByDate.get(sale.dateKey) ?? 0) + sale.amountInCents,
    );
  });

  return Array.from(allDateKeys)
    .sort((a, b) => b.localeCompare(a))
    .map<DateGroup>((dateKey) => {
      const items = groups.get(dateKey) ?? [];
      return {
        dateKey,
        label: formatLongDate(dateKey),
        relativeLabel: formatRelativeDate(dateKey),
        records: items,
        count: items.length,
        totalInCents: items.reduce(
          (total, record) => total + record.amountInCents,
          0,
        ),
        salesInCents: salesByDate.get(dateKey) ?? 0,
        totalUsedInCents: items.reduce(
          (total, record) => (record.activated || record.activatedLater) && typeof record.amountUsedInCents === 'number' ? total + record.amountUsedInCents : total,
          0,
        ),
        trocasCount: trocas.filter(t => t.dateKey === dateKey).length,
        operators: aggregateByOperator(items),
      };
    });
}


export function groupRecordsByMonth(
  records: OperatorRecord[],
  digitacoes: import("./digitacoes-repository").Digitacao[] = [],
  dailyMetrics: import("./types").DailyMetric[] = [],
  trocas: import("./trocas-repository").Troca[] = [],
  viradasPu: import("./viradas-pu-repository").ViradaPu[] = [],
  monthlyGoals: MonthlyGoal[] = [],
  dailySales: DailySale[] = [],
): MonthGroup[] {
  const months = new Map<string, OperatorRecord[]>();
  const digitacoesByMonth = new Map<string, import("./digitacoes-repository").Digitacao[]>();
  const customersByMonth = new Map<string, number>();
  const trocasByMonth = new Map<string, import("./trocas-repository").Troca[]>();
  const viradasPuByMonth = new Map<string, import("./viradas-pu-repository").ViradaPu[]>();
  const salesByMonth = new Map<string, number>();
  const goalsByMonth = new Map<string, { cardsGoal: number; salesGoalInCents: number }>();

  sortRecordsByNewest(records).forEach((record) => {
    const monthKey = toMonthKey(record.createdAt);
    const current = months.get(monthKey) ?? [];
    months.set(monthKey, [...current, record]);
  });

  digitacoes.forEach((dig) => {
    const monthKey = toMonthKey(dig.createdAt);
    const current = digitacoesByMonth.get(monthKey) ?? [];
    digitacoesByMonth.set(monthKey, [...current, dig]);
  });

  dailyMetrics.forEach((metric) => {
    const monthKey = toMonthKey(metric.dateKey);
    const current = customersByMonth.get(monthKey) ?? 0;
    customersByMonth.set(monthKey, current + metric.totalCustomers);
  });

  trocas.forEach((troca) => {
    const monthKey = troca.dateKey.substring(0, 7);
    const current = trocasByMonth.get(monthKey) ?? [];
    trocasByMonth.set(monthKey, [...current, troca]);
  });

  viradasPu.forEach((v) => {
    const monthKey = v.dateKey.substring(0, 7);
    const current = viradasPuByMonth.get(monthKey) ?? [];
    viradasPuByMonth.set(monthKey, [...current, v]);
  });

  dailySales.forEach((sale) => {
    const monthKey = sale.dateKey.substring(0, 7);
    salesByMonth.set(
      monthKey,
      (salesByMonth.get(monthKey) ?? 0) + sale.amountInCents,
    );
  });

  monthlyGoals.forEach((goal) => {
    const current = goalsByMonth.get(goal.monthKey) ?? {
      cardsGoal: 0,
      salesGoalInCents: 0,
    };

    goalsByMonth.set(goal.monthKey, {
      cardsGoal: current.cardsGoal + (goal.cardsGoal ?? 0),
      salesGoalInCents:
        current.salesGoalInCents + (goal.salesGoalInCents ?? 0),
    });
  });

  const allMonthKeys = new Set([
    ...months.keys(),
    ...digitacoesByMonth.keys(),
    ...trocasByMonth.keys(),
    ...viradasPuByMonth.keys(),
    ...customersByMonth.keys(),
    ...salesByMonth.keys(),
    ...goalsByMonth.keys(),
  ]);

  return Array.from(allMonthKeys).map<MonthGroup>((monthKey) => {
    const [yearStr] = monthKey.split("-");
    const items = months.get(monthKey) ?? [];
    const digs = digitacoesByMonth.get(monthKey) ?? [];
    const monthTrocas = trocasByMonth.get(monthKey) ?? [];
    const monthViradasPu = viradasPuByMonth.get(monthKey) ?? [];
    const totalCustomers = customersByMonth.get(monthKey) ?? 0;
    const monthSalesInCents = salesByMonth.get(monthKey) ?? 0;
    const monthGoals = goalsByMonth.get(monthKey);

    const monthMetrics = dailyMetrics.filter(m => m.dateKey.startsWith(monthKey));
    const monthSales = dailySales.filter((sale) => sale.dateKey.startsWith(monthKey));

    return {
      monthKey,
      label: formatMonth(monthKey),
      year: Number(yearStr),
      records: items,
      digitacoes: digs,
      count: items.length,
      activeCount: items.filter((r) => r.activated && !r.activatedLater).length,
      activeLaterCount: items.filter((r) => r.activatedLater).length,
      totalInCents: items.reduce((total, r) => total + r.amountInCents, 0),
      salesInCents: monthSalesInCents,
      totalUsedInCents: items.reduce((total, r) => (r.activated || r.activatedLater) && typeof r.amountUsedInCents === 'number' ? total + r.amountUsedInCents : total, 0),
      trocasCount: monthTrocas.length,
      totalCustomers,
      monthlyCardsGoal: monthGoals?.cardsGoal ? monthGoals.cardsGoal : null,
      monthlySalesGoalInCents: monthGoals?.salesGoalInCents
        ? monthGoals.salesGoalInCents
        : null,
      dateGroups: groupRecordsByDate(
        items,
        digs,
        monthMetrics,
        monthTrocas,
        monthViradasPu,
        monthSales,
      ),
    };
  }).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}


export function getDateGroup(
  records: OperatorRecord[],
  dateKey: string,
  digitacoes: import("./digitacoes-repository").Digitacao[] = [],
  dailyMetrics: import("./types").DailyMetric[] = [],
  trocas: import("./trocas-repository").Troca[] = [],
  viradasPu: import("./viradas-pu-repository").ViradaPu[] = [],
  dailySales: DailySale[] = [],
) {
  return groupRecordsByDate(
    records,
    digitacoes,
    dailyMetrics,
    trocas,
    viradasPu,
    dailySales,
  ).find((group) => group.dateKey === dateKey);
}

export function buildRecordsPayload(
  records: OperatorRecord[],
  digitacoes: import("./digitacoes-repository").Digitacao[] = [],
  dailyMetrics: import("./types").DailyMetric[] = [],
  trocas: import("./trocas-repository").Troca[] = [],
  viradasPu: import("./viradas-pu-repository").ViradaPu[] = [],
  monthlyGoals: MonthlyGoal[] = [],
  dailySales: DailySale[] = [],
): RecordsPayload {
  const sortedRecords = sortRecordsByNewest(records);

  return {
    records: sortedRecords,
    digitacoes,
    dailyMetrics,
    trocas,
    viradasPu,
    monthlyGoals,
    dailySales,
    summary: buildDashboardSummary(sortedRecords),
  };
}
