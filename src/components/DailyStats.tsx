"use client";

import { useMemo } from "react";

interface LogEntry {
  id: number;
  type: string;
  durationMinutes: number | null;
  startTime: string;
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
    const todayStr = new Date().toDateString();
    const todayLogs = logs.filter(
      (l) => new Date(l.startTime).toDateString() === todayStr
    );

    const totalTime = (type: string) =>
      todayLogs
        .filter((l) => l.type === type && l.durationMinutes)
        .reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0);

    const count = (type: string) =>
      todayLogs.filter((l) => l.type === type).length;

    return {
      feedTime: totalTime("feed"),
      pumpTime: totalTime("pump"),
      sleepTime: totalTime("sleep"),
      diaperCount: count("diaper"),
      showerCount: count("shower"),
    };
  }, [logs]);

  const cards = [
    { icon: "🤱", label: "Feeding", value: formatMinutes(stats.feedTime), sub: "total today" },
    { icon: "🍼", label: "Pumping", value: formatMinutes(stats.pumpTime), sub: "total today" },
    { icon: "😴", label: "Sleep", value: formatMinutes(stats.sleepTime), sub: "total today" },
    { icon: "🩲", label: "Diapers", value: String(stats.diaperCount), sub: "changed today" },
    { icon: "🚿", label: "Showers", value: String(stats.showerCount), sub: "taken today" },
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
      <div className="flex justify-center gap-2">
        {cards.slice(3).map((c) => (
          <div
            key={c.label}
            className="w-1/3 rounded-2xl bg-white p-3 shadow-sm text-center"
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
