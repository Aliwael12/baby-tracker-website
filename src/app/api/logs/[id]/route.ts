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
  const { comments, diaperStatus } = body as {
    comments?: string | null;
    diaperStatus?: string | null;
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
