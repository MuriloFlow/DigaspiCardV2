import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { AppProviders } from "@/components/providers/app-providers";
import { AuthProvider } from "@/components/providers/auth-provider";
import { DevBanner } from "@/components/layout/dev-banner";
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
  title: "Card+",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  description: "Gestão de Performance, operadores na captação de cartões.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Card+",
  },
};

export const viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var isDev = window.location.pathname.startsWith('/dev');
                  if (isDev) {
                    document.documentElement.classList.add('dev-app');
                  } else {
                    document.documentElement.classList.add('main-app');
                  }
                  
                  var cookieName = isDev ? 'dev_theme' : 'theme';
                  var match = document.cookie.match(new RegExp('(^| )' + cookieName + '=([^;]+)'));
                  var theme = match ? match[2] : 'dark';
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 transition-colors">
        <AuthProvider initialUser={session}>
          <DevBanner />
          <AppProviders>
            {children}
          </AppProviders>
        </AuthProvider>
      </body>
    </html>
  );
}
