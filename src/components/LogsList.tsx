"use client";

import { useState } from "react";

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
  createdAt: string;
}

interface LogsListProps {
  logs: LogEntry[];
}

const TYPE_META: Record<string, { icon: string; label: string }> = {
  pump: { icon: "🍼", label: "Pump" },
  feed: { icon: "🤱", label: "Feed" },
  sleep: { icon: "😴", label: "Sleep" },
  diaper: { icon: "👶", label: "Diaper" },
  shower: { icon: "🚿", label: "Shower" },
};

const DIAPER_STATUS_META: Record<string, { icon: string; label: string }> = {
  empty: { icon: "✅", label: "Empty" },
  wet: { icon: "💧", label: "Wet" },
  dirty: { icon: "💩", label: "Dirty" },
  wet_and_dirty: { icon: "💧💩", label: "Wet & Dirty" },
};

const FILTER_OPTIONS = [
  { value: null, label: "All" },
  { value: "pump", icon: "🍼", label: "Pump" },
  { value: "feed", icon: "🤱", label: "Feed" },
  { value: "sleep", icon: "😴", label: "Sleep" },
  { value: "diaper", icon: "👶", label: "Diaper" },
  { value: "shower", icon: "🚿", label: "Shower" },
] as const;

function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === 0) return "instant";
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatGap(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m ago`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h < 24) return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

function computeGaps(logs: LogEntry[]): Map<number, number | null> {
  const gaps = new Map<number, number | null>();
  const lastByType = new Map<string, Date>();

  const sorted = [...logs].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  for (const log of sorted) {
    const key = log.type;
    const prevTime = lastByType.get(key);
    if (prevTime) {
      const diff =
        (new Date(log.startTime).getTime() - prevTime.getTime()) / 60000;
      gaps.set(log.id, diff);
    } else {
      gaps.set(log.id, null);
    }
    lastByType.set(key, new Date(log.startTime));
  }

  return gaps;
}

export default function LogsList({ logs }: LogsListProps) {
  const [filter, setFilter] = useState<string | null>(null);

  if (logs.length === 0) {
    return (
      <div className="py-12 text-center text-baby-300">
        <div className="text-4xl mb-2">📋</div>
        <p className="text-sm">No activities logged yet.</p>
      </div>
    );
  }

  const filteredLogs = filter ? logs.filter((l) => l.type === filter) : logs;
  const gaps = computeGaps(logs);

  let lastDate = "";

  return (
    <div>
      <div className="mb-3 flex flex-wrap justify-center gap-1.5">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value ?? "all"}
            onClick={() => setFilter(opt.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
              filter === opt.value
                ? "bg-baby-400 text-white shadow-sm"
                : "bg-baby-50 text-baby-500"
            }`}
          >
            {"icon" in opt && opt.icon ? `${opt.icon} ` : ""}{opt.label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
      {filteredLogs.map((log) => {
        const meta = TYPE_META[log.type] || { icon: "❓", label: log.type };
        const dateLabel = formatDate(log.startTime);
        const showDateHeader = dateLabel !== lastDate;
        lastDate = dateLabel;
        const gap = gaps.get(log.id);
        const showGap =
          gap !== null &&
          gap !== undefined &&
          (log.type === "pump" || log.type === "feed");

        return (
          <div key={log.id}>
            {showDateHeader && (
              <div className="pt-3 pb-1 text-center text-xs font-semibold text-baby-400 uppercase tracking-widest">
                {dateLabel}
              </div>
            )}
            <div className="animate-slide-up rounded-2xl bg-white p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-baby-50 text-xl">
                  {meta.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800">
                      {meta.label}
                      {log.side && (
                        <span className="ml-1 text-sm font-normal text-baby-500">
                          ({log.side})
                        </span>
                      )}
                    </span>
                    {log.durationMinutes !== null && log.durationMinutes > 0 && (
                      <span className="rounded-full bg-baby-100 px-2 py-0.5 text-xs font-semibold text-baby-600">
                        {formatDuration(log.durationMinutes)}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-400">
                    <span>{formatTime(log.startTime)}</span>
                    {log.endTime && (
                      <>
                        <span>→</span>
                        <span>{formatTime(log.endTime)}</span>
                      </>
                    )}
                    {showGap && (
                      <span className="rounded bg-baby-50 px-1.5 py-0.5 text-baby-500">
                        gap: {formatGap(gap!)}
                      </span>
                    )}
                  </div>
                  {log.type === "diaper" && log.diaperStatus && DIAPER_STATUS_META[log.diaperStatus] && (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {DIAPER_STATUS_META[log.diaperStatus].icon} {DIAPER_STATUS_META[log.diaperStatus].label}
                      </span>
                    </div>
                  )}
                  {log.comments && (
                    <p className="mt-1 text-xs text-gray-500 italic">
                      &ldquo;{log.comments}&rdquo;
                    </p>
                  )}
                  <div className="mt-1 text-[11px] text-gray-300">
                    by {log.enteredByName}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
