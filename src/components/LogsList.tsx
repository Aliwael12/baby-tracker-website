"use client";

import { useState } from "react";
import PauseTimelineIndicator from "@/components/PauseTimelineIndicator";
import { SwipeableRow, DeleteConfirm } from "@/components/SwipeableLogRow";
import {
  HEALTH_CONDITIONS,
  HEALTH_CONDITION_META,
  type HealthCondition,
} from "@/lib/health";

interface LogEntry {
  id: number;
  type: string;
  side: string | null;
  diaperStatus: string | null;
  weightKg: number | null;
  heightCm: number | null;
  healthCondition: string | null;
  medication: string | null;
  dose: string | null;
  feverCelsius: number | null;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  comments: string | null;
  enteredByName: string;
  pauseTimelineJson?: string | null;
  createdAt: string;
}

interface LogsListProps {
  logs: LogEntry[];
  onDelete?: (id: number) => void;
  onEdit?: () => void | Promise<void>;
}

const TYPE_META: Record<string, { icon: string; label: string }> = {
  pump: { icon: "🍼", label: "Pump" },
  feed: { icon: "🤱", label: "Feed" },
  sleep: { icon: "😴", label: "Sleep" },
  diaper: { icon: "🩲", label: "Diaper" },
  shower: { icon: "🚿", label: "Shower" },
  vitamin: { icon: "💊", label: "Vitamin" },
  growth: { icon: "📏", label: "Growth" },
  health: { icon: "🩺", label: "Health" },
};

const DIAPER_STATUS_META: Record<string, { icon: string; label: string }> = {
  empty: { icon: "✅", label: "Empty" },
  wet: { icon: "💧", label: "Wet" },
  dirty: { icon: "💩", label: "Dirty" },
  wet_and_dirty: { icon: "💧💩", label: "Wet & Dirty" },
};

