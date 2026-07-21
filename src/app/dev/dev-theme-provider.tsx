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

  useEffect(() => {
    // Aplica as classes no HTML
    document.documentElement.classList.remove("main-app");
    document.documentElement.classList.add("dev-app");

    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

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
      {children}
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
