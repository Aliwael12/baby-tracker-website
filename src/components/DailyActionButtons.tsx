"use client";

import { useState } from "react";

interface DailyActionButtonsProps {
  userName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logs: any[];
  onLogSaved: () => void;
}

const DAILY_ACTIONS = [
  { type: "shower", icon: "🚿", label: "Shower" },
  { type: "vitamin", icon: "💊", label: "Vitamin" },
] as const;

export default function DailyActionButtons({
  userName,
  logs,
  onLogSaved,
}: DailyActionButtonsProps) {
  const [savingType, setSavingType] = useState<string | null>(null);

  const isLoggedToday = (type: string) => {
    const today = new Date().toDateString();
    return logs.some(
      (l) => l.type === type && new Date(l.startTime).toDateString() === today
    );
  };

  const handleLog = async (type: string) => {
    if (savingType) return;
    setSavingType(type);
    const now = new Date();
    try {
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
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
      setSavingType(null);
    }
  };

  const available = DAILY_ACTIONS.filter((d) => !isLoggedToday(d.type));
  if (available.length === 0) return null;

  return (
    <div className="mb-4 flex justify-center gap-3">
      {available.map((d) => (
        <button
          key={d.type}
          onClick={() => handleLog(d.type)}
          disabled={savingType !== null}
          className="flex flex-col items-center gap-1 rounded-2xl bg-white px-6 py-3 shadow-md transition-all active:scale-[0.95] disabled:opacity-60"
          aria-label={`Log ${d.label} for today`}
          title={`Log ${d.label} for today`}
        >
          <span className="text-2xl">{d.icon}</span>
          <span className="text-xs font-semibold text-baby-600">
            {savingType === d.type ? "Saving..." : d.label}
          </span>
        </button>
      ))}
    </div>
  );
}
