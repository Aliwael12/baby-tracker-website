"use client";

import { useState, useEffect, useMemo } from "react";

interface LogEntry {
  type: string;
  startTime: string;
}

interface LastFeedBannerProps {
  logs: LogEntry[];
}

function formatElapsed(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return "just now";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m ago`;
  if (h > 0) return `${h}h ago`;
  return `${m}m ago`;
}

export default function LastFeedBanner({ logs }: LastFeedBannerProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const lastFeed = useMemo(() => {
    const feeds = logs.filter((l) => l.type === "feed");
    if (feeds.length === 0) return null;
    return feeds.reduce((latest, l) =>
      new Date(l.startTime).getTime() > new Date(latest.startTime).getTime() ? l : latest
    );
  }, [logs]);

  if (!lastFeed) return null;

  const elapsed = now - new Date(lastFeed.startTime).getTime();

  return (
    <div className="mb-4 rounded-2xl bg-gradient-to-r from-blue-50 to-baby-50 p-3 text-center shadow-sm">
      <span className="text-sm text-gray-600">
        🤱 Last feed was <span className="font-bold text-baby-600">{formatElapsed(elapsed)}</span>
      </span>
    </div>
  );
}
