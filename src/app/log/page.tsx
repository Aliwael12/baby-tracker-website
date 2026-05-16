"use client";

import { useState, useEffect, useCallback } from "react";
import NamePrompt from "@/components/NamePrompt";
import LogsList from "@/components/LogsList";
import PageHeader from "@/components/PageHeader";
import { useUserName } from "@/lib/useUserName";

export default function ActivityLogPage() {
  const [userName, setUserName] = useUserName();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [logs, setLogs] = useState<any[]>([]);
  const [showEditName, setShowEditName] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/logs?limit=all");
      if (res.ok) setLogs(await res.json());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // Polling the server is a legitimate external-system sync; the state
    // update happens asynchronously after the fetch resolves, not as a
    // synchronous cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  if (!userName || showEditName) {
    return <NamePrompt onNameSet={(name) => { setUserName(name); setShowEditName(false); }} />;
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-8 pt-6">
      <PageHeader
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
