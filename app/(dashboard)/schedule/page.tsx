import { Header } from "@/components/dashboard/Header";
import { WeeklyCalendar } from "@/components/sessions/WeeklyCalendar";
import { prisma } from "@/lib/prisma";
import type { SessionCardData, BookingStatus } from "@/components/sessions/SessionCard";

/**
 * TODO: Replace DEMO_USER_ID with the real session user ID from NextAuth:
 *   import { getServerSession } from "next-auth";
 *   const session = await getServerSession(authOptions);
 *   const currentUserId = session?.user?.id;
 */
const DEMO_USER_ID = process.env.DEMO_USER_ID ?? "";

async function getWeekSessions(currentUserId: string): Promise<SessionCardData[]> {
  const now       = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const sessions = await prisma.session.findMany({
    where: {
      startTime: { gte: weekStart, lte: weekEnd },
      status:    "SCHEDULED",
    },
    orderBy: { startTime: "asc" },
    include: {
      coach:    { include: { user: { include: { profile: true } } } },
      location: true,
      bookings: {
        where:  { status: { in: ["CONFIRMED", "WAITLISTED"] } },
        select: { userId: true, status: true, waitlistPosition: true },
      },
    },
  });

  return sessions.map((s) => {
    const confirmedCount = s.bookings.filter((b) => b.status === "CONFIRMED").length;
    const waitlistCount  = s.bookings.filter((b) => b.status === "WAITLISTED").length;
    const myBooking      = currentUserId
      ? s.bookings.find((b) => b.userId === currentUserId)
      : null;

    const userBookingStatus: BookingStatus =
      myBooking?.status === "CONFIRMED"  ? "CONFIRMED"  :
      myBooking?.status === "WAITLISTED" ? "WAITLISTED" : "NONE";

    return {
      id:             s.id,
      title:          s.title,
      startTime:      s.startTime.toISOString(),
      endTime:        s.endTime.toISOString(),
      maxCapacity:    s.maxCapacity,
      status:         s.status,
      confirmedCount,
      waitlistCount,
      coach: {
        user: {
          profile: s.coach.user.profile
            ? { firstName: s.coach.user.profile.firstName, lastName: s.coach.user.profile.lastName }
            : null,
        },
      },
      location: s.location ? { name: s.location.name } : null,
      userBookingStatus,
      userWaitlistPosition: myBooking?.waitlistPosition ?? undefined,
    };
  });
}

async function checkActiveMembership(userId: string): Promise<boolean> {
  if (!userId) return false;
  const m = await prisma.membership.findFirst({
    where: { userId, status: "ACTIVE", endDate: { gte: new Date() } },
  });
  return m !== null;
}

export default async function SchedulePage() {
  const currentUserId      = DEMO_USER_ID;
  const [sessions, hasMembership] = await Promise.all([
    getWeekSessions(currentUserId),
    checkActiveMembership(currentUserId),
  ]);

  return (
    <>
      <Header
        title="לוח שעות"
        subtitle="האימונים השבועיים שלך"
      />
      <div className="p-6">
        {/* Membership status bar */}
        <div className={`mb-5 px-4 py-3 rounded-xl border text-sm flex items-center gap-2 ${
          hasMembership
            ? "bg-brand-accent/5 border-brand-accent/20 text-brand-accent"
            : "bg-brand-warning/5 border-brand-warning/20 text-brand-warning"
        }`}>
          {hasMembership ? (
            <>✅ מנוי פעיל — ניתן להירשם לאימונים</>
          ) : (
            <>
              ⚠️ אין מנוי פעיל.{" "}
              <a href="/dashboard/products" className="underline hover:no-underline">
                רכוש מנוי
              </a>{" "}
              על מנת להירשם לאימונים.
            </>
          )}
        </div>

        <WeeklyCalendar
          initialSessions={sessions}
          currentUserId={currentUserId}
          hasActiveMembership={hasMembership}
        />
      </div>
    </>
  );
}
