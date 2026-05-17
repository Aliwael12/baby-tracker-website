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
    if (savingType || isLoggedToday(type)) return;
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

  return (
    <div className="grid grid-cols-2 items-start gap-3">
      {DAILY_ACTIONS.map((d) => {
        const done = isLoggedToday(d.type);
        return (
          <div key={d.type} className="flex rounded-2xl bg-white p-3 shadow-md">
            <button
              onClick={() => handleLog(d.type)}
              disabled={savingType !== null || done}
              className={`flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 transition-all active:scale-[0.95] disabled:opacity-100 ${
                done
                  ? "border-green-300 bg-green-50"
                  : "border-baby-200 bg-baby-50 disabled:opacity-60"
              }`}
              aria-label={
                done ? `${d.label} logged for today` : `Log ${d.label} for today`
              }
              title={
                done ? `${d.label} logged for today` : `Log ${d.label} for today`
              }
            >
              {done ? (
                <span
                  key="done"
                  className="animate-tick-pop flex h-9 w-9 items-center justify-center rounded-full bg-green-500"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="animate-tick-draw"
                    />
                  </svg>
                </span>
              ) : (
                <>
                  <span className="text-2xl">{d.icon}</span>
                  <span className="text-xs font-semibold text-baby-600">
                    {savingType === d.type ? "Saving..." : d.label}
                  </span>
                </>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
