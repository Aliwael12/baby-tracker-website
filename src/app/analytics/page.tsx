"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import PageHeader from "@/components/PageHeader";

interface LogEntry {
  id: number;
  type: string;
  durationMinutes: number | null;
  startTime: string;
}

function formatMinutes(mins: number): string {
  if (mins === 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function getDayKey(iso: string): string {
  return new Date(iso).toDateString();
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface DayStats {
  dateKey: string;
  dateLabel: string;
  feedTime: number;
  pumpTime: number;
  sleepTime: number;
  diaperCount: number;
  showerCount: number;
  totalLogs: number;
}

function computeAllDayStats(logs: LogEntry[]): DayStats[] {
  const groups = new Map<string, LogEntry[]>();

  for (const log of logs) {
    const key = getDayKey(log.startTime);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(log);
  }

  const results: DayStats[] = [];
  for (const [dateKey, dayLogs] of groups) {
    const totalTime = (type: string) =>
      dayLogs
        .filter((l) => l.type === type && l.durationMinutes)
        .reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0);
    const count = (type: string) => dayLogs.filter((l) => l.type === type).length;

    results.push({
      dateKey,
      dateLabel: formatDateShort(dayLogs[0].startTime),
      feedTime: totalTime("feed"),
      pumpTime: totalTime("pump"),
      sleepTime: totalTime("sleep"),
      diaperCount: count("diaper"),
      showerCount: count("shower"),
      totalLogs: dayLogs.length,
    });
  }

  return results;
}

function StatCard({
  icon,
  label,
  today,
  avg,
  total,
}: {
  icon: string;
  label: string;
  today: string;
  avg: string;
  total: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-bold text-gray-700">{label}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-baby-600">{today}</div>
          <div className="text-[10px] font-medium text-gray-400 uppercase">Today</div>
        </div>
        <div>
          <div className="text-lg font-bold text-gray-700">{avg}</div>
          <div className="text-[10px] font-medium text-gray-400 uppercase">Daily Avg</div>
        </div>
        <div>
          <div className="text-lg font-bold text-gray-500">{total}</div>
          <div className="text-[10px] font-medium text-gray-400 uppercase">All Time</div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/logs?limit=all");
      if (res.ok) setLogs(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const { dayStats, todayStats, avgStats, totalStats, dayCount } = useMemo(() => {
    const allDays = computeAllDayStats(logs);
    const dayCount = allDays.length || 1;
    const todayKey = new Date().toDateString();
    const today = allDays.find((d) => d.dateKey === todayKey) || {
      feedTime: 0, pumpTime: 0, sleepTime: 0, diaperCount: 0, showerCount: 0, totalLogs: 0,
    };

    const sum = (fn: (d: DayStats) => number) => allDays.reduce((s, d) => s + fn(d), 0);

    return {
      dayStats: allDays,
      todayStats: today,
      dayCount,
      avgStats: {
        feedTime: sum((d) => d.feedTime) / dayCount,
        pumpTime: sum((d) => d.pumpTime) / dayCount,
        sleepTime: sum((d) => d.sleepTime) / dayCount,
        diaperCount: sum((d) => d.diaperCount) / dayCount,
        showerCount: sum((d) => d.showerCount) / dayCount,
      },
      totalStats: {
        feedTime: sum((d) => d.feedTime),
        pumpTime: sum((d) => d.pumpTime),
        sleepTime: sum((d) => d.sleepTime),
        diaperCount: sum((d) => d.diaperCount),
        showerCount: sum((d) => d.showerCount),
        totalLogs: sum((d) => d.totalLogs),
      },
    };
  }, [logs]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="animate-pulse-soft text-4xl">📊</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-8 pt-6">
      <PageHeader
        title="Analytics"
        subtitle={
          <p className="text-sm text-gray-400">
            {dayCount} day{dayCount !== 1 ? "s" : ""} tracked · {totalStats.totalLogs} total logs
          </p>
        }
      />

      <div className="space-y-3">
        <StatCard
          icon="🤱"
          label="Feeding"
          today={formatMinutes(todayStats.feedTime)}
          avg={formatMinutes(Math.round(avgStats.feedTime))}
          total={formatMinutes(totalStats.feedTime)}
        />
        <StatCard
          icon="🍼"
          label="Pumping"
          today={formatMinutes(todayStats.pumpTime)}
          avg={formatMinutes(Math.round(avgStats.pumpTime))}
          total={formatMinutes(totalStats.pumpTime)}
        />
        <StatCard
          icon="😴"
          label="Sleep"
          today={formatMinutes(todayStats.sleepTime)}
          avg={formatMinutes(Math.round(avgStats.sleepTime))}
          total={formatMinutes(totalStats.sleepTime)}
        />
        <StatCard
          icon="👶"
          label="Diapers"
          today={String(todayStats.diaperCount)}
          avg={avgStats.diaperCount.toFixed(1)}
          total={String(totalStats.diaperCount)}
        />
        <StatCard
          icon="🚿"
          label="Showers"
          today={String(todayStats.showerCount)}
          avg={avgStats.showerCount.toFixed(1)}
          total={String(totalStats.showerCount)}
        />
      </div>

      {/* Daily breakdown table */}
      {dayStats.length > 1 && (
        <section className="mt-8">
          <h2 className="mb-3 text-center text-sm font-semibold text-gray-400 uppercase tracking-widest">
            Daily Breakdown
          </h2>
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-baby-100 bg-baby-50/50 text-gray-500">
                    <th className="px-3 py-2 text-left font-semibold">Date</th>
                    <th className="px-2 py-2 text-center font-semibold">🤱</th>
                    <th className="px-2 py-2 text-center font-semibold">🍼</th>
                    <th className="px-2 py-2 text-center font-semibold">😴</th>
                    <th className="px-2 py-2 text-center font-semibold">👶</th>
                    <th className="px-2 py-2 text-center font-semibold">🚿</th>
                  </tr>
                </thead>
                <tbody>
                  {dayStats.map((day, i) => (
                    <tr
                      key={day.dateKey}
                      className={i % 2 === 0 ? "bg-white" : "bg-baby-50/30"}
                    >
                      <td className="px-3 py-2 font-medium text-gray-700">{day.dateLabel}</td>
                      <td className="px-2 py-2 text-center text-gray-600">
                        {day.feedTime > 0 ? formatMinutes(day.feedTime) : "—"}
                      </td>
                      <td className="px-2 py-2 text-center text-gray-600">
                        {day.pumpTime > 0 ? formatMinutes(day.pumpTime) : "—"}
                      </td>
                      <td className="px-2 py-2 text-center text-gray-600">
                        {day.sleepTime > 0 ? formatMinutes(day.sleepTime) : "—"}
                      </td>
                      <td className="px-2 py-2 text-center text-gray-600">
                        {day.diaperCount > 0 ? day.diaperCount : "—"}
                      </td>
                      <td className="px-2 py-2 text-center text-gray-600">
                        {day.showerCount > 0 ? day.showerCount : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
