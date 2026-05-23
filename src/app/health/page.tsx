"use client";

import { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import { SwipeableRow, DeleteConfirm } from "@/components/SwipeableLogRow";
import {
  HEALTH_CONDITIONS,
  HEALTH_CONDITION_META,
  type HealthCondition,
} from "@/lib/health";

interface HealthLog {
  id: number;
  healthCondition: string | null;
  medication: string | null;
  dose: string | null;
  feverCelsius: number | null;
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

function toIsoOnDateWithCurrentClock(dateStr: string): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const t = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return new Date(`${dateStr}T${t}`).toISOString();
}

function HealthLogSummary({ log }: { log: HealthLog }) {
  const cond = log.healthCondition;
  const meta = cond ? HEALTH_CONDITION_META[cond as HealthCondition] : null;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {meta && (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
            {meta.icon} {meta.label}
          </span>
        )}
        {log.feverCelsius !== null && (
          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
            🌡️ {log.feverCelsius}°C
          </span>
        )}
      </div>
      {(log.medication || log.dose) && (
        <p className="mt-1 text-xs text-gray-600">
          {log.medication && <span>{log.medication}</span>}
          {log.medication && log.dose && <span> · </span>}
          {log.dose && <span className="text-gray-500">Dose: {log.dose}</span>}
        </p>
      )}
    </>
  );
}

