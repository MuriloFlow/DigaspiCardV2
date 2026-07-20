"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { RecordsProvider } from "./records-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <RecordsProvider>{children}</RecordsProvider>
    </ThemeProvider>
  );
}
