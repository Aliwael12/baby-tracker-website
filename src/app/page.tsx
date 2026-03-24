"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import NamePrompt from "@/components/NamePrompt";
import ActivityTimerCard from "@/components/ActivityTimerCard";
import type { ActivityType } from "@/components/ActivityTimerCard";
import LogsList from "@/components/LogsList";
import DailyStats from "@/components/DailyStats";
import ManualEntry from "@/components/ManualEntry";

const ACTIVITIES: ActivityType[] = ["pump", "feed", "sleep", "diaper", "shower"];

export default function Home() {
  const [userName, setUserName] = useState<string | null>(null);
  const [nameLoaded, setNameLoaded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [logs, setLogs] = useState<any[]>([]);
  const [showEditName, setShowEditName] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("babytracker_username");
    if (stored) setUserName(stored);
    setNameLoaded(true);
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, 15000);
    return () => clearInterval(id);
  }, [fetchLogs]);

  const handleNameSet = (name: string) => {
    setUserName(name);
    setShowEditName(false);
  };

  const handleEditName = () => {
    setShowEditName(true);
  };

  const handleCancelEdit = () => {
    setShowEditName(false);
  };

  const handleDeleteLog = useCallback(async (id: number) => {
    setLogs((prev) => prev.filter((l) => l.id !== id));
    try {
      await fetch(`/api/logs/${id}`, { method: "DELETE" });
    } catch {
      fetchLogs();
    }
  }, [fetchLogs]);

  if (!nameLoaded || !userName || showEditName) {
    return (
      <NamePrompt
        onNameSet={handleNameSet}
      />
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-8 pt-6">
      {/* Header */}
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-baby-600">Touti's Tracker</h1>
        <p className="mt-1 text-sm text-gray-400">
          Hi, <button onClick={handleEditName} className="font-semibold text-baby-500 underline decoration-baby-200 underline-offset-2">{userName}</button>
          {showEditName && (
            <button onClick={handleCancelEdit} className="ml-2 text-xs text-gray-400">(cancel)</button>
          )}
        </p>
      </header>

      {/* Activity Cards */}
      <section className="mb-4 space-y-3">
        {ACTIVITIES.map((type) => (
          <ActivityTimerCard
            key={type}
            type={type}
            userName={userName}
            onLogSaved={fetchLogs}
          />
        ))}
      </section>

      {/* Manual Entry Button */}
      <section className="mb-8">
        <button
          onClick={() => setShowManualEntry(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-baby-300 bg-baby-50/50 py-3 transition-all active:scale-[0.98]"
        >
          <span className="text-lg">📝</span>
          <span className="text-sm font-semibold text-baby-500">Add Manual Entry</span>
        </button>
      </section>

      {showManualEntry && (
        <ManualEntry
          userName={userName}
          onSaved={fetchLogs}
          onClose={() => setShowManualEntry(false)}
        />
      )}

      {/* Daily Stats */}
      <section className="mb-8">
        <h2 className="mb-3 text-center text-sm font-semibold text-gray-400 uppercase tracking-widest">
          Today&apos;s Summary
        </h2>
        <DailyStats logs={logs} />
      </section>

      {/* Logs Timeline */}
      <section>
        <h2 className="mb-3 text-center text-sm font-semibold text-gray-400 uppercase tracking-widest">
          Activity Log
        </h2>
        <LogsList logs={logs} onDelete={handleDeleteLog} />
      </section>

      {/* History Link */}
      <section className="mt-6 text-center">
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 rounded-full bg-baby-50 px-5 py-2.5 text-sm font-semibold text-baby-500 shadow-sm transition-all active:scale-[0.97]"
        >
          📅 View Full History
        </Link>
      </section>
    </div>
  );
}
