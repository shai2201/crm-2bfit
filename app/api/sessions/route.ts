import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSessionSchema = z.object({
  title:       z.string().min(1, "כותרת נדרשת"),
  description: z.string().optional(),
  coachId:     z.string().min(1, "מאמן נדרש"),
  locationId:  z.string().optional(),
  locationName: z.string().optional(),   // create-on-the-fly if no locationId
  startTime:   z.string().datetime({ offset: true }).or(z.string().min(1)),
  endTime:     z.string().datetime({ offset: true }).or(z.string().min(1)),
  maxCapacity: z.number().int().min(1).max(50).default(15),
  recurringId: z.string().optional(),
  notes:       z.string().optional(),
});

// GET /api/sessions  — list sessions
// Query: ?from=ISO&to=ISO&coachId=&status=
export async function GET(req: NextRequest) {
  try {
    const sp      = new URL(req.url).searchParams;
    const from    = sp.get("from");
    const to      = sp.get("to");
    const coachId = sp.get("coachId");
    const status  = sp.get("status");

    const sessions = await prisma.session.findMany({
      where: {
        ...(coachId && { coachId }),
        ...(status  && { status: status as "SCHEDULED" | "COMPLETED" | "CANCELLED" | "IN_PROGRESS" }),
        ...(from || to
          ? {
              startTime: {
                ...(from && { gte: new Date(from) }),
                ...(to   && { lte: new Date(to)   }),
              },
            }
          : {}),
      },
      orderBy: { startTime: "asc" },
      include: {
        coach: {
          include: {
            user: { include: { profile: true } },
          },
        },
        location: true,
        bookings: {
          where: { status: { in: ["CONFIRMED", "WAITLISTED"] } },
          select: { id: true, userId: true, status: true, waitlistPosition: true, bookedAt: true,
            user: { include: { profile: true } },
          },
        },
        _count: { select: { bookings: true } },
      },
    });

    // Annotate with confirmed/waitlist counts
    const enriched = sessions.map((s) => ({
      ...s,
      confirmedCount: s.bookings.filter((b) => b.status === "CONFIRMED").length,
      waitlistCount:  s.bookings.filter((b) => b.status === "WAITLISTED").length,
    }));

    return NextResponse.json({ data: enriched });
  } catch (err) {
    console.error("[GET /api/sessions]", err);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}

// POST /api/sessions  — create session
export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = CreateSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "נתונים לא תקינים" },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Verify coach exists
    const coach = await prisma.coach.findUnique({ where: { id: data.coachId } });
    if (!coach) {
      return NextResponse.json({ error: "מאמן לא נמצא" }, { status: 404 });
    }

    // Resolve location — create if name given but no ID
    let locationId = data.locationId;
    if (!locationId && data.locationName) {
      const loc = await prisma.location.upsert({
        where:  { id: "noop" },          // will never match — forces create via findFirst
        update: {},
        create: { name: data.locationName },
      });
      // Actually use findFirst + create pattern:
      const existing = await prisma.location.findFirst({
        where: { name: data.locationName },
      });
      locationId = existing
        ? existing.id
        : (await prisma.location.create({ data: { name: data.locationName } })).id;
    }

    const session = await prisma.session.create({
      data: {
        title:       data.title,
        description: data.description,
        coachId:     data.coachId,
        locationId,
        startTime:   new Date(data.startTime),
        endTime:     new Date(data.endTime),
        maxCapacity: data.maxCapacity,
        recurringId: data.recurringId,
        notes:       data.notes,
      },
      include: {
        coach:    { include: { user: { include: { profile: true } } } },
        location: true,
      },
    });

    return NextResponse.json({ data: session }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/sessions]", err);
    return NextResponse.json({ error: "שגיאה ביצירת אימון" }, { status: 500 });
  }
}
