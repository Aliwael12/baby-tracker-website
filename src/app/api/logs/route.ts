import { prisma } from "@/lib/db";
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
    diaperStatus,
    weightKg,
    heightCm,
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

  const validTypes = ["pump", "feed", "sleep", "diaper", "shower", "growth"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid activity type" }, { status: 400 });
  }

  if ((type === "pump" || type === "feed") && !side) {
    return NextResponse.json(
      { error: "side (left/right) is required for pump and feed" },
      { status: 400 }
    );
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

  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : null;
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
      diaperStatus: type === "diaper" ? (diaperStatus || null) : null,
      weightKg: type === "growth" && weightKg ? parseFloat(weightKg) : null,
      heightCm: type === "growth" && heightCm ? parseFloat(heightCm) : null,
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
