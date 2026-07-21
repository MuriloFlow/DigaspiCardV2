"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Theme = "dark" | "light";

interface DevThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const DevThemeContext = createContext<DevThemeContextType | undefined>(undefined);

export function DevThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    document.cookie = `dev_theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
  };

  // Sincroniza caso o cookie mude em outra aba
  useEffect(() => {
    const handleCookieChange = () => {
      const match = document.cookie.match(new RegExp('(^| )dev_theme=([^;]+)'));
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
    <DevThemeContext.Provider value={{ theme, setTheme }}>
      <div className={`${theme === "dark" ? "dark" : ""} min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-white transition-colors flex flex-col`}>
        {children}
      </div>
    </DevThemeContext.Provider>
  );
}

export function useDevTheme() {
  const context = useContext(DevThemeContext);
  if (context === undefined) {
    throw new Error("useDevTheme must be used within a DevThemeProvider");
  }
  return context;
}
