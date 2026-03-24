"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type ActivityType = "pump" | "feed" | "sleep" | "diaper" | "shower";

interface ActivityTimerCardProps {
  type: ActivityType;
  userName: string;
  onLogSaved: () => void;
}

const ACTIVITY_CONFIG: Record<
  ActivityType,
  { label: string; icon: string; hasSide: boolean; hasTimer: boolean }
> = {
  pump: { label: "Pump", icon: "🍼", hasSide: true, hasTimer: true },
  feed: { label: "Feed", icon: "🤱", hasSide: true, hasTimer: true },
  sleep: { label: "Sleep", icon: "😴", hasSide: false, hasTimer: true },
  diaper: { label: "Diaper", icon: "👶", hasSide: false, hasTimer: false },
  shower: { label: "Shower", icon: "🚿", hasSide: false, hasTimer: true },
};

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function ActivityTimerCard({
  type,
  userName,
  onLogSaved,
}: ActivityTimerCardProps) {
  const config = ACTIVITY_CONFIG[type];

  const [activeSide, setActiveSide] = useState<"left" | "right" | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    if (startTime && !showComment) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startTime, showComment]);

  const handleStart = useCallback(
    (side?: "left" | "right") => {
      if (startTime && !showComment) {
        endTimeRef.current = new Date();
        setShowComment(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      setActiveSide(side || null);
      setStartTime(new Date());
      setElapsed(0);
      endTimeRef.current = null;
    },
    [startTime, showComment]
  );

  const handleInstantLog = useCallback(
    (side?: "left" | "right") => {
      const now = new Date();
      setActiveSide(side || null);
      setStartTime(now);
      endTimeRef.current = now;
      setShowComment(true);
    },
    []
  );

  const handleSave = async () => {
    if (!startTime) return;
    setSaving(true);

    const payload = {
      type,
      side: activeSide,
      startTime: startTime.toISOString(),
      endTime: (endTimeRef.current || new Date()).toISOString(),
      comments: comment.trim() || null,
      enteredByName: userName,
    };

    try {
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      onLogSaved();
    } catch {
      // silently ignore for this fun app
    } finally {
      setStartTime(null);
      setElapsed(0);
      setActiveSide(null);
      setShowComment(false);
      setComment("");
      setSaving(false);
      endTimeRef.current = null;
    }
  };

  const handleCancel = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStartTime(null);
    setElapsed(0);
    setActiveSide(null);
    setShowComment(false);
    setComment("");
    endTimeRef.current = null;
  };

  const isRunning = !!startTime && !showComment;

  if (showComment) {
    return (
      <div className="animate-slide-up rounded-2xl bg-white p-4 shadow-md">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-700">
            {config.icon} {config.label}
            {activeSide ? ` (${activeSide})` : ""}
          </span>
          <span className="rounded-full bg-baby-100 px-3 py-1 text-sm font-medium text-baby-600">
            {formatTimer(elapsed)}
          </span>
        </div>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a note (optional)"
          autoFocus
          className="mb-3 w-full rounded-xl border border-baby-200 bg-baby-50 px-3 py-2 text-sm outline-none transition-colors focus:border-baby-400 placeholder:text-baby-300"
        />
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-500 transition-all active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-baby-400 py-2 text-sm font-semibold text-white shadow transition-all active:scale-[0.97] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    );
  }

  if (config.hasSide) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-md">
        <div className="mb-2 text-center text-sm font-semibold text-gray-500 uppercase tracking-wide">
          {config.icon} {config.label}
        </div>
        {isRunning && (
          <div className="mb-2 text-center">
            <span className="animate-pulse-soft inline-block rounded-full bg-baby-400 px-4 py-1 text-sm font-bold text-white">
              {formatTimer(elapsed)} — {activeSide}
            </span>
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={() =>
              isRunning ? handleStart("left") : handleStart("left")
            }
            disabled={isRunning && activeSide !== "left"}
            className="flex-1 rounded-xl border-2 border-baby-200 bg-baby-50 py-4 text-center transition-all active:scale-[0.95] disabled:opacity-30"
          >
            <span className="block text-2xl">🫲</span>
            <span className="mt-1 block text-xs font-semibold text-baby-600">
              {isRunning && activeSide === "left" ? "Stop" : "Left"}
            </span>
          </button>
          <button
            onClick={() =>
              isRunning ? handleStart("right") : handleStart("right")
            }
            disabled={isRunning && activeSide !== "right"}
            className="flex-1 rounded-xl border-2 border-baby-200 bg-baby-50 py-4 text-center transition-all active:scale-[0.95] disabled:opacity-30"
          >
            <span className="block text-2xl">🫱</span>
            <span className="mt-1 block text-xs font-semibold text-baby-600">
              {isRunning && activeSide === "right" ? "Stop" : "Right"}
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (!config.hasTimer) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-md">
        <button
          onClick={() => handleInstantLog()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-baby-200 bg-baby-50 py-4 transition-all active:scale-[0.95]"
        >
          <span className="text-2xl">{config.icon}</span>
          <span className="font-semibold text-baby-600">{config.label}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-md">
      {isRunning && (
        <div className="mb-2 text-center">
          <span className="animate-pulse-soft inline-block rounded-full bg-baby-400 px-4 py-1 text-sm font-bold text-white">
            {formatTimer(elapsed)}
          </span>
        </div>
      )}
      <button
        onClick={() => handleStart()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-baby-200 bg-baby-50 py-4 transition-all active:scale-[0.95]"
      >
        <span className="text-2xl">{config.icon}</span>
        <span className="font-semibold text-baby-600">
          {isRunning ? `Stop ${config.label}` : config.label}
        </span>
      </button>
    </div>
  );
}
