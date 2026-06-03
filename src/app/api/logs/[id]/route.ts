import { prisma } from "@/lib/db";
import { isHealthCondition } from "@/lib/health";
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
  const {
    comments,
    diaperStatus,
    amountMl,
    startTime,
    endTime,
    weightKg,
    heightCm,
    healthCondition,
    medication,
    dose,
    feverCelsius,
  } = body as {
    comments?: string | null;
    diaperStatus?: string | null;
    amountMl?: number | string | null;
    startTime?: string | null;
    endTime?: string | null;
    weightKg?: number | string | null;
    heightCm?: number | string | null;
    healthCondition?: string | null;
    medication?: string | null;
    dose?: string | null;
    feverCelsius?: number | string | null;
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

  if (amountMl !== undefined) {
    if (existingForDuration.type !== "pump") {
      return NextResponse.json(
        { error: "amountMl can only be updated on pump logs" },
        { status: 400 }
      );
    }
    const ml =
      amountMl !== null && amountMl !== ""
        ? parseFloat(String(amountMl))
        : NaN;
    if (isNaN(ml) || ml <= 0) {
      return NextResponse.json(
        { error: "amountMl (a positive number) is required for pump" },
        { status: 400 }
      );
    }
    data.amountMl = ml;
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

  if (
    healthCondition !== undefined ||
    medication !== undefined ||
    dose !== undefined ||
    feverCelsius !== undefined
  ) {
    if (existingForDuration.type !== "health") {
      return NextResponse.json(
        { error: "Health fields can only be updated on health logs" },
        { status: 400 }
      );
    }

    const nextCondition =
      healthCondition !== undefined
        ? healthCondition && isHealthCondition(healthCondition)
          ? healthCondition
          : null
        : existingForDuration.healthCondition;

    if (!nextCondition || !isHealthCondition(nextCondition)) {
      return NextResponse.json(
        { error: "A valid health condition is required" },
        { status: 400 }
      );
    }

    if (healthCondition !== undefined) {
      data.healthCondition = nextCondition;
    }

    if (medication !== undefined) {
      data.medication =
        medication && typeof medication === "string" ? medication.trim() || null : null;
    }

    if (dose !== undefined) {
      data.dose = dose && typeof dose === "string" ? dose.trim() || null : null;
    }

    if (nextCondition === "fever") {
      const rawFever =
        feverCelsius !== undefined ? feverCelsius : existingForDuration.feverCelsius;
      const temp =
        rawFever !== undefined && rawFever !== null && rawFever !== ""
          ? parseFloat(String(rawFever))
          : NaN;
      if (isNaN(temp) || temp <= 0) {
        return NextResponse.json(
          { error: "Temperature is required when condition is fever" },
          { status: 400 }
        );
      }
      if (feverCelsius !== undefined || healthCondition !== undefined) {
        data.feverCelsius = temp;
      }
    } else if (healthCondition !== undefined || feverCelsius !== undefined) {
      data.feverCelsius = null;
    }
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
