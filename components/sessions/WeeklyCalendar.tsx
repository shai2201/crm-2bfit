"use client";

import { useState, useCallback } from "react";
import { SessionCard, type SessionCardData, type BookingStatus } from "./SessionCard";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeeklyCalendarProps {
  initialSessions:     SessionCardData[];
  currentUserId:       string;
  hasActiveMembership: boolean;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Get Sunday of the week containing `date` */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // 0 = Sunday (Israel week starts Sunday)
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

const DAY_NAMES_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const MONTH_NAMES_HE = [
  "ינואר","פברואר","מרץ","אפריל","מאי","יוני",
  "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר",
];

// ─── Component ────────────────────────────────────────────────────────────────

export function WeeklyCalendar({
  initialSessions,
  currentUserId,
  hasActiveMembership,
}: WeeklyCalendarProps) {
  const [weekStart, setWeekStart]   = useState(() => getWeekStart(new Date()));
  const [sessions,  setSessions]    = useState<SessionCardData[]>(initialSessions);
  const [loading,   setLoading]     = useState(false);

  // Enrich sessions with NO_MEMBERSHIP if applicable
  const enrichedSessions: SessionCardData[] = sessions.map((s) => ({
    ...s,
    userBookingStatus:
      s.userBookingStatus !== "NONE"
        ? s.userBookingStatus
        : !hasActiveMembership
        ? "NO_MEMBERSHIP"
        : "NONE",
  }));

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd  = addDays(weekStart, 6);

  // Title: e.g. "8–14 ביוני 2025"
  const weekTitle = weekStart.getMonth() === weekEnd.getMonth()
    ? `${weekStart.getDate()}–${weekEnd.getDate()} ב${MONTH_NAMES_HE[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    : `${weekStart.getDate()} ${MONTH_NAMES_HE[weekStart.getMonth()]} – ${weekEnd.getDate()} ${MONTH_NAMES_HE[weekEnd.getMonth()]}`;

  // Fetch sessions for a given week
  const fetchWeek = useCallback(async (start: Date) => {
    setLoading(true);
    try {
      const from = start.toISOString();
      const to   = addDays(start, 7).toISOString();
      const res  = await fetch(
        `/api/sessions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&status=SCHEDULED`,
      );
      if (!res.ok) return;
      const { data } = await res.json();

      // Merge user booking status from the returned bookings
      const enriched: SessionCardData[] = (data as {
        id: string;
        title: string;
        startTime: string;
        endTime: string;
        maxCapacity: number;
        confirmedCount: number;
        waitlistCount: number;
        status: string;
        coach: { user: { profile: { firstName: string; lastName: string } | null } };
        location: { name: string } | null;
        bookings: { userId: string; status: string; waitlistPosition: number | null }[];
      }[]).map((s) => {
        const myBooking = s.bookings.find((b) => b.userId === currentUserId);
        const bookingStatus: BookingStatus =
          myBooking?.status === "CONFIRMED"  ? "CONFIRMED"  :
          myBooking?.status === "WAITLISTED" ? "WAITLISTED" : "NONE";

        return {
          ...s,
          userBookingStatus:   bookingStatus,
          userWaitlistPosition: myBooking?.waitlistPosition ?? undefined,
        };
      });

      setSessions(enriched);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  function goToPrevWeek() {
    const newStart = addDays(weekStart, -7);
    setWeekStart(newStart);
    fetchWeek(newStart);
  }

  function goToNextWeek() {
    const newStart = addDays(weekStart, 7);
    setWeekStart(newStart);
    fetchWeek(newStart);
  }

  function goToThisWeek() {
    const newStart = getWeekStart(new Date());
    setWeekStart(newStart);
    fetchWeek(newStart);
  }

  // Sessions per day
  function sessionsForDay(day: Date): SessionCardData[] {
    return enrichedSessions
      .filter((s) => isSameDay(new Date(s.startTime), day))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  const totalThisWeek = enrichedSessions.length;
  const myBookings = enrichedSessions.filter(
    (s) => s.userBookingStatus === "CONFIRMED" || s.userBookingStatus === "WAITLISTED",
  ).length;

  return (
    <div className="space-y-4">
      {/* ── Calendar header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPrevWeek}
            className="p-2 rounded-xl text-brand-text-muted hover:text-white hover:bg-brand-elevated border border-brand-border transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="text-center">
            <p className="font-semibold text-white text-sm">{weekTitle}</p>
          </div>

          <button
            onClick={goToNextWeek}
            className="p-2 rounded-xl text-brand-text-muted hover:text-white hover:bg-brand-elevated border border-brand-border transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-4 text-xs text-brand-text-muted">
            <span>{totalThisWeek} אימונים השבוע</span>
            {myBookings > 0 && (
              <span className="text-brand-accent font-semibold">{myBookings} הרשמות שלי</span>
            )}
          </div>
          <button
            onClick={goToThisWeek}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-elevated border border-brand-border text-brand-text-muted hover:text-white transition-colors"
          >
            היום
          </button>
        </div>
      </div>

      {/* ── No active membership warning ──────────────────────────── */}
      {!hasActiveMembership && (
        <div className="bg-brand-warning/5 border border-brand-warning/20 rounded-xl px-4 py-3 text-sm text-brand-warning">
          ⚠️ אין לך מנוי פעיל. חדש מנוי כדי להירשם לאימונים.
        </div>
      )}

      {/* ── Loading overlay ───────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-4 gap-2 text-sm text-brand-text-muted">
          <div className="w-4 h-4 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
          טוען...
        </div>
      )}

      {/* ── Weekly grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const daySessions = sessionsForDay(day);
          const dayIsPast   = day < new Date() && !isToday(day);

          return (
            <div key={day.toISOString()} className="flex flex-col gap-2">
              {/* Day header */}
              <div
                className={cn(
                  "text-center py-2 px-1 rounded-xl border",
                  isToday(day)
                    ? "bg-brand-accent/10 border-brand-accent/30"
                    : dayIsPast
                    ? "bg-brand-elevated/50 border-brand-border opacity-60"
                    : "bg-brand-elevated border-brand-border",
                )}
              >
                <p className={cn(
                  "text-xs font-semibold",
                  isToday(day) ? "text-brand-accent" : "text-brand-text-muted",
                )}>
                  {DAY_NAMES_HE[day.getDay()]}
                </p>
                <p className={cn(
                  "text-xl font-bold leading-none mt-0.5",
                  isToday(day) ? "text-brand-accent" : "text-white",
                )}>
                  {day.getDate()}
                </p>
                {daySessions.length > 0 && (
                  <div className="flex justify-center gap-0.5 mt-1">
                    {daySessions.map((_, i) => (
                      <div
                        key={i}
                        className="w-1 h-1 rounded-full bg-brand-accent opacity-70"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Sessions */}
              {daySessions.length === 0 ? (
                <div className="flex items-center justify-center h-16 rounded-xl border border-dashed border-brand-border/40">
                  <p className="text-xs text-brand-text-dim">—</p>
                </div>
              ) : (
                daySessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    currentUserId={currentUserId}
                    onBook={async () => {}}    // handled internally by SessionCard
                    onCancel={async () => {}}  // handled internally by SessionCard
                  />
                ))
              )}
            </div>
          );
        })}
      </div>

      {/* ── Legend ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 pt-2 border-t border-brand-border">
        {[
          { color: "bg-brand-accent",  label: "נרשמת ✓" },
          { color: "bg-brand-warning", label: "רשימת המתנה" },
          { color: "bg-brand-error",   label: "מלא" },
          { color: "bg-brand-surface border border-brand-border", label: "פנוי" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={cn("w-2.5 h-2.5 rounded-full", item.color)} />
            <span className="text-xs text-brand-text-muted">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
