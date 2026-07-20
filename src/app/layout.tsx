import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { AppProviders } from "@/components/providers/app-providers";
import { AuthProvider } from "@/components/providers/auth-provider";
import { getSession } from "@/lib/auth/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Operadores | Performance de Cartoes",
  description: "Dashboard premium para registros e ranking de operadores.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-zinc-950">
        <AuthProvider initialUser={session}>
          <AppProviders>
            <div className="flex min-h-screen flex-col">{children}</div>
            {session && <BottomNavigation />}
          </AppProviders>
        </AuthProvider>
      </body>
    </html>
  );
}
