"use client";

export type PauseTimelineEvent = { event: string; at: string };

const LABELS: Record<string, string> = {
  started: "Started",
  paused: "Paused",
  resumed: "Resumed",
  stopped: "Stopped",
};

function formatTimeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function parsePauseTimelineJson(
  json: string | null | undefined
): PauseTimelineEvent[] | null {
  if (!json) return null;
  try {
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return null;
    return arr.filter(
      (e): e is PauseTimelineEvent =>
        !!e &&
        typeof e === "object" &&
        typeof (e as PauseTimelineEvent).at === "string" &&
        typeof (e as PauseTimelineEvent).event === "string"
    );
  } catch {
    return null;
  }
}

/** Show timeline when there was at least one pause or resume */
export function shouldShowPauseTimeline(events: PauseTimelineEvent[] | null): boolean {
  return !!events?.some((e) => e.event === "paused" || e.event === "resumed");
}

export default function PauseTimelineIndicator({
  pauseTimelineJson,
}: {
  pauseTimelineJson: string | null | undefined;
}) {
  const events = parsePauseTimelineJson(pauseTimelineJson);
  if (!events?.length || !shouldShowPauseTimeline(events)) return null;

  return (
    <div className="mt-1 rounded-xl border border-slate-100 bg-slate-50/90 px-2 py-1.5 text-[10px] leading-relaxed text-slate-600">
      {events.map((e, i) => (
        <span key={`${e.event}-${e.at}-${i}`}>
          {i > 0 ? <span className="text-slate-300"> · </span> : null}
          <span className="font-semibold text-slate-700">
            {LABELS[e.event] ?? e.event}
          </span>{" "}
          {formatTimeLabel(e.at)}
        </span>
      ))}
    </div>
  );
}
