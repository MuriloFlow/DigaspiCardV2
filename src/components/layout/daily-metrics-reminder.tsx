"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import { useRecords } from "@/components/providers/records-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { toDateKey } from "@/lib/utils/format";

export function DailyMetricsReminder() {
  const { user } = useAuth();
  const { dailyMetrics, records } = useRecords();
  const [shouldShow, setShouldShow] = useState(false);
  const [todayKey, setTodayKey] = useState("");

  useEffect(() => {
    if (!user || (user.role !== "MANAGER" && user.role !== "GLOBAL_ADMIN")) {
      setShouldShow(false);
      return;
    }

    const checkReminder = () => {
      const now = new Date();
      const currentKey = toDateKey(now.toISOString());
      setTodayKey(currentKey);

      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Check if it's past 20:30
      if (hours > 20 || (hours === 20 && minutes >= 30)) {
        // Check if there are any records today to even warrant a reminder
        const hasRecordsToday = records.some(r => toDateKey(r.createdAt) === currentKey);
        
        // Check if metrics are already filled for today
        const hasMetricsToday = dailyMetrics.some(m => m.dateKey === currentKey);

        if (hasRecordsToday && !hasMetricsToday) {
          setShouldShow(true);
          
          // Show a browser notification if permission is granted
          if ("Notification" in window && Notification.permission === "granted") {
            const hasNotified = sessionStorage.getItem(`notified_daily_${currentKey}`);
            if (!hasNotified) {
              const notification = new Notification("Lembrete de Fechamento!", {
                body: "Não esqueça de registrar o total de clientes que passaram no caixa hoje.",
                icon: "/icon.png"
              });
              notification.onclick = () => {
                window.focus();
                // We let the banner handle the exact routing if they click the banner,
                // but the OS notification brings them to the app.
              };
              sessionStorage.setItem(`notified_daily_${currentKey}`, "true");
            }
          } else if ("Notification" in window && Notification.permission !== "denied") {
            Notification.requestPermission();
          }
        } else {
          setShouldShow(false);
        }
      } else {
        setShouldShow(false);
      }
    };

    checkReminder();
    
    // Check every minute
    const interval = setInterval(checkReminder, 60000);
    return () => clearInterval(interval);
  }, [user, dailyMetrics, records]);

  if (!shouldShow) return null;

  return (
    <div className="bg-red-500 px-4 py-3 text-white shadow-md sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20">
            <AlertCircle className="size-5" />
          </div>
          <p className="text-sm font-medium leading-tight sm:text-base">
            <strong className="font-bold">Atenção:</strong> Você ainda não preencheu o fluxo de clientes de hoje.
          </p>
        </div>
        
        <Link
          href={`/historico/${todayKey}`}
          className="group flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          Preencher agora
          <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
