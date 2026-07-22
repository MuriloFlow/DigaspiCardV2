"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { RecordsProvider } from "./records-provider";
import { RealtimeNotificationsProvider } from "./realtime-notifications";
import { DigitacoesProvider } from "./digitacoes-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <RecordsProvider>
      <DigitacoesProvider>
        {children}
        <RealtimeNotificationsProvider />
      </DigitacoesProvider>
    </RecordsProvider>
  );
}
