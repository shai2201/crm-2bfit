import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateBookletSchema = z.object({
  traineeId:   z.string().min(1),
  coachId:     z.string().min(1),
  title:       z.string().min(1, "כותרת נדרשת"),
  description: z.string().optional(),
});

// GET /api/booklets?traineeId=&coachId=
export async function GET(req: NextRequest) {
  try {
    const sp        = new URL(req.url).searchParams;
    const traineeId = sp.get("traineeId");
    const coachId   = sp.get("coachId");

    const booklets = await prisma.workoutBooklet.findMany({
      where: {
        ...(traineeId && { traineeId }),
        ...(coachId   && { coachId }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        trainee: { include: { profile: true } },
        coach:   { include: { user: { include: { profile: true } } } },
        _count:  { select: { days: true } },
      },
    });

    return NextResponse.json({ data: booklets });
  } catch (err) {
    console.error("[GET /api/booklets]", err);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}

// POST /api/booklets
export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = CreateBookletSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "נתונים לא תקינים" },
        { status: 400 },
      );
    }

    // Deactivate any existing active booklet for this trainee (one active at a time)
    await prisma.workoutBooklet.updateMany({
      where: { traineeId: parsed.data.traineeId, isActive: true },
      data:  { isActive: false },
    });

    const booklet = await prisma.workoutBooklet.create({
      data: {
        traineeId:   parsed.data.traineeId,
        coachId:     parsed.data.coachId,
        title:       parsed.data.title,
        description: parsed.data.description,
        isActive:    true,
      },
      include: {
        trainee: { include: { profile: true } },
        coach:   { include: { user: { include: { profile: true } } } },
      },
    });

    return NextResponse.json({ data: booklet }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/booklets]", err);
    return NextResponse.json({ error: "שגיאה ביצירה" }, { status: 500 });
  }
}
