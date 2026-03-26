"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import PageHeader from "@/components/PageHeader";

interface LogEntry {
  id: number;
  type: string;
  side: string | null;
  diaperStatus: string | null;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  comments: string | null;
  enteredByName: string;
}

const TYPE_META: Record<string, { icon: string; label: string }> = {
  pump: { icon: "🍼", label: "Pump" },
  feed: { icon: "🤱", label: "Feed" },
  sleep: { icon: "😴", label: "Sleep" },
  diaper: { icon: "🩲", label: "Diaper" },
  shower: { icon: "🚿", label: "Shower" },
};

const DIAPER_STATUS_META: Record<string, { icon: string; label: string }> = {
  empty: { icon: "✅", label: "Empty" },
  wet: { icon: "💧", label: "Wet" },
  dirty: { icon: "💩", label: "Dirty" },
  wet_and_dirty: { icon: "💧💩", label: "Wet & Dirty" },
};

function formatMinutes(mins: number): string {
  if (mins === 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === 0) return "instant";
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

interface DayGroup {
  dateKey: string;
  dateLabel: string;
  logs: LogEntry[];
  stats: {
    feedTime: number;
    pumpTime: number;
    sleepTime: number;
    diaperCount: number;
    showerCount: number;
  };
}

function groupByDay(logs: LogEntry[]): DayGroup[] {
  const groups = new Map<string, LogEntry[]>();

  for (const log of logs) {
    const dateKey = new Date(log.startTime).toDateString();
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(log);
  }

  const result: DayGroup[] = [];
  for (const [dateKey, dayLogs] of groups) {
    const totalTime = (type: string) =>
      dayLogs
        .filter((l) => l.type === type && l.durationMinutes)
        .reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0);
    const count = (type: string) => dayLogs.filter((l) => l.type === type).length;

    result.push({
      dateKey,
      dateLabel: formatDateLabel(dayLogs[0].startTime),
      logs: dayLogs,
      stats: {
        feedTime: totalTime("feed"),
        pumpTime: totalTime("pump"),
        sleepTime: totalTime("sleep"),
        diaperCount: count("diaper"),
        showerCount: count("shower"),
      },
    });
  }

  return result;
}

function DayStatsBar({ stats }: { stats: DayGroup["stats"] }) {
  const items = [
    { icon: "🤱", value: formatMinutes(stats.feedTime), show: stats.feedTime > 0 },
    { icon: "🍼", value: formatMinutes(stats.pumpTime), show: stats.pumpTime > 0 },
    { icon: "😴", value: formatMinutes(stats.sleepTime), show: stats.sleepTime > 0 },
    { icon: "🩲", value: `${stats.diaperCount}×`, show: stats.diaperCount > 0 },
    { icon: "🚿", value: `${stats.showerCount}×`, show: stats.showerCount > 0 },
  ].filter((i) => i.show);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {items.map((item) => (
        <div
          key={item.icon}
          className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 shadow-sm"
        >
          <span className="text-sm">{item.icon}</span>
          <span className="text-xs font-bold text-gray-700">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const fetchAllLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/logs?limit=all");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllLogs();
  }, [fetchAllLogs]);

  const days = useMemo(() => groupByDay(logs), [logs]);

  const toggleDay = (dateKey: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="animate-pulse-soft text-4xl">📅</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-8 pt-6">
      <PageHeader
        title="History"
        subtitle={
          <p className="text-sm text-gray-400">
            {days.length} day{days.length !== 1 ? "s" : ""} of activity
          </p>
        }
      />

      {days.length === 0 ? (
        <div className="py-12 text-center text-baby-300">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-sm">No history yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {days.map((day) => {
            const isExpanded = expandedDays.has(day.dateKey);
            return (
              <div key={day.dateKey} className="rounded-2xl bg-baby-50/60 p-3">
                <button
                  onClick={() => toggleDay(day.dateKey)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-700">{day.dateLabel}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400">
                        {day.logs.length} log{day.logs.length !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-gray-400">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>
                  </div>
                </button>

                <div className="mt-2">
                  <DayStatsBar stats={day.stats} />
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-1.5">
                    {day.logs.map((log) => {
                      const meta = TYPE_META[log.type] || { icon: "❓", label: log.type };
                      return (
                        <div
                          key={log.id}
                          className="animate-slide-up rounded-xl bg-white p-2.5 shadow-sm"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-baby-50 text-base">
                              {meta.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-800">
                                  {meta.label}
                                  {log.side && (
                                    <span className="ml-1 text-xs font-normal text-baby-500">
                                      ({log.side === "left" ? "L" : log.side === "right" ? "R" : log.side})
                                    </span>
                                  )}
                                </span>
                                {log.durationMinutes !== null && log.durationMinutes > 0 && (
                                  <span className="rounded-full bg-baby-100 px-2 py-0.5 text-[10px] font-semibold text-baby-600">
                                    {formatDuration(log.durationMinutes)}
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-400">
                                <span>{formatTime(log.startTime)}</span>
                                {log.endTime && (
                                  <>
                                    <span>→</span>
                                    <span>{formatTime(log.endTime)}</span>
                                  </>
                                )}
                              </div>
                              {log.type === "diaper" && log.diaperStatus && DIAPER_STATUS_META[log.diaperStatus] && (
                                <div className="mt-0.5">
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                    {DIAPER_STATUS_META[log.diaperStatus].icon} {DIAPER_STATUS_META[log.diaperStatus].label}
                                  </span>
                                </div>
                              )}
                              {log.comments && (
                                <p className="mt-0.5 text-[11px] text-gray-500 italic">
                                  &ldquo;{log.comments}&rdquo;
                                </p>
                              )}
                              <div className="mt-0.5 text-[10px] text-gray-300">
                                by {log.enteredByName}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
