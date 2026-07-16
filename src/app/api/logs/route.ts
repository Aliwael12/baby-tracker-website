import { prisma } from "@/lib/db";
import { isInstantLog } from "@/lib/activities";
import { isHealthCondition } from "@/lib/health";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const limit = req.nextUrl.searchParams.get("limit");
  const logs = await prisma.activityLog.findMany({
    orderBy: { startTime: "desc" },
    ...(limit !== "all" && { take: parseInt(limit || "200", 10) }),
  });
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    type,
    side,
    amountMl,
    diaperStatus,
    weightKg,
    heightCm,
    healthCondition,
    medication,
    dose,
    feverCelsius,
    startTime,
    endTime,
    comments,
    enteredByName,
    pauseTimeline,
  } = body;

  if (!type || !startTime || !enteredByName) {
    return NextResponse.json(
      { error: "type, startTime, and enteredByName are required" },
      { status: 400 }
    );
  }

  const validTypes = [
    "pump",
    "feed",
    "sleep",
    "diaper",
    "shower",
    "vitamin",
    "nailcut",
    "growth",
    "health",
  ];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid activity type" }, { status: 400 });
  }

  // A feed is either a nursing session (has a side) or a bottle feed measured
  // in ml. One of the two must be present.
  const hasMl =
    amountMl !== undefined && amountMl !== null && amountMl !== "";
  if (type === "feed" && !side && !hasMl) {
    return NextResponse.json(
      { error: "feed requires either a side (left/right) or amountMl" },
      { status: 400 }
    );
  }

  if ((type === "pump" || (type === "feed" && hasMl))) {
    const ml = hasMl ? parseFloat(String(amountMl)) : NaN;
    if (isNaN(ml) || ml <= 0) {
      return NextResponse.json(
        { error: "amountMl must be a positive number" },
        { status: 400 }
      );
    }
  }

  const validDiaperStatuses = ["empty", "wet", "dirty", "wet_and_dirty"];
  if (type === "diaper" && diaperStatus && !validDiaperStatuses.includes(diaperStatus)) {
    return NextResponse.json({ error: "Invalid diaper status" }, { status: 400 });
  }

  if (type === "growth" && !weightKg && !heightCm) {
    return NextResponse.json(
      { error: "At least weight or height is required for growth" },
      { status: 400 }
    );
  }

  if (type === "health") {
    if (!healthCondition || !isHealthCondition(healthCondition)) {
      return NextResponse.json(
        { error: "A valid health condition is required" },
        { status: 400 }
      );
    }
    if (healthCondition === "fever") {
      const temp =
        feverCelsius !== undefined && feverCelsius !== null && feverCelsius !== ""
          ? parseFloat(String(feverCelsius))
          : NaN;
      if (isNaN(temp) || temp <= 0) {
        return NextResponse.json(
          { error: "Temperature is required when condition is fever" },
          { status: 400 }
        );
      }
    }
  }

  const start = new Date(startTime);
  let end = endTime ? new Date(endTime) : null;

  if (isNaN(start.getTime())) {
    return NextResponse.json({ error: "Invalid startTime" }, { status: 400 });
  }
  if (end && isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid endTime" }, { status: 400 });
  }
  // An instant activity is a moment, not a span. Pin its end to its start so no
  // client can record a shower as something that took time.
  if (isInstantLog(type, { side, amountMl })) {
    end = start;
  }
  // A backwards range yields a negative duration, which corrupts day totals.
  if (end && end.getTime() < start.getTime()) {
    return NextResponse.json(
      { error: "endTime cannot be before startTime" },
      { status: 400 }
    );
  }

  const durationMinutes =
    end ? (end.getTime() - start.getTime()) / 60000 : null;

  let pauseTimelineJson: string | null = null;
  if (Array.isArray(pauseTimeline) && pauseTimeline.length > 0) {
    try {
      pauseTimelineJson = JSON.stringify(pauseTimeline);
    } catch {
      pauseTimelineJson = null;
    }
  }

  const log = await prisma.activityLog.create({
    data: {
      type,
      side: side || null,
      amountMl:
        (type === "pump" || type === "feed") && hasMl
          ? parseFloat(String(amountMl))
          : null,
      diaperStatus: type === "diaper" ? (diaperStatus || null) : null,
      weightKg: type === "growth" && weightKg ? parseFloat(weightKg) : null,
      heightCm: type === "growth" && heightCm ? parseFloat(heightCm) : null,
      healthCondition:
        type === "health" && healthCondition && isHealthCondition(healthCondition)
          ? healthCondition
          : null,
      medication:
        type === "health" && medication && typeof medication === "string"
          ? medication.trim() || null
          : null,
      dose:
        type === "health" && dose && typeof dose === "string"
          ? dose.trim() || null
          : null,
      feverCelsius:
        type === "health" &&
        healthCondition === "fever" &&
        feverCelsius !== undefined &&
        feverCelsius !== null &&
        feverCelsius !== ""
          ? parseFloat(String(feverCelsius))
          : null,
      startTime: start,
      endTime: end,
      durationMinutes,
      comments: comments || null,
      enteredByName,
      pauseTimelineJson,
    },
  });

  return NextResponse.json(log, { status: 201 });
}
