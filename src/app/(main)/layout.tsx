import { cookies } from "next/headers";
import { MainThemeProvider } from "@/components/providers/main-theme-provider";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { NotificationGate } from "@/components/layout/notification-gate";
import { getSession } from "@/lib/auth/session";

import { DailyMetricsReminder } from "@/components/layout/daily-metrics-reminder";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("theme")?.value;
  const initialTheme = (themeCookie === "dark" || themeCookie === "light") ? themeCookie : "dark";

  return (
    <MainThemeProvider initialTheme={initialTheme}>
      <div className="flex min-h-screen flex-col">
        {session && <DailyMetricsReminder />}
        {children}
      </div>
      {session && <BottomNavigation />}
      {session && <NotificationGate />}
    </MainThemeProvider>
  );
}
