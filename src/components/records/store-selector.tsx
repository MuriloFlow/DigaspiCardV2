"use client";

import { CustomSelect } from "@/components/ui/custom-select";

type StoreSelectorProps = {
  stores: { id: string; name: string }[];
  selectedStoreId: string | null;
  onChange: (id: string | null) => void;
  allowAll?: boolean;
};

export function StoreSelector({ stores, selectedStoreId, onChange, allowAll = true }: StoreSelectorProps) {
  if (!stores.length) return null;

  const options = allowAll ? [
    { value: "all", label: "Todas as unidades (Rede)" },
    ...stores.map((s) => ({ value: s.id, label: s.name })),
  ] : stores.map((s) => ({ value: s.id, label: s.name }));

  return (
    <div className="flex flex-col gap-2">
      <CustomSelect
        options={options}
        value={selectedStoreId ?? (allowAll ? "all" : "")}
        onChange={(val) => onChange(val === "all" ? null : val)}
        placeholder="Selecione a Unidade"
      />
    </div>
  );
}