export default function HealthPage() {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [condition, setCondition] = useState<HealthCondition | null>(null);
  const [medication, setMedication] = useState("");
  const [dose, setDose] = useState("");
  const [feverCelsius, setFeverCelsius] = useState("");
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [logDateChoice, setLogDateChoice] = useState<"today" | "custom">("today");
  const [customDate, setCustomDate] = useState(() => toLocalDateStr(new Date()));

  const [editingLog, setEditingLog] = useState<HealthLog | null>(null);
  const [editCondition, setEditCondition] = useState<HealthCondition | null>(null);
  const [editMedication, setEditMedication] = useState("");
  const [editDose, setEditDose] = useState("");
  const [editFeverCelsius, setEditFeverCelsius] = useState("");
  const [editComments, setEditComments] = useState("");
  const [editDateStr, setEditDateStr] = useState("");
  const [editTimeStr, setEditTimeStr] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const userName =
    typeof window !== "undefined"
      ? localStorage.getItem("babytracker_username") || "Unknown"
      : "Unknown";

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/logs?limit=all");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.filter((l: { type: string }) => l.type === "health"));
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
    setEditCondition(
      editingLog.healthCondition && editingLog.healthCondition in HEALTH_CONDITION_META
        ? (editingLog.healthCondition as HealthCondition)
        : null
    );
    setEditMedication(editingLog.medication ?? "");
    setEditDose(editingLog.dose ?? "");
    setEditFeverCelsius(
      editingLog.feverCelsius !== null && editingLog.feverCelsius !== undefined
        ? String(editingLog.feverCelsius)
        : ""
    );
  }, [editingLog]);

  const canSave =
    condition !== null &&
    (condition !== "fever" || (feverCelsius.trim() !== "" && parseFloat(feverCelsius) > 0));

  const handleSave = async () => {
    if (!canSave || !condition) return;
    setSaving(true);

    const startIso =
      logDateChoice === "today"
        ? new Date().toISOString()
        : toIsoOnDateWithCurrentClock(customDate);

    const payload = {
      type: "health",
      healthCondition: condition,
      medication: medication.trim() || null,
      dose: dose.trim() || null,
      feverCelsius: condition === "fever" ? parseFloat(feverCelsius) : null,
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
      resetForm();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setCondition(null);
    setMedication("");
    setDose("");
    setFeverCelsius("");
    setComments("");
    setLogDateChoice("today");
    setCustomDate(toLocalDateStr(new Date()));
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
    if (!editingLog || !editCondition) return;
    if (
      editCondition === "fever" &&
      (!editFeverCelsius.trim() || parseFloat(editFeverCelsius) <= 0)
    ) {
      return;
    }

    setEditSaving(true);
    const newStart = new Date(`${editDateStr}T${editTimeStr}`);
    const startIso = newStart.toISOString();

    try {
      const res = await fetch(`/api/logs/${editingLog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          healthCondition: editCondition,
          medication: editMedication.trim() || null,
          dose: editDose.trim() || null,
          feverCelsius:
            editCondition === "fever" ? parseFloat(editFeverCelsius) : null,
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
        <div className="animate-pulse-soft text-4xl">🩺</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-8 pt-6">
      <PageHeader
        title="Health"
        subtitle={<p className="text-sm text-gray-400">Track illness &amp; medication</p>}
      />

      {!showForm && (
        <button
          onClick={openForm}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-baby-300 bg-baby-50/50 py-3 transition-all active:scale-[0.98]"
        >
          <span className="text-lg">➕</span>
          <span className="text-sm font-semibold text-baby-500">Log Health Entry</span>
        </button>
      )}

      {showForm && (
        <div className="animate-slide-up mb-6 rounded-2xl bg-white p-5 shadow-md">
          <h3 className="mb-4 text-center text-sm font-bold text-gray-700">New Health Entry</h3>

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

          <p className="mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Condition
          </p>
          <div className="mb-3 grid grid-cols-2 gap-2">
            {HEALTH_CONDITIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setCondition(opt.value);
                  if (opt.value !== "fever") setFeverCelsius("");
                }}
                className={`flex flex-col items-center gap-0.5 rounded-xl py-2.5 text-xs font-semibold transition-all active:scale-[0.97] ${
                  condition === opt.value
                    ? "bg-baby-400 text-white shadow-sm"
                    : "border-2 border-baby-200 bg-baby-50 text-baby-600"
                }`}
              >
                <span className="text-base">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>

          {condition === "fever" && (
            <>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Temperature (°C)
              </label>
              <input
                type="number"
                step="0.1"
                min="35"
                max="42"
                value={feverCelsius}
                onChange={(e) => setFeverCelsius(e.target.value)}
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
            value={medication}
            onChange={(e) => setMedication(e.target.value)}
            placeholder="e.g. Paracetamol"
            className="mb-3 w-full rounded-xl border-2 border-baby-200 bg-baby-50 px-3 py-2.5 text-sm outline-none focus:border-baby-400 placeholder:text-baby-300"
          />

          <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Dose
          </label>
          <input
            type="text"
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            placeholder="e.g. 2.5 ml"
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
              type="button"
              onClick={resetForm}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-500 transition-all active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || saving}
              className="flex-1 rounded-xl bg-baby-400 py-2.5 text-sm font-semibold text-white shadow transition-all active:scale-[0.97] disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      <h2 className="mb-3 text-center text-sm font-semibold text-gray-400 uppercase tracking-widest">
        Health History
      </h2>
      {logs.length === 0 ? (
        <div className="py-12 text-center text-baby-300">
          <div className="text-4xl mb-2">🩺</div>
          <p className="text-sm">No health entries logged yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <SwipeableRow key={log.id} onDelete={() => setPendingDeleteId(log.id)}>
              <div className="animate-slide-up rounded-2xl bg-white p-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-xl">
                    🩺
                  </div>
                  <div className="min-w-0 flex-1">
                    <HealthLogSummary log={log} />
                    <div className="mt-1 text-xs text-gray-400">{formatDate(log.startTime)}</div>
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
                        aria-label="Edit health entry"
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
          <div className="max-h-[90dvh] w-full max-w-xs animate-slide-up overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-center text-base font-semibold text-gray-800">
                  Edit health entry
                </p>
                <p className="mt-1 text-center text-xs text-gray-400">🩺 Health</p>
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

            <p className="mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Condition
            </p>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {HEALTH_CONDITIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setEditCondition(opt.value);
                    if (opt.value !== "fever") setEditFeverCelsius("");
                  }}
                  className={`flex flex-col items-center gap-0.5 rounded-xl py-2 text-xs font-semibold transition-all ${
                    editCondition === opt.value
                      ? "bg-baby-400 text-white shadow-sm"
                      : "border-2 border-baby-200 bg-baby-50 text-baby-600"
                  }`}
                >
                  <span className="text-base">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>

            {editCondition === "fever" && (
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
                  editSaving ||
                  !editCondition ||
                  (editCondition === "fever" &&
                    (!editFeverCelsius.trim() || parseFloat(editFeverCelsius) <= 0))
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
