"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import NamePrompt from "@/components/NamePrompt";
import ActivityTimerCard from "@/components/ActivityTimerCard";
import type { ActivityType } from "@/components/ActivityTimerCard";
import ManualEntry from "@/components/ManualEntry";
import PageHeader from "@/components/PageHeader";
import LastFeedBanner from "@/components/LastFeedBanner";

const AFTER_FEED: ActivityType[] = ["pump", "sleep", "diaper", "shower"];

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

  if (!nameLoaded || !userName || showEditName) {
    return <NamePrompt onNameSet={handleNameSet} />;
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-8 pt-6">
      <PageHeader
        title="Touti's Tracker"
        subtitle={
          <p className="text-sm text-gray-400">
            Hi,{" "}
            <button
              type="button"
              onClick={handleEditName}
              className="font-semibold text-baby-500 underline decoration-baby-200 underline-offset-2"
            >
              {userName}
            </button>
          </p>
        }
        actions={
          <>
            <Link
              href="/log"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm transition-all active:scale-[0.95]"
              aria-label="Open activity log"
              title="Activity log"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="text-baby-500"
                aria-hidden
              >
                <path
                  d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <button
              type="button"
              onClick={() => setShowManualEntry(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm transition-all active:scale-[0.95]"
              aria-label="Add manual entry"
              title="Add manual entry"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                className="text-baby-500"
                aria-hidden
              >
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </>
        }
      />

      <section className="mb-4 space-y-3">
        <ActivityTimerCard
          type="feed"
          userName={userName}
          onLogSaved={fetchLogs}
        />
        <LastFeedBanner logs={logs} />
        {AFTER_FEED.map((type) => (
          <ActivityTimerCard
            key={type}
            type={type}
            userName={userName}
            onLogSaved={fetchLogs}
          />
        ))}
      </section>

      {showManualEntry && (
        <ManualEntry
          userName={userName}
          onSaved={fetchLogs}
          onClose={() => setShowManualEntry(false)}
        />
      )}
    </div>
  );
}
