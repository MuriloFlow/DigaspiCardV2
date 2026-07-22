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

export function groupRecordsByDate(records: OperatorRecord[]) {
  const groups = new Map<string, OperatorRecord[]>();

  sortRecordsByNewest(records).forEach((record) => {
    const dateKey = toDateKey(record.createdAt);
    const current = groups.get(dateKey) ?? [];
    groups.set(dateKey, [...current, record]);
  });

  return Array.from(groups.entries()).map<DateGroup>(([dateKey, items]) => ({
    dateKey,
    label: formatLongDate(dateKey),
    relativeLabel: formatRelativeDate(dateKey),
    records: items,
    count: items.length,
    totalInCents: items.reduce(
      (total, record) => total + record.amountInCents,
      0,
    ),
    operators: aggregateByOperator(items),
  }));
}

export function groupRecordsByMonth(
  records: OperatorRecord[],
  digitacoes: import("./digitacoes-repository").Digitacao[] = [],
  dailyMetrics: import("./types").DailyMetric[] = []
): MonthGroup[] {
  const months = new Map<string, OperatorRecord[]>();
  const digitacoesByMonth = new Map<string, import("./digitacoes-repository").Digitacao[]>();
  const customersByMonth = new Map<string, number>();

  // Group records by month
  sortRecordsByNewest(records).forEach((record) => {
    const monthKey = toMonthKey(record.createdAt);
    const current = months.get(monthKey) ?? [];
    months.set(monthKey, [...current, record]);
  });

  // Group digitacoes by month
  digitacoes.forEach((dig) => {
    const monthKey = toMonthKey(dig.createdAt);
    const current = digitacoesByMonth.get(monthKey) ?? [];
    digitacoesByMonth.set(monthKey, [...current, dig]);
  });

  // Group dailyMetrics by month
  dailyMetrics.forEach((metric) => {
    const monthKey = toMonthKey(metric.dateKey);
    const current = customersByMonth.get(monthKey) ?? 0;
    customersByMonth.set(monthKey, current + metric.totalCustomers);
  });

  // Create a combined list of all monthKeys
  const allMonthKeys = new Set([
    ...months.keys(),
    ...digitacoesByMonth.keys(),
    ...customersByMonth.keys(),
  ]);

  return Array.from(allMonthKeys).map<MonthGroup>((monthKey) => {
    const [yearStr] = monthKey.split("-");
    const items = months.get(monthKey) ?? [];
    const digs = digitacoesByMonth.get(monthKey) ?? [];
    const totalCustomers = customersByMonth.get(monthKey) ?? 0;

    return {
      monthKey,
      label: formatMonth(monthKey),
      year: Number(yearStr),
      records: items,
      digitacoes: digs,
      count: items.length,
      activeCount: items.filter((r) => r.activated).length,
      totalInCents: items.reduce((total, r) => total + r.amountInCents, 0),
      totalCustomers,
      dateGroups: groupRecordsByDate(items), // Could also group digitacoes by date if needed later
    };
  }).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

export function getDateGroup(records: OperatorRecord[], dateKey: string) {
  return groupRecordsByDate(records).find((group) => group.dateKey === dateKey);
}

export function buildRecordsPayload(
  records: OperatorRecord[],
  digitacoes: import("./digitacoes-repository").Digitacao[] = [],
  dailyMetrics: import("./types").DailyMetric[] = []
): RecordsPayload {
  const sortedRecords = sortRecordsByNewest(records);

  return {
    records: sortedRecords,
    digitacoes,
    dailyMetrics,
    summary: buildDashboardSummary(sortedRecords),
  };
}
