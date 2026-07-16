// An activity is either a span of time (a sleep, a nursing feed) or a single
// moment (a shower, a vitamin, a diaper change). Instant activities are
// counted, never timed: they store endTime === startTime, carry no duration,
// and render as one time. The entry form, the edit modal, and the API all
// derive their behaviour from this list, so a type is only declared once.
const INSTANT_TYPES: ReadonlySet<string> = new Set([
  "diaper",
  "shower",
  "vitamin",
  "nailcut",
  "growth",
  "health",
  "pump",
]);

interface InstantLogFields {
  side?: string | null;
  amountMl?: number | string | null;
}

// A feed is the one type that goes either way: a bottle feed (an amount in ml,
// no side) is a moment, a nursing feed (a side) is timed.
export function isInstantLog(
  type: string,
  fields: InstantLogFields = {}
): boolean {
  if (INSTANT_TYPES.has(type)) return true;
  if (type !== "feed") return false;
  const { side, amountMl } = fields;
  const hasMl = amountMl !== undefined && amountMl !== null && amountMl !== "";
  return hasMl && !side;
}
