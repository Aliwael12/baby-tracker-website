"use client";

import { useState } from "react";

type ActivityType = "pump" | "feed" | "sleep" | "diaper" | "shower";

interface ManualEntryProps {
  userName: string;
  onSaved: () => void;
  onClose: () => void;
}

const ACTIVITY_OPTIONS: { value: ActivityType; icon: string; label: string }[] = [
  { value: "pump", icon: "🍼", label: "Pump" },
  { value: "feed", icon: "🤱", label: "Feed" },
  { value: "sleep", icon: "😴", label: "Sleep" },
  { value: "diaper", icon: "👶", label: "Diaper" },
  { value: "shower", icon: "🚿", label: "Shower" },
];

const DIAPER_OPTIONS = [
  { value: "empty", icon: "✅", label: "Empty" },
  { value: "wet", icon: "💧", label: "Wet" },
  { value: "dirty", icon: "💩", label: "Dirty" },
  { value: "wet_and_dirty", icon: "💧💩", label: "Wet & Dirty" },
];

function toLocalDateStr(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toLocalTimeStr(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ManualEntry({ userName, onSaved, onClose }: ManualEntryProps) {
  const [activityType, setActivityType] = useState<ActivityType | null>(null);
  const [side, setSide] = useState<"left" | "right" | null>(null);
  const [diaperStatus, setDiaperStatus] = useState<string | null>(null);
  const [dateStr, setDateStr] = useState(toLocalDateStr(new Date()));
  const [startTimeStr, setStartTimeStr] = useState(toLocalTimeStr(new Date()));
  const [endTimeStr, setEndTimeStr] = useState(toLocalTimeStr(new Date()));
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);

  const needsSide = activityType === "pump" || activityType === "feed";
  const needsDiaperStatus = activityType === "diaper";
  const isDiaper = activityType === "diaper";

  const canSave =
    activityType &&
    startTimeStr &&
    (!needsSide || side) &&
    (!needsDiaperStatus || diaperStatus);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    const start = new Date(`${dateStr}T${startTimeStr}`);
    const end = isDiaper ? start : new Date(`${dateStr}T${endTimeStr}`);

    const payload = {
      type: activityType,
      side: needsSide ? side : null,
      diaperStatus: needsDiaperStatus ? diaperStatus : null,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      comments: comments.trim() || null,
      enteredByName: userName,
    };

    try {
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      onSaved();
      onClose();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="animate-slide-up w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-5 text-center">
          <div className="text-3xl mb-1">📝</div>
          <h2 className="text-xl font-bold text-gray-800">Manual Entry</h2>
        </div>

        {/* Activity Type */}
        <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Activity
        </label>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {ACTIVITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setActivityType(opt.value);
                if (opt.value !== "pump" && opt.value !== "feed") setSide(null);
                if (opt.value !== "diaper") setDiaperStatus(null);
              }}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                activityType === opt.value
                  ? "bg-baby-400 text-white shadow-sm"
                  : "bg-baby-50 text-baby-600"
              }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>

        {/* Side (pump/feed only) */}
        {needsSide && (
          <>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Side
            </label>
            <div className="mb-4 flex gap-2">
              {(["left", "right"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                    side === s
                      ? "bg-baby-400 text-white shadow-sm"
                      : "border-2 border-baby-200 bg-baby-50 text-baby-600"
                  }`}
                >
                  {s === "left" ? "🫲 L" : "🫱 R"}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Diaper Status */}
        {needsDiaperStatus && (
          <>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Status
            </label>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {DIAPER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDiaperStatus(opt.value)}
                  className={`flex flex-col items-center gap-0.5 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                    diaperStatus === opt.value
                      ? "bg-baby-400 text-white shadow-sm"
                      : "border-2 border-baby-200 bg-baby-50 text-baby-600"
                  }`}
                >
                  <span className="text-base">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Date */}
        <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Date
        </label>
        <input
          type="date"
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
          className="mb-4 w-full rounded-xl border-2 border-baby-200 bg-baby-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-baby-400"
        />

        {/* Time */}
        {isDiaper ? (
          <>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Time
            </label>
            <input
              type="time"
              value={startTimeStr}
              onChange={(e) => {
                setStartTimeStr(e.target.value);
                // keep end in sync for UI consistency (diaper saves start=end)
                setEndTimeStr(e.target.value);
              }}
              className="mb-4 w-full rounded-xl border-2 border-baby-200 bg-baby-50 px-3 py-2.5 text-sm outline-none focus:border-baby-400"
            />
          </>
        ) : (
          <>
            <div className="mb-4 flex gap-3">
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTimeStr}
                  onChange={(e) => setStartTimeStr(e.target.value)}
                  className="w-full rounded-xl border-2 border-baby-200 bg-baby-50 px-3 py-2.5 text-sm outline-none focus:border-baby-400"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTimeStr}
                  onChange={(e) => setEndTimeStr(e.target.value)}
                  className="w-full rounded-xl border-2 border-baby-200 bg-baby-50 px-3 py-2.5 text-sm outline-none focus:border-baby-400"
                />
              </div>
            </div>
          </>
        )}

        {/* Comments */}
        <label className="mb-1.5 block text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Notes
        </label>
        <input
          type="text"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Optional"
          className="mb-5 w-full rounded-xl border-2 border-baby-200 bg-baby-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-baby-400 placeholder:text-baby-300"
        />

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-500 transition-all active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-1 rounded-xl bg-baby-400 py-2.5 text-sm font-semibold text-white shadow transition-all active:scale-[0.97] disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}
