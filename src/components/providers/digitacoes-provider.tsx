"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { OperatorSummary } from "@/lib/records/types";
import { getOperatorColor } from "@/lib/records/colors";
import { toDateKey } from "@/lib/utils/format";

export type Digitacao = {
  id: string;
  collaboratorId: string;
  operatorName: string;
  clientName: string;
  createdAt: string;
};

type DigitacoesContextValue = {
  digitacoes: Digitacao[];
  todayDigitacoes: Digitacao[];
  todayOperators: OperatorSummary[];
  todayCount: number;
  isLoading: boolean;
  isCreating: boolean;
  createDigitacao: (collaboratorId: string, clientName: string) => Promise<Digitacao>;
  refresh: () => Promise<void>;
};

const DigitacoesContext = createContext<DigitacoesContextValue | null>(null);

export function DigitacoesProvider({ children }: { children: ReactNode }) {
  const [digitacoes, setDigitacoes] = useState<Digitacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/digitacoes", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json() as { digitacoes: Digitacao[] };
      setDigitacoes(data.digitacoes);
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const todayKey = toDateKey(new Date().toISOString());
  const todayDigitacoes = useMemo(
    () => digitacoes.filter((d) => toDateKey(d.createdAt) === todayKey),
    [digitacoes, todayKey],
  );

  const todayOperators = useMemo<OperatorSummary[]>(() => {
    const map = new Map<string, { count: number; collaboratorId: string }>();
    todayDigitacoes.forEach((d) => {
      const cur = map.get(d.operatorName) ?? { count: 0, collaboratorId: d.collaboratorId };
      map.set(d.operatorName, { count: cur.count + 1, collaboratorId: d.collaboratorId });
    });
    const total = todayDigitacoes.length;
    return Array.from(map.entries())
      .map<OperatorSummary>(([name, val], idx) => ({
        operatorName: name,
        collaboratorId: val.collaboratorId,
        count: val.count,
        totalInCents: 0,
        averageInCents: 0,
        percentage: total ? (val.count / total) * 100 : 0,
        color: getOperatorColor(name, idx),
      }))
      .sort((a, b) => b.count - a.count);
  }, [todayDigitacoes]);

  const createDigitacao = useCallback(async (collaboratorId: string, clientName: string): Promise<Digitacao> => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/digitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ collaboratorId, clientName }),
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        throw new Error(err.message ?? "Erro ao salvar digitação.");
      }
      const data = await res.json() as { digitacao: Digitacao; digitacoes: Digitacao[] };
      setDigitacoes(data.digitacoes);
      return data.digitacao;
    } finally {
      setIsCreating(false);
    }
  }, []);

  const value = useMemo<DigitacoesContextValue>(
    () => ({
      digitacoes,
      todayDigitacoes,
      todayOperators,
      todayCount: todayDigitacoes.length,
      isLoading,
      isCreating,
      createDigitacao,
      refresh: load,
    }),
    [digitacoes, todayDigitacoes, todayOperators, isLoading, isCreating, createDigitacao, load],
  );

  return (
    <DigitacoesContext.Provider value={value}>{children}</DigitacoesContext.Provider>
  );
}

export function useDigitacoes() {
  const ctx = useContext(DigitacoesContext);
  if (!ctx) throw new Error("useDigitacoes precisa estar dentro de DigitacoesProvider.");
  return ctx;
}
