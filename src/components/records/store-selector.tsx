"use client";

import { CustomSelect } from "@/components/ui/custom-select";

type StoreSelectorProps = {
  stores: { id: string; name: string }[];
  selectedStoreId: string | null;
  onChange: (id: string | null) => void;
};

export function StoreSelector({ stores, selectedStoreId, onChange }: StoreSelectorProps) {
  if (!stores.length) return null;

  const options = [
    { value: "all", label: "Todas as unidades (Rede)" },
    ...stores.map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <div className="mb-6 flex flex-col gap-2">
      <CustomSelect
        options={options}
        value={selectedStoreId ?? "all"}
        onChange={(val) => onChange(val === "all" ? null : val)}
        placeholder="Escolha a Unidade"
      />
    </div>
  );
}
