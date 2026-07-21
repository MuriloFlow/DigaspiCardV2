"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { RecordsProvider } from "./records-provider";
import { RealtimeNotificationsProvider } from "./realtime-notifications";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <RecordsProvider>
      {children}
      <RealtimeNotificationsProvider />
    </RecordsProvider>
  );
}
