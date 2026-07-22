import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CreditCard, Timer, Trash2, Loader2, AlertTriangle, Edit2, Check, X } from "lucide-react";
import { getOperatorColor } from "@/lib/records/colors";
import type { OperatorRecord } from "@/lib/records/types";
import { formatCurrency, formatTime } from "@/lib/utils/format";
import { useRecords } from "@/components/providers/records-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils/cn";
import { SubRoleTag } from "@/components/ui/sub-role-tag";
import { EditRecordModal } from "./edit-record-modal";

export function RecordCard({
  record,
  index = 0,
  showDelete = true,
}: {
  record: OperatorRecord;
  index?: number;
  showDelete?: boolean;
}) {
  const color = getOperatorColor(record.operatorName, index);
  const { deleteRecord, refresh, isDeleting } = useRecords();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  const isBeingDeleted = isDeleting === record.id;
  const canDelete = user?.role === "GLOBAL_ADMIN" || user?.role === "MANAGER";



  return (
    <>
      <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: isBeingDeleted ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, y: -12, height: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.035, 0.18) }}
      className="group relative overflow-hidden rounded-[1.5rem] border border-zinc-200/80 bg-white p-4 shadow-[0_14px_42px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_20px_54px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-center gap-4">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-[0_12px_26px_rgba(15,23,42,0.12)]"
            style={{ backgroundColor: color }}
          >
            {record.operatorName.slice(0, 1).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-zinc-950 flex items-center gap-2">
                  {record.operatorName}
                  <SubRoleTag subRole={record.subRole} />
                  {user?.role === "GLOBAL_ADMIN" && record.storeName && (
                    <span className="text-xs font-medium text-zinc-500 px-1.5 py-0.5 bg-zinc-100 rounded-md">
                      {record.storeName}
                    </span>
                  )}
                </h3>
                <p className="mt-1 truncate text-sm text-zinc-500">
                  {record.clientName}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="flex flex-col items-end">
                  <p className="text-sm font-semibold text-zinc-950">
                    {formatCurrency(record.amountInCents)}
                  </p>
                  {record.amountUsedInCents != null && record.amountUsedInCents > 0 && (
                    <>
                      <p className="text-xs font-medium text-emerald-600">
                        Uso: {formatCurrency(record.amountUsedInCents)}
                      </p>
                      <p className="text-[11px] font-semibold text-amber-500 mt-0.5">
                        Disp: {formatCurrency(record.amountInCents - record.amountUsedInCents)}
                      </p>
                    </>
                  )}
                </div>
                {/* Lápis sempre visível */}
                <button
                  type="button"
                  aria-label="Editar registro"
                  onClick={() => setIsEditing(true)}
                  className="flex size-8 items-center justify-center rounded-xl text-zinc-400 transition duration-200 hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <Edit2 className="size-4" />
                </button>
              </div>
            </div>        <div className="mt-3 flex items-center gap-3 text-xs font-medium text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <CreditCard aria-hidden="true" className="size-3.5" />
            Cartao
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Timer aria-hidden="true" className="size-3.5" />
            {formatTime(record.createdAt)}
          </span>
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            record.activated
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          )}>
            {record.activated ? "Ativo" : "Pendente"}
          </span>
        </div>
      </div>
    </div>
  </motion.article>

  <EditRecordModal 
    open={isEditing}
    record={record}
    onClose={() => setIsEditing(false)}
  />
  </>
  );
}
