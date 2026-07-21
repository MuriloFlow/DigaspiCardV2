"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { RecordsProvider } from "./records-provider";
import { RealtimeNotificationsProvider } from "./realtime-notifications";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <RecordsProvider>
        {children}
        <RealtimeNotificationsProvider />
      </RecordsProvider>
    </ThemeProvider>
  );
}
