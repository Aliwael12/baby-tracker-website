"use client";

import { useState, useEffect, useCallback } from "react";
import NamePrompt from "@/components/NamePrompt";
import ActivityTimerCard from "@/components/ActivityTimerCard";
import type { ActivityType } from "@/components/ActivityTimerCard";
import LogsList from "@/components/LogsList";

const ACTIVITIES: ActivityType[] = ["pump", "feed", "sleep", "diaper", "shower"];

export default function Home() {
  const [userName, setUserName] = useState<string | null>(null);
  const [nameLoaded, setNameLoaded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [logs, setLogs] = useState<any[]>([]);
  const [showEditName, setShowEditName] = useState(false);

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
      <section className="mb-8 space-y-3">
        {ACTIVITIES.map((type) => (
          <ActivityTimerCard
            key={type}
            type={type}
            userName={userName}
            onLogSaved={fetchLogs}
          />
        ))}
      </section>

      {/* Logs Timeline */}
      <section>
        <h2 className="mb-3 text-center text-sm font-semibold text-gray-400 uppercase tracking-widest">
          Activity Log
        </h2>
        <LogsList logs={logs} />
      </section>
    </div>
  );
}
