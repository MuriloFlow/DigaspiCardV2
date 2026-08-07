"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./auth-provider";
import type { Remarcacao } from "@/lib/remarcacoes/types";

type RemarcacoesContextValue = {
  remarcacoes: Remarcacao[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createRemarcacao: (params: {
    collaboratorId: string;
    operatorName: string;
    storeId?: string;
  }) => Promise<Remarcacao>;
  updateRemarcacao: (
    id: string,
    fields: Partial<{
      barcode: string;
      internalCode: string;
      labelPhotoB64: string;        // base64 da foto da etiqueta
      originalValueCents: number;
      remarkedValueCents: number;
      notes: string;
      status: Remarcacao["status"];
    }>,
  ) => Promise<Remarcacao>;
  finalizeRemarcacao: (
    id: string,
    params: {
      managerId: string;
      managerName: string;
      managerSignatureB64: string;  // base64 da assinatura
    },
  ) => Promise<Remarcacao>;
  deleteRemarcacao: (id: string) => Promise<void>;
};

const RemarcacoesContext = createContext<RemarcacoesContextValue | null>(null);

export function useRemarcacoes() {
  const ctx = useContext(RemarcacoesContext);
  if (!ctx) throw new Error("useRemarcacoes must be used inside RemarcacoesProvider");
  return ctx;
}

export function RemarcacoesProvider({ children }: { children: React.ReactNode }) {
  const { user, selectedStoreId } = useAuth();
  const [remarcacoes, setRemarcacoes] = useState<Remarcacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const storeQuery = selectedStoreId ? `?storeId=${selectedStoreId}` : "";

  // ── Fetch lista (sem base64 pesado) ──────────────────────
  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/remarcacoes${storeQuery}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Erro ao carregar remarcações.");
      const data = await res.json();
      setRemarcacoes(data.remarcacoes ?? []);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setIsLoading(false);
    }
  }, [storeQuery]);

  useEffect(() => {
    if (!user) return;
    refresh();
    return () => abortRef.current?.abort();
  }, [user, refresh]);

  // ── Criar remarcação ─────────────────────────────────────
  const createRemarcacao = useCallback(
    async (params: { collaboratorId: string; operatorName: string; storeId?: string }) => {
      setIsCreating(true);
      try {
        const body: Record<string, string> = {
          collaboratorId: params.collaboratorId,
          operatorName: params.operatorName,
        };
        if (params.storeId) body.storeId = params.storeId;

        const res = await fetch("/api/remarcacoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Erro ao criar remarcação.");

        const nova: Remarcacao = data.remarcacao;
        setRemarcacoes((prev) => [nova, ...prev]);
        return nova;
      } finally {
        setIsCreating(false);
      }
    },
    [],
  );

  // ── Auto-save incremental (aceita labelPhotoB64 como base64) ─
  const updateRemarcacao = useCallback(
    async (id: string, fields: Record<string, unknown>) => {
      const res = await fetch(`/api/remarcacoes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Erro ao atualizar remarcação.");

      const updated: Remarcacao = data.remarcacao;
      setRemarcacoes((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    },
    [],
  );

  // ── Finalizar com assinatura base64 ──────────────────────
  const finalizeRemarcacao = useCallback(
    async (
      id: string,
      params: { managerId: string; managerName: string; managerSignatureB64: string },
    ) => {
      const res = await fetch(`/api/remarcacoes/${id}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Erro ao finalizar remarcação.");

      const finalized: Remarcacao = data.remarcacao;
      setRemarcacoes((prev) => prev.map((r) => (r.id === id ? finalized : r)));
      return finalized;
    },
    [],
  );

  // ── Soft delete ───────────────────────────────────────────
  const deleteRemarcacao = useCallback(async (id: string) => {
    const res = await fetch(`/api/remarcacoes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message ?? "Erro ao deletar remarcação.");
    }
    setRemarcacoes((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return (
    <RemarcacoesContext.Provider
      value={{
        remarcacoes,
        isLoading,
        isCreating,
        error,
        refresh,
        createRemarcacao,
        updateRemarcacao,
        finalizeRemarcacao,
        deleteRemarcacao,
      }}
    >
      {children}
    </RemarcacoesContext.Provider>
  );
}
