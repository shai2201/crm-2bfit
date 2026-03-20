import { notFound } from "next/navigation";
import { Header } from "@/components/dashboard/Header";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Users, Clock, MapPin, User, CheckCircle, Clock4 } from "lucide-react";
import { cn } from "@/lib/utils";

async function getSession(id: string) {
  return prisma.session.findUnique({
    where: { id },
    include: {
      coach: {
        include: { user: { include: { profile: true } } },
      },
      location: true,
      bookings: {
        where:   { status: { in: ["CONFIRMED", "WAITLISTED"] } },
        orderBy: [
          { status: "asc" },        // CONFIRMED before WAITLISTED
          { waitlistPosition: "asc" },
          { bookedAt: "asc" },
        ],
        include: {
          user: {
            include: {
              profile:    true,
              memberships: {
                where:   { status: "ACTIVE" },
                take:    1,
                include: { plan: true },
              },
            },
          },
        },
      },
    },
  });
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();

  const confirmed  = session.bookings.filter((b) => b.status === "CONFIRMED");
  const waitlisted = session.bookings.filter((b) => b.status === "WAITLISTED");
  const fillPct    = Math.min((confirmed.length / session.maxCapacity) * 100, 100);

  const timeStr = (d: Date) =>
    d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

  const coachName = session.coach.user.profile
    ? `${session.coach.user.profile.firstName} ${session.coach.user.profile.lastName}`
    : "מאמן";

  function userName(booking: NonNullable<typeof session>["bookings"][0]) {
    const p = booking.user.profile;
    return p ? `${p.firstName} ${p.lastName}` : booking.user.email;
  }

  const statusMap: Record<string, string> = {
    SCHEDULED:   "מתוכנן",
    IN_PROGRESS: "מתקיים",
    COMPLETED:   "הסתיים",
    CANCELLED:   "בוטל",
  };

  return (
    <>
      <Header
        title={session.title}
        subtitle={`${formatDate(session.startTime)} · ${timeStr(session.startTime)}–${timeStr(session.endTime)}`}
        action={{ label: "ערוך", href: `/dashboard/sessions/${session.id}/edit` }}
      />

      <div className="p-6 space-y-6">
        {/* Session info card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="p-2 bg-brand-elevated rounded-xl">
              <User className="w-5 h-5 text-brand-accent" />
            </div>
            <div>
              <p className="text-xs text-brand-text-muted">מאמן</p>
              <p className="text-sm font-semibold text-white">{coachName}</p>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <div className="p-2 bg-brand-elevated rounded-xl">
              <MapPin className="w-5 h-5 text-brand-text-muted" />
            </div>
            <div>
              <p className="text-xs text-brand-text-muted">מיקום</p>
              <p className="text-sm font-semibold text-white">{session.location?.name ?? "לא הוגדר"}</p>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <div className="p-2 bg-brand-elevated rounded-xl">
              <Clock className="w-5 h-5 text-brand-text-muted" />
            </div>
            <div>
              <p className="text-xs text-brand-text-muted">סטטוס</p>
              <p className="text-sm font-semibold text-white">{statusMap[session.status] ?? session.status}</p>
            </div>
          </div>
        </div>

        {/* Capacity overview */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-accent" />
              תפוסה
            </h2>
            <span className="text-sm text-brand-text-muted">
              {confirmed.length}/{session.maxCapacity} רשומים
              {waitlisted.length > 0 && (
                <span className="text-brand-warning mr-2">+ {waitlisted.length} המתנה</span>
              )}
            </span>
          </div>

          {/* Bar */}
          <div className="h-3 bg-brand-border rounded-full overflow-hidden mb-4">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                fillPct >= 100 ? "bg-brand-error" : fillPct >= 80 ? "bg-brand-warning" : "bg-brand-accent",
              )}
              style={{ width: `${fillPct}%` }}
            />
          </div>

          {/* Seat grid — visual dots */}
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: session.maxCapacity }, (_, i) => (
              <div
                key={i}
                title={
                  i < confirmed.length
                    ? userName(confirmed[i])
                    : `מקום פנוי ${i + 1}`
                }
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold cursor-default",
                  i < confirmed.length
                    ? "bg-brand-accent text-black"
                    : "bg-brand-elevated border border-brand-border text-brand-text-dim",
                )}
              >
                {i < confirmed.length ? "✓" : i + 1}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Confirmed attendees */}
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 p-4 border-b border-brand-border bg-brand-accent/5">
              <CheckCircle className="w-4 h-4 text-brand-accent" />
              <h2 className="font-semibold text-white text-sm">
                רשומים ({confirmed.length})
              </h2>
            </div>
            <div className="divide-y divide-brand-border max-h-80 overflow-y-auto">
              {confirmed.length === 0 ? (
                <p className="p-4 text-sm text-brand-text-dim text-center">אין רשומים עדיין</p>
              ) : (
                confirmed.map((booking, idx) => {
                  const membership = booking.user.memberships[0];
                  return (
                    <div key={booking.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-brand-accent flex items-center justify-center flex-shrink-0">
                          <span className="text-black text-xs font-bold">{idx + 1}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{userName(booking)}</p>
                          <p className="text-xs text-brand-text-muted">{booking.user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {membership ? (
                          <Badge variant="accent">{membership.plan.name}</Badge>
                        ) : (
                          <Badge variant="error">ללא מנוי</Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Waitlist */}
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 p-4 border-b border-brand-border bg-brand-warning/5">
              <Clock4 className="w-4 h-4 text-brand-warning" />
              <h2 className="font-semibold text-white text-sm">
                רשימת המתנה ({waitlisted.length})
              </h2>
            </div>
            <div className="divide-y divide-brand-border max-h-80 overflow-y-auto">
              {waitlisted.length === 0 ? (
                <p className="p-4 text-sm text-brand-text-dim text-center">אין ממתינים</p>
              ) : (
                waitlisted.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-brand-warning/20 border border-brand-warning/40 flex items-center justify-center flex-shrink-0">
                        <span className="text-brand-warning text-xs font-bold">
                          {booking.waitlistPosition}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{userName(booking)}</p>
                        <p className="text-xs text-brand-text-muted">{booking.user.email}</p>
                      </div>
                    </div>
                    <span className="text-xs text-brand-warning">מקום {booking.waitlistPosition}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
