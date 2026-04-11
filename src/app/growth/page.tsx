"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import { SwipeableRow, DeleteConfirm } from "@/components/SwipeableLogRow";

interface GrowthLog {
  id: number;
  weightKg: number | null;
  heightCm: number | null;
  startTime: string;
  enteredByName: string;
  comments: string | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function toLocalDateStr(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toLocalTimeStr(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Same calendar day as `dateStr` (YYYY-MM-DD), using the current local clock time. */
function toIsoOnDateWithCurrentClock(dateStr: string): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const t = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return new Date(`${dateStr}T${t}`).toISOString();
}

export default function GrowthPage() {
  const [logs, setLogs] = useState<GrowthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [logDateChoice, setLogDateChoice] = useState<"today" | "custom">("today");
  const [customDate, setCustomDate] = useState(() => toLocalDateStr(new Date()));

  const [editingLog, setEditingLog] = useState<GrowthLog | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const [editComments, setEditComments] = useState("");
  const [editDateStr, setEditDateStr] = useState("");
  const [editTimeStr, setEditTimeStr] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const userName = typeof window !== "undefined"
    ? localStorage.getItem("babytracker_username") || "Unknown"
    : "Unknown";

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/logs?limit=all");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.filter((l: { type: string }) => l.type === "growth"));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!editingLog) return;
    setEditComments(editingLog.comments ?? "");
    const start = new Date(editingLog.startTime);
    setEditDateStr(toLocalDateStr(start));
    setEditTimeStr(toLocalTimeStr(start));
    setEditWeight(
      editingLog.weightKg !== null && editingLog.weightKg !== undefined
        ? String(editingLog.weightKg)
        : ""
    );
    setEditHeight(
      editingLog.heightCm !== null && editingLog.heightCm !== undefined
        ? String(editingLog.heightCm)
        : ""
    );
  }, [editingLog]);

  const latestWeight = useMemo(() => {
    const withWeight = logs.filter((l) => l.weightKg !== null);
    return withWeight.length > 0 ? withWeight[0] : null;
  }, [logs]);

  const latestHeight = useMemo(() => {
    const withHeight = logs.filter((l) => l.heightCm !== null);
    return withHeight.length > 0 ? withHeight[0] : null;
  }, [logs]);

