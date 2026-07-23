"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";

export type User = {
  id: string;
  username: string;
  name?: string;
  role: "EMPLOYEE" | "MANAGER" | "GLOBAL_ADMIN" | "TI_ADMIN" | "REGIONAL_MANAGER" | "VM";
  storeId: string | null;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  selectedStoreId: string | null;
  setSelectedStoreId: (id: string | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ 
  children,
  initialUser = null
}: { 
  children: ReactNode,
  initialUser?: User | null
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStoreId, setSelectedStoreIdState] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("@muriloflow:selectedStoreId");
    if (saved) setSelectedStoreIdState(saved);
  }, []);

  const setSelectedStoreId = (id: string | null) => {
    setSelectedStoreIdState(id);
    if (id) {
      localStorage.setItem("@muriloflow:selectedStoreId", id);
    } else {
      localStorage.removeItem("@muriloflow:selectedStoreId");
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, selectedStoreId, setSelectedStoreId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
