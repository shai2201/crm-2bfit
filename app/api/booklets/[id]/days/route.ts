import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const DaySchema = z.object({
  name:  z.string().optional(),
  notes: z.string().optional(),
});

const ExerciseSchema = z.object({
  name:     z.string().min(1, "שם תרגיל נדרש"),
  sets:     z.number().int().positive().optional(),
  reps:     z.string().optional(),
  weight:   z.string().optional(),
  duration: z.string().optional(),
  restTime: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal("")),
  notes:    z.string().optional(),
  order:    z.number().int().default(0),
});

// POST /api/booklets/[id]/days  — add a new training day
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body   = await req.json();
    const parsed = DaySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    // Find max dayNumber
    const maxDay = await prisma.workoutDay.aggregate({
      where: { bookletId: id },
      _max:  { dayNumber: true },
    });
    const nextDayNumber = (maxDay._max.dayNumber ?? 0) + 1;

    const day = await prisma.workoutDay.create({
      data: {
        bookletId: id,
        dayNumber: nextDayNumber,
        name:      parsed.data.name ?? `יום ${String.fromCharCode(64 + nextDayNumber)}`,
        notes:     parsed.data.notes,
      },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ data: day }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/booklets/[id]/days]", err);
    return NextResponse.json({ error: "שגיאה ביצירת יום" }, { status: 500 });
  }
}

// DELETE /api/booklets/[id]/days?dayId=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const dayId = new URL(req.url).searchParams.get("dayId");
    if (!dayId) return NextResponse.json({ error: "dayId נדרש" }, { status: 400 });

    await prisma.workoutDay.delete({ where: { id: dayId, bookletId: id } });
    return NextResponse.json({ message: "נמחק" });
  } catch (err) {
    console.error("[DELETE /api/booklets/[id]/days]", err);
    return NextResponse.json({ error: "שגיאה במחיקה" }, { status: 500 });
  }
}
