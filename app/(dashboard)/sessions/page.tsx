import { Header } from "@/components/dashboard/Header";
import { AdminSessionList, type SessionListItem } from "@/components/sessions/AdminSessionList";
import { prisma } from "@/lib/prisma";

async function getSessions(): Promise<SessionListItem[]> {
  const sessions = await prisma.session.findMany({
    orderBy: { startTime: "asc" },
    include: {
      coach: {
        include: { user: { include: { profile: true } } },
      },
      location: true,
      bookings: {
        where: { status: { in: ["CONFIRMED", "WAITLISTED"] } },
        select: { status: true },
      },
    },
  });

  return sessions.map((s) => ({
    id:             s.id,
    title:          s.title,
    description:    s.description,
    startTime:      s.startTime.toISOString(),
    endTime:        s.endTime.toISOString(),
    maxCapacity:    s.maxCapacity,
    status:         s.status,
    notes:          s.notes,
    confirmedCount: s.bookings.filter((b) => b.status === "CONFIRMED").length,
    waitlistCount:  s.bookings.filter((b) => b.status === "WAITLISTED").length,
    coach: {
      id:   s.coach.id,
      user: {
        profile: s.coach.user.profile
          ? { firstName: s.coach.user.profile.firstName, lastName: s.coach.user.profile.lastName }
          : null,
      },
    },
    location: s.location ? { id: s.location.id, name: s.location.name } : null,
  }));
}

export default async function SessionsPage() {
  const sessions = await getSessions();
  const upcoming = sessions.filter((s) => new Date(s.startTime) >= new Date()).length;

  return (
    <>
      <Header
        title="לוח אימונים"
        subtitle={`${upcoming} אימונים קרובים`}
        action={{ label: "אימון חדש", href: "/dashboard/sessions/new" }}
      />
      <div className="p-6">
        <AdminSessionList sessions={sessions} />
      </div>
    </>
  );
}
