import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id, 10);

  if (isNaN(numId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await prisma.activityLog.delete({ where: { id: numId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id, 10);

  if (isNaN(numId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json();
  const { comments, diaperStatus, startTime, endTime, weightKg, heightCm } = body as {
    comments?: string | null;
    diaperStatus?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    weightKg?: number | string | null;
    heightCm?: number | string | null;
  };

  const validDiaperStatuses = ["empty", "wet", "dirty", "wet_and_dirty"];

  const data: Record<string, unknown> = {};

  if (comments !== undefined) {
    data.comments = comments && typeof comments === "string" ? comments.trim() || null : null;
  }

  if (diaperStatus !== undefined) {
    if (diaperStatus === null) {
      data.diaperStatus = null;
    } else if (validDiaperStatuses.includes(diaperStatus)) {
      data.diaperStatus = diaperStatus;
    } else {
      return NextResponse.json({ error: "Invalid diaper status" }, { status: 400 });
    }
  }

  if (startTime !== undefined && startTime) {
    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      return NextResponse.json({ error: "Invalid startTime" }, { status: 400 });
    }
    data.startTime = start;
  }

  if (endTime !== undefined) {
    if (endTime === null) {
      data.endTime = null;
      data.durationMinutes = null;
    } else {
      const end = new Date(endTime);
      if (isNaN(end.getTime())) {
        return NextResponse.json({ error: "Invalid endTime" }, { status: 400 });
      }
      data.endTime = end;
    }
  }

  const existingForDuration = await prisma.activityLog.findUnique({ where: { id: numId } });
  if (!existingForDuration) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (weightKg !== undefined || heightCm !== undefined) {
    if (existingForDuration.type !== "growth") {
      return NextResponse.json(
        { error: "Weight and height can only be updated on growth logs" },
        { status: 400 }
      );
    }
    const parseGrowthNum = (v: number | string | null | undefined, existing: number | null) => {
      if (v === undefined) return existing;
      if (v === null || v === "") return null;
      const n = typeof v === "number" ? v : parseFloat(v);
      return isNaN(n) ? null : n;
    };
    const nextW = parseGrowthNum(weightKg, existingForDuration.weightKg);
    const nextH = parseGrowthNum(heightCm, existingForDuration.heightCm);
    if (nextW == null && nextH == null) {
      return NextResponse.json(
        { error: "At least one of weight or height is required for growth" },
        { status: 400 }
      );
    }
    data.weightKg = nextW;
    data.heightCm = nextH;
  }

  if (data.startTime || data.endTime !== undefined) {
    const existing = existingForDuration;
    const finalStart = (data.startTime as Date) ?? existing.startTime;
    const finalEnd = data.endTime === null ? null : (data.endTime as Date | undefined) ?? existing.endTime;
    if (finalStart && finalEnd) {
      data.durationMinutes = (finalEnd.getTime() - finalStart.getTime()) / 60000;
    }
  }

  try {
    const updated = await prisma.activityLog.update({
      where: { id: numId },
      data,
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
