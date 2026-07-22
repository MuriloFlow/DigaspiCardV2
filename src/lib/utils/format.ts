import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const integerFormatter = new Intl.NumberFormat("pt-BR");

export function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

export function formatInteger(value: number) {
  return integerFormatter.format(value);
}

export function parseCurrencyInput(value: string) {
  const cents = Number(value.replace(/\D/g, ""));
  return Number.isFinite(cents) ? cents : 0;
}

export function formatCurrencyInput(value: string) {
  return formatCurrency(parseCurrencyInput(value));
}

export function toDateKey(isoDate: string) {
  return format(parseISO(isoDate), "yyyy-MM-dd");
}

export function toMonthKey(isoDate: string) {
  return format(parseISO(isoDate), "yyyy-MM");
}

function dateKeyToLocalDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatLongDate(dateKey: string) {
  return format(dateKeyToLocalDate(dateKey), "d 'de' MMMM, yyyy", {
    locale: ptBR,
  });
}

export function formatShortDate(dateKey: string) {
  return format(dateKeyToLocalDate(dateKey), "dd/MM/yyyy", { locale: ptBR });
}

function monthKeyToLocalDate(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

export function formatMonth(monthKey: string) {
  const str = format(monthKeyToLocalDate(monthKey), "MMMM", { locale: ptBR });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function formatRelativeDate(dateKey: string) {
  const date = dateKeyToLocalDate(dateKey);

  if (isToday(date)) {
    return "Hoje";
  }

  if (isYesterday(date)) {
    return "Ontem";
  }

  return format(date, "EEEE", { locale: ptBR });
}

export function formatTime(isoDate: string) {
  return format(parseISO(isoDate), "HH:mm", { locale: ptBR });
}