const FILTER_OPTIONS = [
  { value: null, label: "All" },
  { value: "feed", icon: "🤱", label: "Feed" },
  { value: "sleep", icon: "😴", label: "Sleep" },
  { value: "diaper", icon: "🩲", label: "Diaper" },
  { value: "shower", icon: "🚿", label: "Shower" },
  { value: "vitamin", icon: "💊", label: "Vitamin" },
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

// Ids of the logs that should render a date separator (the first log of each
// date, in display order). Computed in a pure helper so render does not mutate
// a component-scoped variable.
function computeDateHeaderIds(logs: LogEntry[]): Set<number> {
  const ids = new Set<number>();
  let prev = "";
  for (const log of logs) {
    const label = formatDate(log.startTime);
    if (label !== prev) {
      ids.add(log.id);
      prev = label;
    }
  }
  return ids;
}

function toLocalTimeStr(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalDateStr(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function EditLogModal({
  log,
  onClose,
  onSaved,
}: {
  log: LogEntry;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}) {
  // Initialized from the log prop (component is keyed by log.id, so it
  // remounts per log) — no effect needed to sync derived state.
  const [editComments, setEditComments] = useState(log.comments ?? "");
  const [editDiaperStatus, setEditDiaperStatus] = useState<string | null>(
    log.diaperStatus ?? null
  );
  const [editDateStr, setEditDateStr] = useState(() =>
    toLocalDateStr(new Date(log.startTime))
  );
  const [editStartTimeStr, setEditStartTimeStr] = useState(() =>
    toLocalTimeStr(new Date(log.startTime))
  );
  const [editEndTimeStr, setEditEndTimeStr] = useState(() =>
    log.endTime ? toLocalTimeStr(new Date(log.endTime)) : ""
  );
  const [editWeightStr, setEditWeightStr] = useState(() =>
    log.type === "growth" && log.weightKg !== null && log.weightKg !== undefined
      ? String(log.weightKg)
      : ""
  );
  const [editHeightStr, setEditHeightStr] = useState(() =>
    log.type === "growth" && log.heightCm !== null && log.heightCm !== undefined
      ? String(log.heightCm)
      : ""
  );
  const [editHealthCondition, setEditHealthCondition] = useState<HealthCondition | null>(
    () =>
      log.type === "health" &&
      log.healthCondition &&
      log.healthCondition in HEALTH_CONDITION_META
        ? (log.healthCondition as HealthCondition)
        : null
  );
  const [editMedication, setEditMedication] = useState(() =>
    log.type === "health" ? (log.medication ?? "") : ""
  );
  const [editDose, setEditDose] = useState(() =>
    log.type === "health" ? (log.dose ?? "") : ""
  );
  const [editFeverCelsius, setEditFeverCelsius] = useState(() =>
    log.type === "health" &&
    log.feverCelsius !== null &&
    log.feverCelsius !== undefined
      ? String(log.feverCelsius)
      : ""
  );

  const handleSaveEdit = async () => {
    const payload: Record<string, unknown> = {
      comments: editComments.trim() ? editComments.trim() : null,
    };

    if (log.type === "diaper") {
      payload.diaperStatus = editDiaperStatus;
    }

    if (log.type === "growth") {
      const w = editWeightStr.trim() ? parseFloat(editWeightStr) : null;
      const h = editHeightStr.trim() ? parseFloat(editHeightStr) : null;
      if (w == null && h == null) return;
      payload.weightKg = w;
      payload.heightCm = h;
    }

    if (log.type === "health") {
      if (!editHealthCondition) return;
      if (
        editHealthCondition === "fever" &&
        (!editFeverCelsius.trim() || parseFloat(editFeverCelsius) <= 0)
      ) {
        return;
      }
      payload.healthCondition = editHealthCondition;
      payload.medication = editMedication.trim() || null;
      payload.dose = editDose.trim() || null;
      payload.feverCelsius =
        editHealthCondition === "fever" ? parseFloat(editFeverCelsius) : null;
    }

    if (editDateStr && editStartTimeStr) {
      const newStart = new Date(`${editDateStr}T${editStartTimeStr}`);
      payload.startTime = newStart.toISOString();

      if (log.type === "diaper" || log.type === "growth" || log.type === "health") {
        payload.endTime = newStart.toISOString();
      } else if (editEndTimeStr) {
        const newEnd = new Date(`${editDateStr}T${editEndTimeStr}`);
        payload.endTime = newEnd.toISOString();
      } else {
        payload.endTime = null;
      }
    }

    try {
      const res = await fetch(`/api/logs/${log.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await onSaved?.();
        onClose();
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-xs animate-slide-up rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-center text-base font-semibold text-gray-800">
              Edit log
            </p>
            <p className="mt-1 text-center text-xs text-gray-400">
              {TYPE_META[log.type]?.icon} {TYPE_META[log.type]?.label}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-gray-400"
            aria-label="Close edit"
          >
            Close
          </button>
        </div>

        <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Date
        </label>
        <input
          type="date"
          value={editDateStr}
          onChange={(e) => setEditDateStr(e.target.value)}
          className="mb-3 w-full rounded-xl border-2 border-baby-200 bg-baby-50 px-3 py-2.5 text-sm outline-none focus:border-baby-400"
        />

        {log.type === "diaper" || log.type === "growth" || log.type === "health" ? (
          <>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Time
            </label>
            <input
              type="time"
              value={editStartTimeStr}
              onChange={(e) => {
                setEditStartTimeStr(e.target.value);
                setEditEndTimeStr(e.target.value);
              }}
              className="mb-3 w-full rounded-xl border-2 border-baby-200 bg-baby-50 px-3 py-2.5 text-sm outline-none focus:border-baby-400"
            />
          </>
        ) : (
          <div className="mb-3 flex gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Start Time
              </label>
              <input
                type="time"
                value={editStartTimeStr}
                onChange={(e) => setEditStartTimeStr(e.target.value)}
                className="w-full rounded-xl border-2 border-baby-200 bg-baby-50 px-3 py-2.5 text-sm outline-none focus:border-baby-400"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                End Time
              </label>
              <input
                type="time"
                value={editEndTimeStr}
                onChange={(e) => setEditEndTimeStr(e.target.value)}
                className="w-full rounded-xl border-2 border-baby-200 bg-baby-50 px-3 py-2.5 text-sm outline-none focus:border-baby-400"
              />
            </div>
          </div>
        )}

        {log.type === "growth" && (
          <>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Weight (kg)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={editWeightStr}
              onChange={(e) => setEditWeightStr(e.target.value)}
              placeholder="e.g. 4.5"
              className="mb-3 w-full rounded-xl border-2 border-baby-200 bg-baby-50 px-3 py-2.5 text-sm outline-none focus:border-baby-400 placeholder:text-baby-300"
            />
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Height (cm)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={editHeightStr}
              onChange={(e) => setEditHeightStr(e.target.value)}
              placeholder="e.g. 52"
              className="mb-3 w-full rounded-xl border-2 border-baby-200 bg-baby-50 px-3 py-2.5 text-sm outline-none focus:border-baby-400 placeholder:text-baby-300"
            />
          </>
        )}

        {log.type === "health" && (
          <>
            <p className="mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Condition
            </p>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {HEALTH_CONDITIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setEditHealthCondition(opt.value);
                    if (opt.value !== "fever") setEditFeverCelsius("");
                  }}
                  className={`flex flex-col items-center gap-0.5 rounded-xl py-2 text-xs font-semibold transition-all ${
                    editHealthCondition === opt.value
                      ? "bg-baby-400 text-white shadow-sm"
                      : "border-2 border-baby-200 bg-baby-50 text-baby-600"
                  }`}
                >
                  <span className="text-base">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
            {editHealthCondition === "fever" && (
              <>
                <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Temperature (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="35"
                  max="42"
                  value={editFeverCelsius}
                  onChange={(e) => setEditFeverCelsius(e.target.value)}
                  placeholder="e.g. 38.2"
                  className="mb-3 w-full rounded-xl border-2 border-baby-200 bg-baby-50 px-3 py-2.5 text-sm outline-none focus:border-baby-400 placeholder:text-baby-300"
                />
              </>
            )}
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Medication / treatment
            </label>
            <input
              type="text"
              value={editMedication}
              onChange={(e) => setEditMedication(e.target.value)}
              placeholder="e.g. Paracetamol"
              className="mb-3 w-full rounded-xl border-2 border-baby-200 bg-baby-50 px-3 py-2.5 text-sm outline-none focus:border-baby-400 placeholder:text-baby-300"
            />
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Dose
            </label>
            <input
              type="text"
              value={editDose}
              onChange={(e) => setEditDose(e.target.value)}
              placeholder="e.g. 2.5 ml"
              className="mb-3 w-full rounded-xl border-2 border-baby-200 bg-baby-50 px-3 py-2.5 text-sm outline-none focus:border-baby-400 placeholder:text-baby-300"
            />
          </>
        )}

        <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Notes
        </label>
        <input
          type="text"
          value={editComments}
          onChange={(e) => setEditComments(e.target.value)}
          placeholder="Optional"
          className="mb-4 w-full rounded-xl border-2 border-baby-200 bg-baby-50 px-3 py-2.5 text-sm outline-none focus:border-baby-400 placeholder:text-baby-300"
        />

        {log.type === "diaper" && (
          <>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Status
            </label>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {Object.entries(DIAPER_STATUS_META).map(([value, meta]) => (
                <button
                  key={value}
                  onClick={() => setEditDiaperStatus(value)}
                  className={`flex flex-col items-center gap-0.5 rounded-xl py-2 text-xs font-semibold transition-all ${
                    editDiaperStatus === value
                      ? "bg-baby-400 text-white shadow-sm"
                      : "border-2 border-baby-200 bg-baby-50 text-baby-600"
                  }`}
                >
                  <span className="text-base">{meta.icon}</span>
                  {meta.label}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-500 transition-all active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveEdit}
            className="flex-1 rounded-xl bg-baby-400 py-2.5 text-sm font-semibold text-white shadow transition-all active:scale-[0.97]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LogsList({ logs, onDelete, onEdit }: LogsListProps) {
  const [filter, setFilter] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [editLog, setEditLog] = useState<LogEntry | null>(null);

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
  const dateHeaderIds = computeDateHeaderIds(filteredLogs);

  const beginEdit = (log: LogEntry) => {
    setEditLog(log);
  };

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
        const showDateHeader = dateHeaderIds.has(log.id);
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
            <SwipeableRow onDelete={() => setPendingDeleteId(log.id)}>
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
                    <PauseTimelineIndicator pauseTimelineJson={log.pauseTimelineJson} />
                    {showGap && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                          ⏱ {formatGapLabel(gap!)} since previous feed
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
                    {log.type === "health" && log.healthCondition && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {HEALTH_CONDITION_META[log.healthCondition as HealthCondition] && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                            {HEALTH_CONDITION_META[log.healthCondition as HealthCondition].icon}{" "}
                            {HEALTH_CONDITION_META[log.healthCondition as HealthCondition].label}
                          </span>
                        )}
                        {log.feverCelsius !== null && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                            🌡️ {log.feverCelsius}°C
                          </span>
                        )}
                      </div>
                    )}
                    {log.type === "health" && (log.medication || log.dose) && (
                      <p className="mt-1 text-xs text-gray-600">
                        {log.medication}
                        {log.medication && log.dose && " · "}
                        {log.dose && <span className="text-gray-500">Dose: {log.dose}</span>}
                      </p>
                    )}
                    {log.comments && (
                      <p className="mt-1 text-xs text-gray-500 italic">
                        &ldquo;{log.comments}&rdquo;
                      </p>
                    )}
                    <div className="mt-1 text-[11px] text-gray-300">
                      by {log.enteredByName}
                    </div>

                    <div className="mt-2 flex items-center justify-end">
                      <button
                        onClick={() => beginEdit(log)}
                        className="rounded-xl border border-baby-200 bg-baby-50 px-2.5 py-1.5 text-sm font-semibold text-baby-600 transition-all active:scale-[0.97]"
                        aria-label="Edit log"
                        title="Edit log"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </SwipeableRow>
          </div>
        );
      })}
      </div>

      {pendingDeleteId !== null && (
        <DeleteConfirm
          onConfirm={() => {
            onDelete?.(pendingDeleteId);
            setPendingDeleteId(null);
          }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      {editLog && (
        <EditLogModal
          key={editLog.id}
          log={editLog}
          onClose={() => setEditLog(null)}
          onSaved={onEdit}
        />
      )}
    </div>
  );
}