  const handleSave = async () => {
    if (!weight && !height) return;
    setSaving(true);

    const startIso =
      logDateChoice === "today"
        ? new Date().toISOString()
        : toIsoOnDateWithCurrentClock(customDate);

    const payload = {
      type: "growth",
      weightKg: weight ? parseFloat(weight) : null,
      heightCm: height ? parseFloat(height) : null,
      startTime: startIso,
      endTime: startIso,
      comments: comments.trim() || null,
      enteredByName: userName,
    };

    try {
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await fetchLogs();
      setShowForm(false);
      setWeight("");
      setHeight("");
      setComments("");
      setLogDateChoice("today");
      setCustomDate(toLocalDateStr(new Date()));
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLog = useCallback(
    async (id: number) => {
      setLogs((prev) => prev.filter((l) => l.id !== id));
      try {
        await fetch(`/api/logs/${id}`, { method: "DELETE" });
      } catch {
        fetchLogs();
      }
    },
    [fetchLogs]
  );

  const handleSaveEdit = async () => {
    if (!editingLog) return;
    const w = editWeight.trim() ? parseFloat(editWeight) : null;
    const h = editHeight.trim() ? parseFloat(editHeight) : null;
    if (w == null && h == null) return;

    setEditSaving(true);
    const newStart = new Date(`${editDateStr}T${editTimeStr}`);
    const startIso = newStart.toISOString();

    try {
      const res = await fetch(`/api/logs/${editingLog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightKg: w,
          heightCm: h,
          comments: editComments.trim() ? editComments.trim() : null,
          startTime: startIso,
          endTime: startIso,
        }),
      });
      if (res.ok) {
        await fetchLogs();
        setEditingLog(null);
      }
    } catch {
      // ignore
    } finally {
      setEditSaving(false);
    }
  };

  const openForm = () => {
    setShowForm(true);
    setLogDateChoice("today");
    setCustomDate(toLocalDateStr(new Date()));
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="animate-pulse-soft text-4xl">📏</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-8 pt-6">
      <PageHeader
        title="Growth"
        subtitle={<p className="text-sm text-gray-400">Track weight &amp; height</p>}
      />

      {/* Current stats */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
          <div className="text-2xl mb-1">⚖️</div>
          <div className="text-xl font-bold text-gray-800">
            {latestWeight ? `${latestWeight.weightKg} kg` : "—"}
          </div>
          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
            {latestWeight ? `Last: ${formatDate(latestWeight.startTime)}` : "No data"}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
          <div className="text-2xl mb-1">📏</div>
          <div className="text-xl font-bold text-gray-800">
            {latestHeight ? `${latestHeight.heightCm} cm` : "—"}
          </div>
          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
            {latestHeight ? `Last: ${formatDate(latestHeight.startTime)}` : "No data"}
          </div>
        </div>
      </div>

      {/* Add button */}
      {!showForm && (
        <button
          onClick={openForm}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-baby-300 bg-baby-50/50 py-3 transition-all active:scale-[0.98]"
        >
          <span className="text-lg">➕</span>
          <span className="text-sm font-semibold text-baby-500">Log Measurement</span>
        </button>
      )}

      {/* Entry form */}
      {showForm && (
        <div className="animate-slide-up mb-6 rounded-2xl bg-white p-5 shadow-md">
          <h3 className="mb-4 text-center text-sm font-bold text-gray-700">New Measurement</h3>

          <p className="mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Date
          </p>
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => setLogDateChoice("today")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-[0.97] ${
                logDateChoice === "today"
                  ? "bg-baby-400 text-white shadow-sm"
                  : "border-2 border-baby-200 bg-baby-50 text-baby-600"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setLogDateChoice("custom")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-[0.97] ${
                logDateChoice === "custom"
                  ? "bg-baby-400 text-white shadow-sm"
                  : "border-2 border-baby-200 bg-baby-50 text-baby-600"
              }`}
            >
              Another date
            </button>
          </div>
          {logDateChoice === "custom" && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="mb-3 w-full rounded-xl border-2 border-baby-200 bg-baby-50 px-3 py-2.5 text-sm outline-none focus:border-baby-400"
            />
          )}

          <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Weight (kg)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
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
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder="e.g. 52"
            className="mb-3 w-full rounded-xl border-2 border-baby-200 bg-baby-50 px-3 py-2.5 text-sm outline-none focus:border-baby-400 placeholder:text-baby-300"
          />

          <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Notes
          </label>
          <input
            type="text"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Optional"
            className="mb-4 w-full rounded-xl border-2 border-baby-200 bg-baby-50 px-3 py-2.5 text-sm outline-none focus:border-baby-400 placeholder:text-baby-300"
          />

          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowForm(false);
                setWeight("");
                setHeight("");
                setComments("");
                setLogDateChoice("today");
                setCustomDate(toLocalDateStr(new Date()));
              }}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-500 transition-all active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={(!weight && !height) || saving}
              className="flex-1 rounded-xl bg-baby-400 py-2.5 text-sm font-semibold text-white shadow transition-all active:scale-[0.97] disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* History */}
      <h2 className="mb-3 text-center text-sm font-semibold text-gray-400 uppercase tracking-widest">
        Growth History
      </h2>
      {logs.length === 0 ? (
        <div className="py-12 text-center text-baby-300">
          <div className="text-4xl mb-2">📏</div>
          <p className="text-sm">No measurements logged yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <SwipeableRow
              key={log.id}
              onDelete={() => setPendingDeleteId(log.id)}
            >
              <div className="animate-slide-up rounded-2xl bg-white p-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-50 text-xl">
                    📏
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      {log.weightKg !== null && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
                          ⚖️ {log.weightKg} kg
                        </span>
                      )}
                      {log.heightCm !== null && (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-600">
                          📏 {log.heightCm} cm
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {formatDate(log.startTime)}
                    </div>
                    {log.comments && (
                      <p className="mt-0.5 text-xs text-gray-500 italic">
                        &ldquo;{log.comments}&rdquo;
                      </p>
                    )}
                    <div className="mt-0.5 text-[11px] text-gray-300">
                      by {log.enteredByName}
                    </div>
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingLog(log)}
                        className="rounded-xl border border-baby-200 bg-baby-50 px-2.5 py-1.5 text-sm font-semibold text-baby-600 transition-all active:scale-[0.97]"
                        aria-label="Edit measurement"
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </SwipeableRow>
          ))}
        </div>
      )}

      {pendingDeleteId !== null && (
        <DeleteConfirm
          onConfirm={() => {
            handleDeleteLog(pendingDeleteId);
            setPendingDeleteId(null);
          }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-xs animate-slide-up rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-center text-base font-semibold text-gray-800">
                  Edit measurement
                </p>
                <p className="mt-1 text-center text-xs text-gray-400">📏 Growth</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingLog(null)}
                className="shrink-0 text-xs text-gray-400"
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

            <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Time
            </label>
            <input
              type="time"
              value={editTimeStr}
              onChange={(e) => setEditTimeStr(e.target.value)}
              className="mb-3 w-full rounded-xl border-2 border-baby-200 bg-baby-50 px-3 py-2.5 text-sm outline-none focus:border-baby-400"
            />

            <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Weight (kg)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={editWeight}
              onChange={(e) => setEditWeight(e.target.value)}
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
              value={editHeight}
              onChange={(e) => setEditHeight(e.target.value)}
              placeholder="e.g. 52"
              className="mb-3 w-full rounded-xl border-2 border-baby-200 bg-baby-50 px-3 py-2.5 text-sm outline-none focus:border-baby-400 placeholder:text-baby-300"
            />

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

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingLog(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-500 transition-all active:scale-[0.97]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={
                  editSaving || (!editWeight.trim() && !editHeight.trim())
                }
                className="flex-1 rounded-xl bg-baby-400 py-2.5 text-sm font-semibold text-white shadow transition-all active:scale-[0.97] disabled:opacity-40"
              >
                {editSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
