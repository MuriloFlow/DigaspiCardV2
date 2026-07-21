import { cookies } from "next/headers";
import { DevThemeProvider } from "./dev-theme-provider";
import { DevLayoutContent } from "./dev-layout-content";

export default async function DevLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("dev_theme")?.value;
  // Inicialização consistente: se não houver cookie, default é dark.
  const initialTheme = (themeCookie === "dark" || themeCookie === "light") ? themeCookie : "dark";

  return (
    <DevThemeProvider initialTheme={initialTheme}>
      <DevLayoutContent>{children}</DevLayoutContent>
    </DevThemeProvider>
  );
}
