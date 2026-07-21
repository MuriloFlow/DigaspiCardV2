"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Theme = "dark" | "light";

interface MainThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const MainThemeContext = createContext<MainThemeContextType | undefined>(undefined);

export function MainThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    document.cookie = `theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
  };

  useEffect(() => {
    const handleCookieChange = () => {
      const match = document.cookie.match(new RegExp('(^| )theme=([^;]+)'));
      if (match) {
        const cookieTheme = match[2] as Theme;
        if (cookieTheme !== theme) {
          setThemeState(cookieTheme);
        }
      }
    };
    
    const interval = setInterval(handleCookieChange, 1000);
    return () => clearInterval(interval);
  }, [theme]);

  return (
    <MainThemeContext.Provider value={{ theme, setTheme }}>
      <div className={`${theme === "dark" ? "dark" : ""} flex min-h-full flex-col bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 transition-colors`}>
        {children}
      </div>
    </MainThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(MainThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a MainThemeProvider");
  }
  return context;
}
