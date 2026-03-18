import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ExerciseSchema = z.object({
  name:     z.string().min(1, "שם תרגיל נדרש"),
  sets:     z.number().int().positive().nullable().optional(),
  reps:     z.string().nullable().optional(),
  weight:   z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  restTime: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  notes:    z.string().nullable().optional(),
  order:    z.number().int().default(0),
});

// POST /api/booklets/[id]/days/[dayId]/exercises
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; dayId: string }> },
) {
  const { dayId } = await params;
  try {
    const body   = await req.json();
    const parsed = ExerciseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    // Auto-order: place after the last exercise in this day
    const maxOrder = await prisma.exercise.aggregate({
      where: { workoutDayId: dayId },
      _max:  { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const exercise = await prisma.exercise.create({
      data: {
        workoutDayId: dayId,
        name:     parsed.data.name,
        sets:     parsed.data.sets ?? null,
        reps:     parsed.data.reps ?? null,
        weight:   parsed.data.weight ?? null,
        duration: parsed.data.duration ?? null,
        restTime: parsed.data.restTime ?? null,
        videoUrl: parsed.data.videoUrl ?? null,
        notes:    parsed.data.notes ?? null,
        order:    parsed.data.order ?? nextOrder,
      },
    });

    return NextResponse.json({ data: exercise }, { status: 201 });
  } catch (err) {
    console.error("[POST exercises]", err);
    return NextResponse.json({ error: "שגיאה ביצירת תרגיל" }, { status: 500 });
  }
}

// PUT /api/booklets/[id]/days/[dayId]/exercises?exerciseId=xxx
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; dayId: string }> },
) {
  const { dayId } = await params;
  try {
    const exerciseId = new URL(req.url).searchParams.get("exerciseId");
    if (!exerciseId) return NextResponse.json({ error: "exerciseId נדרש" }, { status: 400 });

    const body = await req.json();
    const UpdateSchema = ExerciseSchema.partial();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const exercise = await prisma.exercise.update({
      where: { id: exerciseId, workoutDayId: dayId },
      data:  parsed.data,
    });

    return NextResponse.json({ data: exercise });
  } catch (err) {
    console.error("[PUT exercises]", err);
    return NextResponse.json({ error: "שגיאה בעדכון" }, { status: 500 });
  }
}

// DELETE /api/booklets/[id]/days/[dayId]/exercises?exerciseId=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; dayId: string }> },
) {
  const { dayId } = await params;
  try {
    const exerciseId = new URL(req.url).searchParams.get("exerciseId");
    if (!exerciseId) return NextResponse.json({ error: "exerciseId נדרש" }, { status: 400 });

    await prisma.exercise.delete({
      where: { id: exerciseId, workoutDayId: dayId },
    });
    return NextResponse.json({ message: "נמחק" });
  } catch (err) {
    console.error("[DELETE exercises]", err);
    return NextResponse.json({ error: "שגיאה במחיקה" }, { status: 500 });
  }
}
