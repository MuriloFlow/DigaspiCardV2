"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { StoreSelector } from "@/components/records/store-selector";
import { usePathname } from "next/navigation";

export function GlobalStoreSelector({ stores }: { stores: { id: string; name: string }[] }) {
  const { user, selectedStoreId, setSelectedStoreId } = useAuth();
  const pathname = usePathname();
  
  const isGlobalOrRegional = user?.role === "GLOBAL_ADMIN" || user?.role === "REGIONAL_MANAGER" || user?.role === "TI_ADMIN";
  
  // No renderiza no /login ou em pginas de dev
  if (!isGlobalOrRegional || pathname?.startsWith("/login") || pathname?.startsWith("/dev")) return null;
  
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8 mb-2 z-50">
      <StoreSelector 
        stores={stores}
        selectedStoreId={selectedStoreId}
        onChange={setSelectedStoreId}
      />
    </div>
  );
}
