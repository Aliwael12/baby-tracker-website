"use client";

import { useMemo } from "react";

interface LogEntry {
  id: number;
  type: string;
  amountMl: number | null;
  durationMinutes: number | null;
  startTime: string;
  endTime: string | null;
}

interface DailyStatsProps {
  logs: LogEntry[];
}

function formatMinutes(mins: number): string {
  if (mins === 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export default function DailyStats({ logs }: DailyStatsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const todayLogs = logs.filter(
      (l) => new Date(l.startTime).toDateString() === todayStr
    );

    // Local midnight for today; time totals count only the portion of each log
    // that falls within today, so an overnight sleep spanning into today is
    // credited correctly and no total exceeds 24h.
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const overlapMinutes = (l: { startTime: string; endTime: string | null }) => {
      const s = new Date(l.startTime).getTime();
      const e = l.endTime ? new Date(l.endTime).getTime() : s;
      const lo = Math.max(s, dayStart.getTime());
      const hi = Math.min(e, dayEnd.getTime());
      return Math.max(0, (hi - lo) / 60000);
    };
    const totalTime = (type: string) =>
      logs
        .filter((l) => l.type === type)
        .reduce((sum, l) => sum + overlapMinutes(l), 0);

    const count = (type: string) =>
      todayLogs.filter((l) => l.type === type).length;

    const totalMl = (type: string) =>
      todayLogs
        .filter((l) => l.type === type && l.amountMl)
        .reduce((sum, l) => sum + (l.amountMl ?? 0), 0);

    return {
      feedTime: totalTime("feed"),
      pumpMl: totalMl("pump"),
      sleepTime: totalTime("sleep"),
      diaperCount: count("diaper"),
      showerCount: count("shower"),
      vitaminCount: count("vitamin"),
      nailcutCount: count("nailcut"),
    };
  }, [logs]);

  const cards = [
    { icon: "🤱", label: "Feeding", value: formatMinutes(stats.feedTime), sub: "total today" },
    { icon: "🍼", label: "Pumping", value: `${Math.round(stats.pumpMl).toLocaleString()} ml`, sub: "total today" },
    { icon: "😴", label: "Sleep", value: formatMinutes(stats.sleepTime), sub: "total today" },
    { icon: "🩲", label: "Diapers", value: String(stats.diaperCount), sub: "changed today" },
    { icon: "🚿", label: "Showers", value: String(stats.showerCount), sub: "taken today" },
    { icon: "💊", label: "Vitamins", value: String(stats.vitaminCount), sub: "given today" },
    { icon: "💅", label: "Nail Cut", value: String(stats.nailcutCount), sub: "trimmed today" },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {cards.slice(0, 3).map((c) => (
          <div
            key={c.label}
            className="rounded-2xl bg-white p-3 shadow-sm text-center"
          >
            <div className="text-xl">{c.icon}</div>
            <div className="mt-1 text-lg font-bold text-gray-800">{c.value}</div>
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
              {c.label}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {cards.slice(3).map((c) => (
          <div
            key={c.label}
            className="rounded-2xl bg-white p-3 shadow-sm text-center"
          >
            <div className="text-xl">{c.icon}</div>
            <div className="mt-1 text-lg font-bold text-gray-800">{c.value}</div>
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
              {c.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
