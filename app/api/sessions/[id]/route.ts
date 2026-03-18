import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSessionSchema = z.object({
  title:       z.string().min(1).optional(),
  description: z.string().optional(),
  coachId:     z.string().optional(),
  locationId:  z.string().nullable().optional(),
  startTime:   z.string().optional(),
  endTime:     z.string().optional(),
  maxCapacity: z.number().int().min(1).max(50).optional(),
  status:      z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  notes:       z.string().optional(),
});

const SESSION_INCLUDE = {
  coach:    { include: { user: { include: { profile: true } } } },
  location: true,
  bookings: {
    where:   { status: { in: ["CONFIRMED", "WAITLISTED"] as const } },
    orderBy: [{ status: "asc" as const }, { waitlistPosition: "asc" as const }, { bookedAt: "asc" as const }],
    include: {
      user: { include: { profile: true } },
    },
  },
} as const;

// GET /api/sessions/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const session = await prisma.session.findUnique({
      where:   { id },
      include: SESSION_INCLUDE,
    });

    if (!session) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

    return NextResponse.json({
      data: {
        ...session,
        confirmedCount: session.bookings.filter((b) => b.status === "CONFIRMED").length,
        waitlistCount:  session.bookings.filter((b) => b.status === "WAITLISTED").length,
      },
    });
  } catch (err) {
    console.error("[GET /api/sessions/[id]]", err);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}

// PUT /api/sessions/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body   = await req.json();
    const parsed = UpdateSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "נתונים לא תקינים" },
        { status: 400 },
      );
    }

    const { startTime, endTime, ...rest } = parsed.data;

    const session = await prisma.session.update({
      where: { id },
      data:  {
        ...rest,
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime   && { endTime:   new Date(endTime)   }),
      },
      include: SESSION_INCLUDE,
    });

    return NextResponse.json({ data: session });
  } catch (err) {
    console.error("[PUT /api/sessions/[id]]", err);
    return NextResponse.json({ error: "שגיאה בעדכון" }, { status: 500 });
  }
}

// DELETE /api/sessions/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    // Cancel all active bookings first
    await prisma.booking.updateMany({
      where: { sessionId: id, status: { in: ["CONFIRMED", "WAITLISTED"] } },
      data:  { status: "CANCELLED", cancelledAt: new Date() },
    });
    await prisma.session.delete({ where: { id } });
    return NextResponse.json({ message: "נמחק" });
  } catch (err) {
    console.error("[DELETE /api/sessions/[id]]", err);
    return NextResponse.json({ error: "שגיאה במחיקה" }, { status: 500 });
  }
}
