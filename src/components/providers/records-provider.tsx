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
import type {
  CreateRecordPayload,
  DashboardSummary,
  OperatorRecord,
  RecordsPayload,
} from "@/lib/records/types";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase/client";

type RecordsContextValue = RecordsPayload & {
  digitacoes: import("@/lib/records/digitacoes-repository").Digitacao[];
  dailyMetrics: import("@/lib/records/types").DailyMetric[];
  trocas: import("@/lib/records/trocas-repository").Troca[];
  viradasPu: import("@/lib/records/viradas-pu-repository").ViradaPu[];
  isCreating: boolean;
  isLoading: boolean;
  isDeleting: string | null;
  error: string | null;
  createRecord: (payload: CreateRecordPayload) => Promise<OperatorRecord>;
  deleteRecord: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const emptySummary: DashboardSummary = {
  totalCards: 0,
  totalAmountInCents: 0,
  operatorCount: 0,
  topOperator: null,
};

const RecordsContext = createContext<RecordsContextValue | null>(null);

async function parseApiError(response: Response) {
  try {
    const data = (await response.json()) as {
      message?: string;
      errors?: Array<{ message: string }>;
    };

    if (data.errors?.length) {
      return data.errors.map((error) => error.message).join(" ");
    }

    return data.message ?? "Nao foi possivel concluir a acao.";
  } catch {
    return "Nao foi possivel concluir a acao.";
  }
}

export function RecordsProvider({ children }: { children: ReactNode }) {
  const { selectedStoreId } = useAuth();
  const [records, setRecords] = useState<OperatorRecord[]>([]);
  const [digitacoes, setDigitacoes] = useState<import("@/lib/records/digitacoes-repository").Digitacao[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<import("@/lib/records/types").DailyMetric[]>([]);
  const [trocas, setTrocas] = useState<import("@/lib/records/trocas-repository").Troca[]>([]);
    const [viradasPu, setViradasPu] = useState<import("@/lib/records/viradas-pu-repository").ViradaPu[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setError(null);

    try {
      const url = selectedStoreId ? `/api/records?storeId=${selectedStoreId}` : "/api/records";
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const data = (await response.json()) as RecordsPayload;
      setRecords(data.records);
      setDigitacoes(data.digitacoes ?? []);
      setDailyMetrics(data.dailyMetrics ?? []);
      setTrocas(data.trocas ?? []);
        setViradasPu(data.viradasPu ?? []);
      setSummary(data.summary);
    } catch (loadError) {
      let errorMessage = "Não foi possível carregar os registros.";
      if (loadError instanceof Error) {
        errorMessage = loadError.message.includes("Failed to fetch") 
          ? "Sem conexão com o servidor. Verifique sua internet ou VPN." 
          : loadError.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    void Promise.resolve().then(loadRecords);
  }, [loadRecords]);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        () => {
          void loadRecords();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadRecords]);

  const createRecord = useCallback(async (payload: CreateRecordPayload) => {
    setIsCreating(true);
    setError(null);

    try {
      const finalPayload = selectedStoreId 
        ? { ...payload, storeId: selectedStoreId } 
        : payload;
      const response = await fetch("/api/records", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalPayload),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const data = (await response.json()) as RecordsPayload & {
        record: OperatorRecord;
      };

      setRecords(data.records);
      setDigitacoes(data.digitacoes ?? []);
      setDailyMetrics(data.dailyMetrics ?? []);
      setTrocas(data.trocas ?? []);
        setViradasPu(data.viradasPu ?? []);
      setSummary(data.summary);

      return data.record;
    } finally {
      setIsCreating(false);
    }
  }, [selectedStoreId]);

  const deleteRecord = useCallback(async (id: string) => {
    setIsDeleting(id);
    setError(null);

    try {
      const url = selectedStoreId ? `/api/records?id=${id}&storeId=${selectedStoreId}` : `/api/records?id=${id}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const data = (await response.json()) as RecordsPayload;
      setRecords(data.records);
      setDigitacoes(data.digitacoes ?? []);
      setDailyMetrics(data.dailyMetrics ?? []);
      setTrocas(data.trocas ?? []);
        setViradasPu(data.viradasPu ?? []);
      setSummary(data.summary);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Nao foi possivel deletar o registro.",
      );
      throw deleteError;
    } finally {
      setIsDeleting(null);
    }
  }, [selectedStoreId]);

  const value = useMemo<RecordsContextValue>(
    () => ({
      records,
      digitacoes,
      dailyMetrics,
      trocas,
      viradasPu,
      summary,
      isCreating,
      isLoading,
      isDeleting,
      error,
      createRecord,
      deleteRecord,
      refresh: loadRecords,
    }),
    [createRecord, deleteRecord, error, isCreating, isDeleting, isLoading, loadRecords, records, digitacoes, dailyMetrics, trocas, viradasPu, summary],
  );

  return (
    <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>
  );
}

export function useRecords() {
  const context = useContext(RecordsContext);

  if (!context) {
    throw new Error("useRecords precisa estar dentro de RecordsProvider.");
  }

  return context;
}


