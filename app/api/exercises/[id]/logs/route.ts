import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const LogSchema = z.object({
  userId:   z.string().min(1, "userId נדרש"),
  weightKg: z.number().positive().nullable().optional(),
  reps:     z.number().int().positive().nullable().optional(),
  sets:     z.number().int().positive().nullable().optional(),
  rpe:      z.number().min(1).max(10).nullable().optional(),
  duration: z.string().nullable().optional(),
  notes:    z.string().nullable().optional(),
  loggedAt: z.string().optional(),   // ISO string; defaults to now()
});

// GET /api/exercises/[id]/logs?userId=xxx&limit=50
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const sp     = new URL(req.url).searchParams;
    const userId = sp.get("userId");
    const limit  = parseInt(sp.get("limit") ?? "50");

    const logs = await prisma.exerciseLog.findMany({
      where: {
        exerciseId: params.id,
        ...(userId && { userId }),
      },
      orderBy: { loggedAt: "desc" },
      take:    Math.min(limit, 200),
      include: {
        user: { include: { profile: true } },
      },
    });

    return NextResponse.json({ data: logs });
  } catch (err) {
    console.error("[GET /api/exercises/[id]/logs]", err);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}

// POST /api/exercises/[id]/logs
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body   = await req.json();
    const parsed = LogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "נתונים לא תקינים" },
        { status: 400 },
      );
    }

    // Verify exercise exists
    const exercise = await prisma.exercise.findUnique({ where: { id: params.id } });
    if (!exercise) return NextResponse.json({ error: "תרגיל לא נמצא" }, { status: 404 });

    const { userId, loggedAt, ...performance } = parsed.data;

    const log = await prisma.exerciseLog.create({
      data: {
        exerciseId: params.id,
        userId,
        ...performance,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
      },
    });

    return NextResponse.json({ data: log, message: "ביצוע נשמר!" }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/exercises/[id]/logs]", err);
    return NextResponse.json({ error: "שגיאה בשמירה" }, { status: 500 });
  }
}

// DELETE /api/exercises/[id]/logs?logId=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const logId = new URL(req.url).searchParams.get("logId");
    if (!logId) return NextResponse.json({ error: "logId נדרש" }, { status: 400 });

    await prisma.exerciseLog.delete({
      where: { id: logId, exerciseId: params.id },
    });
    return NextResponse.json({ message: "נמחק" });
  } catch (err) {
    console.error("[DELETE /api/exercises/[id]/logs]", err);
    return NextResponse.json({ error: "שגיאה במחיקה" }, { status: 500 });
  }
}
