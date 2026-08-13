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
import { useAuth } from "@/components/providers/auth-provider";
import { getDigitacaoQuantity, sumDigitacoes } from "@/lib/records/digitacoes-utils";
import {
  notifyRecordsChanged,
  subscribeToLocalRecordChanges,
} from "@/lib/records/realtime-client";

export type Digitacao = {
  id: string;
  collaboratorId: string;
  operatorName: string;
  clientName: string;
  quantity: number;
  createdAt: string;
  subRole?: string;
};

type DigitacoesContextValue = {
  digitacoes: Digitacao[];
  todayDigitacoes: Digitacao[];
  todayOperators: OperatorSummary[];
  todayCount: number;
  isLoading: boolean;
  isCreating: boolean;
  createDigitacao: (collaboratorId: string, clientName: string, dateKey?: string) => Promise<Digitacao>;
  refresh: () => Promise<void>;
};

const DigitacoesContext = createContext<DigitacoesContextValue | null>(null);

export function DigitacoesProvider({ children }: { children: ReactNode }) {
  const { selectedStoreId } = useAuth();
  const [digitacoes, setDigitacoes] = useState<Digitacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const url = selectedStoreId ? `/api/digitacoes?storeId=${selectedStoreId}` : "/api/digitacoes";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json() as { digitacoes: Digitacao[] };
      setDigitacoes(data.digitacoes);
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  useEffect(() => {
    return subscribeToLocalRecordChanges(() => {
      void load();
    });
  }, [load]);

  const todayKey = toDateKey(new Date().toISOString());
  const todayDigitacoes = useMemo(
    () => digitacoes.filter((d) => toDateKey(d.createdAt) === todayKey),
    [digitacoes, todayKey],
  );

  const todayOperators = useMemo<OperatorSummary[]>(() => {
    const map = new Map<string, { count: number; collaboratorId: string; subRole?: string }>();
    todayDigitacoes.forEach((d) => {
      const cur = map.get(d.operatorName) ?? { count: 0, collaboratorId: d.collaboratorId, subRole: d.subRole };
      map.set(d.operatorName, { count: cur.count + getDigitacaoQuantity(d), collaboratorId: d.collaboratorId, subRole: cur.subRole ?? d.subRole });
    });
    const total = sumDigitacoes(todayDigitacoes);
    return Array.from(map.entries())
      .map<OperatorSummary>(([name, val], idx) => ({
        operatorName: name,
        collaboratorId: val.collaboratorId,
        subRole: val.subRole,
        count: val.count,
        totalInCents: 0,
        averageInCents: 0,
        percentage: total ? (val.count / total) * 100 : 0,
        color: getOperatorColor(name, idx),
      }))
      .sort((a, b) => b.count - a.count);
  }, [todayDigitacoes]);

  const createDigitacao = useCallback(async (collaboratorId: string, clientName: string, dateKey?: string): Promise<Digitacao> => {
    setIsCreating(true);
    try {
      const payload: {
        collaboratorId: string;
        clientName: string;
        storeId?: string;
        dateKey?: string;
      } = selectedStoreId 
        ? { collaboratorId, clientName, storeId: selectedStoreId }
        : { collaboratorId, clientName };
      
      if (dateKey) payload.dateKey = dateKey;

      const res = await fetch("/api/digitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        throw new Error(err.message ?? "Erro ao salvar digitação.");
      }
      const data = await res.json() as { digitacao: Digitacao; digitacoes: Digitacao[] };
      setDigitacoes(data.digitacoes);
      notifyRecordsChanged();
      return data.digitacao;
    } finally {
      setIsCreating(false);
    }
  }, [selectedStoreId]);

  const value = useMemo<DigitacoesContextValue>(
    () => ({
      digitacoes,
      todayDigitacoes,
      todayOperators,
      todayCount: sumDigitacoes(todayDigitacoes),
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
