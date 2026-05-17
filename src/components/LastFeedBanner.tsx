"use client";

import { useMemo } from "react";
import { useNow } from "@/lib/useNow";

interface LogEntry {
  type: string;
  startTime: string;
  side?: string | null;
  diaperStatus?: string | null;
}

const DIAPER_STATUS_META: Record<string, { icon: string; label: string }> = {
  empty: { icon: "✅", label: "Empty" },
  wet: { icon: "💧", label: "Wet" },
  dirty: { icon: "💩", label: "Dirty" },
  wet_and_dirty: { icon: "💧💩", label: "Wet & Dirty" },
};

function sideToLetter(side: string | null | undefined): "L" | "R" | null {
  if (side === "left") return "L";
  if (side === "right") return "R";
  return null;
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
  const now = useNow();

  const lastFeed = useMemo(() => {
    const feeds = logs.filter((l) => l.type === "feed");
    if (feeds.length === 0) return null;
    return feeds.reduce((latest, l) =>
      new Date(l.startTime).getTime() > new Date(latest.startTime).getTime() ? l : latest
    );
  }, [logs]);

  const lastDiaper = useMemo(() => {
    const diapers = logs.filter((l) => l.type === "diaper");
    if (diapers.length === 0) return null;
    return diapers.reduce((latest, l) =>
      new Date(l.startTime).getTime() > new Date(latest.startTime).getTime() ? l : latest
    );
  }, [logs]);

  // now === 0 before the client clock mounts; avoid rendering stale elapsed.
  if (now === 0 || (!lastFeed && !lastDiaper)) return null;

  const feedSide = lastFeed ? sideToLetter(lastFeed.side) : null;
  const feedElapsed = lastFeed ? now - new Date(lastFeed.startTime).getTime() : 0;
  const diaperElapsed = lastDiaper ? now - new Date(lastDiaper.startTime).getTime() : 0;
  const diaperStatusMeta =
    lastDiaper && lastDiaper.diaperStatus
      ? DIAPER_STATUS_META[lastDiaper.diaperStatus] ?? null
      : null;

  return (
    <div className="mb-4 space-y-2">
      {lastFeed && (
        <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-baby-50 p-3 text-center shadow-sm">
          <span className="text-sm text-gray-600">
            🤱 Last feed
            {feedSide ? (
              <>
                {" "}
                <span className="font-bold text-baby-600">({feedSide})</span>
              </>
            ) : null}{" "}
            started <span className="font-bold text-baby-600">{formatElapsed(feedElapsed)}</span>
          </span>
        </div>
      )}
      {lastDiaper && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-50/90 to-baby-50 p-3 text-center shadow-sm">
          <span className="text-sm text-gray-600">
            🩲 Last diaper change was:{" "}
            <span className="font-bold text-baby-600">{formatElapsed(diaperElapsed)}</span>
            {diaperStatusMeta && (
              <>
                {" "}
                <span className="font-bold text-baby-600">
                  ({diaperStatusMeta.icon} {diaperStatusMeta.label})
                </span>
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
