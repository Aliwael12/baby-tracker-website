import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const logs = await prisma.activityLog.findMany({
    orderBy: { startTime: "desc" },
    take: 200,
  });
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { type, side, startTime, endTime, comments, enteredByName } = body;

  if (!type || !startTime || !enteredByName) {
    return NextResponse.json(
      { error: "type, startTime, and enteredByName are required" },
      { status: 400 }
    );
  }

  const validTypes = ["pump", "feed", "sleep", "diaper", "shower"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid activity type" }, { status: 400 });
  }

  if ((type === "pump" || type === "feed") && !side) {
    return NextResponse.json(
      { error: "side (left/right) is required for pump and feed" },
      { status: 400 }
    );
  }

  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : null;
  const durationMinutes =
    end ? (end.getTime() - start.getTime()) / 60000 : null;

  const log = await prisma.activityLog.create({
    data: {
      type,
      side: side || null,
      startTime: start,
      endTime: end,
      durationMinutes,
      comments: comments || null,
      enteredByName,
    },
  });

  return NextResponse.json(log, { status: 201 });
}
