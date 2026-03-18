import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const FULL_BOOKLET_INCLUDE = {
  trainee: { include: { profile: true } },
  coach:   { include: { user: { include: { profile: true } } } },
  days: {
    orderBy: { dayNumber: "asc" as const },
    include: {
      exercises: {
        orderBy: { order: "asc" as const },
        include: {
          logs: {
            orderBy: { loggedAt: "desc" as const },
            take: 3,
            select: { id: true, weightKg: true, reps: true, sets: true, rpe: true, loggedAt: true, notes: true },
          },
        },
      },
    },
  },
} as const;

// GET /api/booklets/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const booklet = await prisma.workoutBooklet.findUnique({
      where:   { id: params.id },
      include: FULL_BOOKLET_INCLUDE,
    });
    if (!booklet) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    return NextResponse.json({ data: booklet });
  } catch (err) {
    console.error("[GET /api/booklets/[id]]", err);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}

// PUT /api/booklets/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await req.json();
    const schema = z.object({
      title:       z.string().min(1).optional(),
      description: z.string().optional(),
      isActive:    z.boolean().optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }
    const booklet = await prisma.workoutBooklet.update({
      where:   { id: params.id },
      data:    parsed.data,
      include: FULL_BOOKLET_INCLUDE,
    });
    return NextResponse.json({ data: booklet });
  } catch (err) {
    console.error("[PUT /api/booklets/[id]]", err);
    return NextResponse.json({ error: "שגיאה בעדכון" }, { status: 500 });
  }
}

// DELETE /api/booklets/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await prisma.workoutBooklet.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "נמחק" });
  } catch (err) {
    console.error("[DELETE /api/booklets/[id]]", err);
    return NextResponse.json({ error: "שגיאה במחיקה" }, { status: 500 });
  }
}
