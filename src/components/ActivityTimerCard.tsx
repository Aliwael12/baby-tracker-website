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

interface TimerState {
  startTimeISO: string;
  pausedElapsed: number;
  paused: boolean;
  activeSide: "left" | "right" | null;
}

function storageKey(type: ActivityType): string {
  return `babytracker_timer_${type}`;
}

function saveTimerState(type: ActivityType, state: TimerState) {
  try {
    localStorage.setItem(storageKey(type), JSON.stringify(state));
  } catch { /* ignore */ }
}

function loadTimerState(type: ActivityType): TimerState | null {
  try {
    const raw = localStorage.getItem(storageKey(type));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearTimerState(type: ActivityType) {
  try {
    localStorage.removeItem(storageKey(type));
  } catch { /* ignore */ }
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
  const [paused, setPaused] = useState(false);
  const pausedElapsedRef = useRef(0);
  const [showDiaperStatus, setShowDiaperStatus] = useState(false);
  const [diaperStatus, setDiaperStatus] = useState<string | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<Date | null>(null);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const saved = loadTimerState(type);
    if (!saved) return;
    const restored = new Date(saved.startTimeISO);
    if (isNaN(restored.getTime())) return;
    setActiveSide(saved.activeSide);
    pausedElapsedRef.current = saved.pausedElapsed;
    setPaused(saved.paused);
    setStartTime(restored);
    if (saved.paused) {
      setElapsed(saved.pausedElapsed);
    } else {
      setElapsed(
        saved.pausedElapsed +
          Math.floor((Date.now() - restored.getTime()) / 1000)
      );
    }
  }, [type]);

  useEffect(() => {
    if (startTime && !showComment && !paused) {
      intervalRef.current = setInterval(() => {
        setElapsed(
          pausedElapsedRef.current +
            Math.floor((Date.now() - startTime.getTime()) / 1000)
        );
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startTime, showComment, paused]);

  const handleStart = useCallback(
    (side?: "left" | "right") => {
      if (startTime && !showComment && !paused) {
        endTimeRef.current = new Date();
        setShowComment(true);
        clearTimerState(type);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      const now = new Date();
      setActiveSide(side || null);
      setStartTime(now);
      setElapsed(0);
      setPaused(false);
      pausedElapsedRef.current = 0;
      endTimeRef.current = null;
      saveTimerState(type, {
        startTimeISO: now.toISOString(),
        pausedElapsed: 0,
        paused: false,
        activeSide: side || null,
      });
    },
    [startTime, showComment, paused, type]
  );

  const handleStop = useCallback(() => {
    if (!startTime) return;
    endTimeRef.current = new Date();
    setShowComment(true);
    setPaused(false);
    clearTimerState(type);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [startTime, type]);

  const handlePause = useCallback(() => {
    if (!startTime || paused) return;
    pausedElapsedRef.current = elapsed;
    setPaused(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    saveTimerState(type, {
      startTimeISO: startTime.toISOString(),
      pausedElapsed: elapsed,
      paused: true,
      activeSide,
    });
  }, [startTime, paused, elapsed, type, activeSide]);

  const handleResume = useCallback(() => {
    if (!paused) return;
    const now = new Date();
    setStartTime(now);
    setPaused(false);
    saveTimerState(type, {
      startTimeISO: now.toISOString(),
      pausedElapsed: pausedElapsedRef.current,
      paused: false,
      activeSide,
    });
  }, [paused, type, activeSide]);

  const handleInstantLog = useCallback(
    (side?: "left" | "right") => {
      const now = new Date();
      setActiveSide(side || null);
      setStartTime(now);
      endTimeRef.current = now;
      if (type === "diaper") {
        setShowDiaperStatus(true);
      } else {
        setShowComment(true);
      }
    },
    [type]
  );

  const handleDiaperStatusSelect = (status: string) => {
    setDiaperStatus(status);
    setShowDiaperStatus(false);
    setShowComment(true);
  };

  const handleSave = async () => {
    if (!startTime) return;
    setSaving(true);

    const payload = {
      type,
      side: activeSide,
      diaperStatus: type === "diaper" ? diaperStatus : null,
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
      setPaused(false);
      pausedElapsedRef.current = 0;
      setActiveSide(null);
      setShowDiaperStatus(false);
      setDiaperStatus(null);
      setShowComment(false);
      setComment("");
      setSaving(false);
      endTimeRef.current = null;
      clearTimerState(type);
    }
  };

  const handleCancel = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStartTime(null);
    setElapsed(0);
    setPaused(false);
    pausedElapsedRef.current = 0;
    setActiveSide(null);
    setShowDiaperStatus(false);
    setDiaperStatus(null);
    setShowComment(false);
    setComment("");
    endTimeRef.current = null;
    clearTimerState(type);
  };

  const isActive = !!startTime && !showComment && !showDiaperStatus;
  const isRunning = isActive && !paused;

  const DIAPER_OPTIONS = [
    { value: "empty", icon: "✅", label: "Empty" },
    { value: "wet", icon: "💧", label: "Wet" },
    { value: "dirty", icon: "💩", label: "Dirty" },
    { value: "wet_and_dirty", icon: "💧💩", label: "Wet & Dirty" },
  ];

  if (showDiaperStatus) {
    return (
      <div className="animate-slide-up rounded-2xl bg-white p-4 shadow-md">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-700">
            {config.icon} {config.label}
          </span>
          <button
            onClick={handleCancel}
            className="text-xs text-gray-400"
          >
            Cancel
          </button>
        </div>
        <p className="mb-3 text-center text-sm text-gray-500">What&apos;s the status?</p>
        <div className="grid grid-cols-2 gap-2">
          {DIAPER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleDiaperStatusSelect(opt.value)}
              className="flex flex-col items-center gap-1 rounded-xl border-2 border-baby-200 bg-baby-50 py-3 transition-all active:scale-[0.95] active:border-baby-400"
            >
              <span className="text-xl">{opt.icon}</span>
              <span className="text-xs font-semibold text-baby-600">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (showComment) {
    return (
      <div className="animate-slide-up rounded-2xl bg-white p-4 shadow-md">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-700">
            {config.icon} {config.label}
            {activeSide ? ` (${activeSide === "left" ? "L" : "R"})` : ""}
            {diaperStatus && (
              <span className="ml-1 text-sm font-normal text-baby-500">
                ({DIAPER_OPTIONS.find(o => o.value === diaperStatus)?.label})
              </span>
            )}
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
        {isActive && (
          <div className="mb-2 text-center">
            <span className={`inline-block rounded-full px-4 py-1 text-sm font-bold text-white ${paused ? "bg-amber-400" : "animate-pulse-soft bg-baby-400"}`}>
              {formatTimer(elapsed)} — {activeSide === "left" ? "L" : "R"} {paused ? "(paused)" : ""}
            </span>
          </div>
        )}
        {isActive ? (
          <div className="flex gap-2">
            {paused ? (
              <button
                onClick={handleResume}
                className="flex-1 rounded-xl border-2 border-green-300 bg-green-50 py-3 text-center text-sm font-semibold text-green-600 transition-all active:scale-[0.95]"
              >
                ▶ Resume
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="flex-1 rounded-xl border-2 border-amber-300 bg-amber-50 py-3 text-center text-sm font-semibold text-amber-600 transition-all active:scale-[0.95]"
              >
                ⏸ Pause
              </button>
            )}
            <button
              onClick={handleStop}
              className="flex-1 rounded-xl border-2 border-red-300 bg-red-50 py-3 text-center text-sm font-semibold text-red-600 transition-all active:scale-[0.95]"
            >
              ⏹ Stop
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => handleStart("left")}
              className="flex-1 rounded-xl border-2 border-baby-200 bg-baby-50 py-4 text-center transition-all active:scale-[0.95]"
            >
              <span className="block text-2xl">🫲</span>
              <span className="mt-1 block text-xs font-semibold text-baby-600">L</span>
            </button>
            <button
              onClick={() => handleStart("right")}
              className="flex-1 rounded-xl border-2 border-baby-200 bg-baby-50 py-4 text-center transition-all active:scale-[0.95]"
            >
              <span className="block text-2xl">🫱</span>
              <span className="mt-1 block text-xs font-semibold text-baby-600">R</span>
            </button>
          </div>
        )}
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
      {isActive && (
        <div className="mb-2 text-center">
          <span className={`inline-block rounded-full px-4 py-1 text-sm font-bold text-white ${paused ? "bg-amber-400" : "animate-pulse-soft bg-baby-400"}`}>
            {formatTimer(elapsed)} {paused ? "(paused)" : ""}
          </span>
        </div>
      )}
      {isActive ? (
        <div className="flex gap-2">
          {paused ? (
            <button
              onClick={handleResume}
              className="flex-1 rounded-xl border-2 border-green-300 bg-green-50 py-3 text-center text-sm font-semibold text-green-600 transition-all active:scale-[0.95]"
            >
              ▶ Resume
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="flex-1 rounded-xl border-2 border-amber-300 bg-amber-50 py-3 text-center text-sm font-semibold text-amber-600 transition-all active:scale-[0.95]"
            >
              ⏸ Pause
            </button>
          )}
          <button
            onClick={handleStop}
            className="flex-1 rounded-xl border-2 border-red-300 bg-red-50 py-3 text-center text-sm font-semibold text-red-600 transition-all active:scale-[0.95]"
          >
            ⏹ Stop
          </button>
        </div>
      ) : (
        <button
          onClick={() => handleStart()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-baby-200 bg-baby-50 py-4 transition-all active:scale-[0.95]"
        >
          <span className="text-2xl">{config.icon}</span>
          <span className="font-semibold text-baby-600">{config.label}</span>
        </button>
      )}
    </div>
  );
}
