"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import NamePrompt from "@/components/NamePrompt";
import LogsList from "@/components/LogsList";
import PageHeader from "@/components/PageHeader";

export default function ActivityLogPage() {
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
      const res = await fetch("/api/logs?limit=all");
      if (res.ok) setLogs(await res.json());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, 15000);
    return () => clearInterval(id);
  }, [fetchLogs]);

  const handleDeleteLog = useCallback(
    async (id: number) => {
      setLogs((prev) => prev.filter((l) => l.id !== id));
      try {
        await fetch(`/api/logs/${id}`, { method: "DELETE" });
      } catch {
        fetchLogs();
      }
    },
    [fetchLogs]
  );

  if (!nameLoaded || !userName || showEditName) {
    return <NamePrompt onNameSet={(name) => { setUserName(name); setShowEditName(false); }} />;
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-8 pt-6">
      <PageHeader
        leadingAction={
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm transition-all active:scale-[0.95]"
            aria-label="Back to home"
            title="Home"
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
                d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        }
        title="Activity Log"
        subtitle={
          <p className="text-sm text-gray-400">
            Hi,{" "}
            <button
              type="button"
              onClick={() => setShowEditName(true)}
              className="font-semibold text-baby-500 underline decoration-baby-200 underline-offset-2"
            >
              {userName}
            </button>
          </p>
        }
      />

      <LogsList logs={logs} onDelete={handleDeleteLog} onEdit={fetchLogs} />
    </div>
  );
}
