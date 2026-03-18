import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { bookSession, cancelBooking } from "@/lib/booking";

const BookSchema = z.object({
  userId: z.string().min(1, "userId נדרש"),
});

// POST /api/sessions/[id]/book  — register a user for a session
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body   = await req.json();
    const parsed = BookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 },
      );
    }

    const result = await bookSession(params.id, parsed.data.userId);

    switch (result.status) {
      case "CONFIRMED":
        return NextResponse.json(
          { data: result.booking, message: "נרשמת בהצלחה! מקומך שמור." },
          { status: 201 },
        );

      case "WAITLISTED":
        return NextResponse.json(
          {
            data:    result.booking,
            message: `האימון מלא. נוספת לרשימת ההמתנה במקום ${result.position}.`,
          },
          { status: 201 },
        );

      case "ALREADY_BOOKED":
        return NextResponse.json(
          { error: "כבר רשום לאימון זה" },
          { status: 409 },
        );

      case "NO_ACTIVE_MEMBERSHIP":
        return NextResponse.json(
          { error: "נדרש מנוי פעיל על מנת להירשם לאימונים" },
          { status: 403 },
        );

      case "SESSION_NOT_FOUND":
        return NextResponse.json({ error: "אימון לא נמצא" }, { status: 404 });

      case "SESSION_NOT_BOOKABLE":
        return NextResponse.json(
          { error: `לא ניתן להירשם: ${result.reason}` },
          { status: 400 },
        );

      default:
        return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
    }
  } catch (err) {
    console.error("[POST /api/sessions/[id]/book]", err);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}

// DELETE /api/sessions/[id]/book?userId=xxx  — cancel a booking
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = new URL(req.url).searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId נדרש" }, { status: 400 });
    }

    // Find the booking ID for this user+session
    const booking = await prisma.booking.findUnique({
      where: { sessionId_userId: { sessionId: params.id, userId } },
    });

    if (!booking) {
      return NextResponse.json({ error: "הרשמה לא נמצאה" }, { status: 404 });
    }

    const result = await cancelBooking(booking.id);

    switch (result.status) {
      case "CANCELLED":
        return NextResponse.json({
          message: result.promoted
            ? "ביטלת את הרשמתך. המשתמש הבא ברשימת ההמתנה קודם אוטומטית."
            : "ביטלת את הרשמתך מרשימת ההמתנה.",
        });

      case "ALREADY_CANCELLED":
        return NextResponse.json({ error: "הרשמה כבר בוטלה" }, { status: 409 });

      case "BOOKING_NOT_FOUND":
        return NextResponse.json({ error: "הרשמה לא נמצאה" }, { status: 404 });
    }
  } catch (err) {
    console.error("[DELETE /api/sessions/[id]/book]", err);
    return NextResponse.json({ error: "שגיאה בביטול" }, { status: 500 });
  }
}
