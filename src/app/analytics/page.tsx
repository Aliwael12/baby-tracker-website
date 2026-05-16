"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import PageHeader from "@/components/PageHeader";

interface LogEntry {
  id: number;
  type: string;
  side: string | null;
  diaperStatus: string | null;
  durationMinutes: number | null;
  startTime: string;
}

const DIAPER_STATUS_META: Record<string, { icon: string; label: string }> = {
  empty: { icon: "✅", label: "Empty" },
  wet: { icon: "💧", label: "Wet" },
  dirty: { icon: "💩", label: "Dirty" },
  wet_and_dirty: { icon: "💧💩", label: "Wet & Dirty" },
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === 0) return "";
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function sideLabel(side: string | null): string {
  if (side === "left") return "L";
  if (side === "right") return "R";
  return side ?? "";
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

function toInputDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface DayStats {
  dateKey: string;
  dateLabel: string;
  feedTime: number;
  feedCount: number;
  pumpTime: number;
  pumpCount: number;
  sleepTime: number;
  sleepCount: number;
  diaperCount: number;
  showerCount: number;
  totalLogs: number;
  diaperLogs: LogEntry[];
  feedLogs: LogEntry[];
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
    const byTime = (a: LogEntry, b: LogEntry) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime();

    results.push({
      dateKey,
      dateLabel: formatDateShort(dayLogs[0].startTime),
      feedTime: totalTime("feed"),
      feedCount: count("feed"),
      pumpTime: totalTime("pump"),
      pumpCount: count("pump"),
      sleepTime: totalTime("sleep"),
      sleepCount: count("sleep"),
      diaperCount: count("diaper"),
      showerCount: count("shower"),
      totalLogs: dayLogs.length,
      diaperLogs: dayLogs.filter((l) => l.type === "diaper").sort(byTime),
      feedLogs: dayLogs.filter((l) => l.type === "feed").sort(byTime),
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
  totalCount,
}: {
  icon: string;
  label: string;
  today: string;
  avg: string;
  total: string;
  totalCount?: number;
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
          {totalCount !== undefined && totalCount > 0 && (
            <div className="mt-0.5 text-[10px] font-medium text-baby-400">
              {totalCount} time{totalCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");

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
      feedTime: 0,
      feedCount: 0,
      pumpTime: 0,
      pumpCount: 0,
      sleepTime: 0,
      sleepCount: 0,
      diaperCount: 0,
      showerCount: 0,
      totalLogs: 0,
    };

    const sum = (fn: (d: DayStats) => number) => allDays.reduce((s, d) => s + fn(d), 0);

    return {
      dayStats: allDays,
      todayStats: today,
      dayCount,
      avgStats: {
        feedTime: sum((d) => d.feedTime) / dayCount,
        pumpCount: sum((d) => d.pumpCount) / dayCount,
        sleepTime: sum((d) => d.sleepTime) / dayCount,
        diaperCount: sum((d) => d.diaperCount) / dayCount,
        showerCount: sum((d) => d.showerCount) / dayCount,
      },
      totalStats: {
        feedTime: sum((d) => d.feedTime),
        feedCount: sum((d) => d.feedCount),
        pumpTime: sum((d) => d.pumpTime),
        pumpCount: sum((d) => d.pumpCount),
        sleepTime: sum((d) => d.sleepTime),
        sleepCount: sum((d) => d.sleepCount),
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
          totalCount={totalStats.feedCount}
        />
        <StatCard
          icon="🍼"
          label="Pumping"
          today={String(todayStats.pumpCount)}
          avg={String(Math.round(avgStats.pumpCount))}
          total={String(totalStats.pumpCount)}
        />
        <StatCard
          icon="😴"
          label="Sleep"
          today={formatMinutes(todayStats.sleepTime)}
          avg={formatMinutes(Math.round(avgStats.sleepTime))}
          total={formatMinutes(totalStats.sleepTime)}
          totalCount={totalStats.sleepCount}
        />
        <StatCard
          icon="🩲"
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

          <div className="mb-3 flex items-center justify-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-baby-100 bg-white px-3 py-1.5 text-xs text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-baby-200"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate("")}
                className="rounded-xl bg-baby-50 px-3 py-1.5 text-xs font-semibold text-baby-600 transition-all active:scale-[0.95]"
              >
                All
              </button>
            )}
          </div>

          {(() => {
            const filtered = selectedDate
              ? dayStats.filter((d) => toInputDate(d.dateKey) === selectedDate)
              : dayStats;

            if (filtered.length === 0) {
              return (
                <p className="py-8 text-center text-sm text-baby-300">
                  No activity on this date.
                </p>
              );
            }

            return (
              <div className="space-y-3">
                {filtered.map((day) => {
              const chips = [
                { icon: "🤱", value: formatMinutes(day.feedTime), show: day.feedTime > 0 },
                { icon: "🍼", value: `${day.pumpCount}×`, show: day.pumpCount > 0 },
                { icon: "😴", value: formatMinutes(day.sleepTime), show: day.sleepTime > 0 },
                { icon: "🩲", value: `${day.diaperCount}×`, show: day.diaperCount > 0 },
                { icon: "🚿", value: `${day.showerCount}×`, show: day.showerCount > 0 },
              ].filter((c) => c.show);

              return (
                <div key={day.dateKey} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-gray-700">{day.dateLabel}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {chips.map((c) => (
                        <span
                          key={c.icon}
                          className="flex items-center gap-1 rounded-full bg-baby-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600"
                        >
                          <span>{c.icon}</span>
                          <span>{c.value}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {day.diaperLogs.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        🩲 Diapers
                      </div>
                      <div className="mt-1 space-y-1">
                        {day.diaperLogs.map((log) => {
                          const meta =
                            log.diaperStatus && DIAPER_STATUS_META[log.diaperStatus];
                          return (
                            <div
                              key={log.id}
                              className="flex items-center gap-2 text-xs text-gray-600"
                            >
                              <span className="tabular-nums text-gray-500">
                                {formatTime(log.startTime)}
                              </span>
                              <span>
                                {meta ? `${meta.icon} ${meta.label}` : "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {day.feedLogs.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        🤱 Feeds
                      </div>
                      <div className="mt-1 space-y-1">
                        {day.feedLogs.map((log) => {
                          const side = sideLabel(log.side);
                          const dur = formatDuration(log.durationMinutes);
                          return (
                            <div
                              key={log.id}
                              className="flex items-center gap-2 text-xs text-gray-600"
                            >
                              <span className="tabular-nums text-gray-500">
                                {formatTime(log.startTime)}
                              </span>
                              {side && (
                                <span className="rounded-full bg-baby-100 px-1.5 py-0.5 text-[10px] font-semibold text-baby-600">
                                  {side}
                                </span>
                              )}
                              {dur && <span className="text-gray-500">{dur}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
                })}
              </div>
            );
          })()}
        </section>
      )}
    </div>
  );
  
}
