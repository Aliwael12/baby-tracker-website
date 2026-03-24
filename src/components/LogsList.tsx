"use client";

import { useState, useRef, useCallback } from "react";

interface LogEntry {
  id: number;
  type: string;
  side: string | null;
  diaperStatus: string | null;
  weightKg: number | null;
  heightCm: number | null;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  comments: string | null;
  enteredByName: string;
  createdAt: string;
}

interface LogsListProps {
  logs: LogEntry[];
  onDelete?: (id: number) => void;
}

const TYPE_META: Record<string, { icon: string; label: string }> = {
  pump: { icon: "🍼", label: "Pump" },
  feed: { icon: "🤱", label: "Feed" },
  sleep: { icon: "😴", label: "Sleep" },
  diaper: { icon: "👶", label: "Diaper" },
  shower: { icon: "🚿", label: "Shower" },
  growth: { icon: "📏", label: "Growth" },
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
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
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

function formatGapLabel(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  const days = Math.floor(h / 24);
  return `${days}d`;
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

const DELETE_THRESHOLD = 100;

function SwipeableRow({
  children,
  onDelete,
}: {
  children: React.ReactNode;
  onDelete: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const swiping = useRef(false);
  const dismissed = useRef(false);
  const [offset, setOffset] = useState(0);
  const [removing, setRemoving] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (dismissed.current) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = 0;
    swiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dismissed.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (!swiping.current && Math.abs(dy) > Math.abs(dx)) return;
    if (Math.abs(dx) > 10) swiping.current = true;
    if (!swiping.current) return;

    currentX.current = dx;
    setOffset(dx);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (dismissed.current) return;
    if (Math.abs(currentX.current) > DELETE_THRESHOLD) {
      dismissed.current = true;
      const direction = currentX.current > 0 ? 1 : -1;
      setOffset(direction * window.innerWidth);
      setRemoving(true);
      setTimeout(onDelete, 300);
    } else {
      setOffset(0);
    }
    swiping.current = false;
  }, [onDelete]);

  const progress = Math.min(Math.abs(offset) / DELETE_THRESHOLD, 1);

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        maxHeight: removing ? 0 : 200,
        opacity: removing ? 0 : 1,
        marginBottom: removing ? 0 : undefined,
        transition: removing
          ? "max-height 0.3s ease, opacity 0.3s ease, margin 0.3s ease"
          : undefined,
      }}
    >
      <div
        className="absolute inset-0 flex items-center rounded-2xl px-4"
        style={{
          background: `rgba(239, 68, 68, ${progress * 0.9})`,
          justifyContent: offset >= 0 ? "flex-start" : "flex-end",
        }}
      >
        <span
          className="text-sm font-semibold text-white"
          style={{ opacity: progress }}
        >
          🗑️ Delete
        </span>
      </div>
      <div
        ref={rowRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative"
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping.current ? "none" : "transform 0.3s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function LogsList({ logs, onDelete }: LogsListProps) {
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
          log.type === "feed";

        return (
          <div key={log.id}>
            {showDateHeader && (
              <div className="pt-3 pb-1 text-center text-xs font-semibold text-baby-400 uppercase tracking-widest">
                {dateLabel}
              </div>
            )}
            <SwipeableRow onDelete={() => onDelete?.(log.id)}>
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
                            ({log.side === "left" ? "L" : log.side === "right" ? "R" : log.side})
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
                    </div>
                    {showGap && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                          ⏱ {formatGapLabel(gap!)} since last feed
                        </span>
                      </div>
                    )}
                    {log.type === "diaper" && log.diaperStatus && DIAPER_STATUS_META[log.diaperStatus] && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {DIAPER_STATUS_META[log.diaperStatus].icon} {DIAPER_STATUS_META[log.diaperStatus].label}
                        </span>
                      </div>
                    )}
                    {log.type === "growth" && (log.weightKg || log.heightCm) && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {log.weightKg !== null && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                            ⚖️ {log.weightKg} kg
                          </span>
                        )}
                        {log.heightCm !== null && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600">
                            📏 {log.heightCm} cm
                          </span>
                        )}
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
            </SwipeableRow>
          </div>
        );
      })}
      </div>
    </div>
  );
}
