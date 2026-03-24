"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import PageHeader from "@/components/PageHeader";

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

export default function GrowthPage() {
  const [logs, setLogs] = useState<GrowthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);

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

    const now = new Date();
    const payload = {
      type: "growth",
      weightKg: weight ? parseFloat(weight) : null,
      heightCm: height ? parseFloat(height) : null,
      startTime: now.toISOString(),
      endTime: now.toISOString(),
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
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
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
          onClick={() => setShowForm(true)}
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
            <div key={log.id} className="animate-slide-up rounded-2xl bg-white p-3 shadow-sm">
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
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
