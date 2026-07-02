"use client";

import { useState } from "react";

interface LogEntry {
  type: string;
  startTime: string;
}

interface NailCutBannerProps {
  userName: string;
  logs: LogEntry[];
  onLogSaved: () => void;
}

// Reminder cadence: Sundays (0) and Wednesdays (3).
const REMINDER_DAYS = [0, 3];

export default function NailCutBanner({
  userName,
  logs,
  onLogSaved,
}: NailCutBannerProps) {
  const [saving, setSaving] = useState(false);

  // Only nag on the reminder days.
  if (!REMINDER_DAYS.includes(new Date().getDay())) return null;

  // Once it's been logged today, the reminder is handled — hide it for the day.
  const today = new Date().toDateString();
  const doneToday = logs.some(
    (l) => l.type === "nailcut" && new Date(l.startTime).toDateString() === today
  );
  if (doneToday) return null;

  const handleCheck = async () => {
    if (saving) return;
    setSaving(true);
    const now = new Date();
    try {
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "nailcut",
          side: null,
          diaperStatus: null,
          startTime: now.toISOString(),
          endTime: now.toISOString(),
          comments: null,
          enteredByName: userName,
          pauseTimeline: null,
        }),
      });
      onLogSaved();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-violet-50 to-baby-50 p-3 shadow-sm">
      <span className="text-sm text-gray-600">
        💅 Time to <span className="font-bold text-violet-600">cut the nails</span>
      </span>
      <button
        type="button"
        onClick={handleCheck}
        disabled={saving}
        aria-label="Mark nail cut as done"
        title="Mark nail cut as done"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm transition-all active:scale-[0.95] disabled:opacity-50"
      >
        {saving ? (
          <span className="text-sm">…</span>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 13l4 4L19 7"
              stroke="#7c3aed"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
