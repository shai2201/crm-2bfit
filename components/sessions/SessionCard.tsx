"use client";

import { useState } from "react";
import { Clock, MapPin, User, Users, CheckCircle, Clock4, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type BookingStatus = "NONE" | "CONFIRMED" | "WAITLISTED" | "NO_MEMBERSHIP";

export interface SessionCardData {
  id:             string;
  title:          string;
  startTime:      string;
  endTime:        string;
  maxCapacity:    number;
  confirmedCount: number;
  waitlistCount:  number;
  status:         string;
  coach: {
    user: { profile: { firstName: string; lastName: string } | null };
  };
  location: { name: string } | null;
  // Current user's booking state:
  userBookingStatus:   BookingStatus;
  userWaitlistPosition?: number;
}

interface SessionCardProps {
  session:       SessionCardData;
  currentUserId: string;
  onBook:        (sessionId: string) => Promise<void>;
  onCancel:      (sessionId: string) => Promise<void>;
}

export function SessionCard({ session, currentUserId, onBook, onCancel }: SessionCardProps) {
  const [loading, setLoading] = useState(false);
  const [localBooking, setLocalBooking] = useState<BookingStatus>(session.userBookingStatus);
  const [localConfirmed, setLocalConfirmed] = useState(session.confirmedCount);
  const [localWaitlist, setLocalWaitlist]   = useState(session.waitlistCount);
  const [localWaitPos,  setLocalWaitPos]    = useState(session.userWaitlistPosition ?? 0);
  const [feedbackMsg, setFeedbackMsg]       = useState<string | null>(null);

  const startDate = new Date(session.startTime);
  const endDate   = new Date(session.endTime);
  const isPast    = endDate < new Date();
  const isFull    = localConfirmed >= session.maxCapacity;
  const fillPct   = Math.min((localConfirmed / session.maxCapacity) * 100, 100);

  const timeStr = (d: Date) =>
    d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

  const coachName = session.coach.user.profile
    ? `${session.coach.user.profile.firstName} ${session.coach.user.profile.lastName}`
    : "מאמן";

  // ─── Visual state mapping ─────────────────────────────────────────────────

  const cardStyle = cn(
    "relative rounded-2xl border p-4 transition-all duration-200 select-none",
    isPast && "opacity-50 grayscale",
    localBooking === "CONFIRMED"
      ? "bg-brand-accent-glow border-brand-accent/40 shadow-accent-sm"
      : localBooking === "WAITLISTED"
      ? "bg-brand-warning/5 border-brand-warning/30"
      : isFull
      ? "bg-brand-surface border-brand-border"
      : "bg-brand-surface border-brand-border hover:border-brand-border-light",
  );

  // ─── Handlers ─────────────────────────────────────────────────────────────

  async function handleBook() {
    if (loading || isPast) return;
    setLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`/api/sessions/${session.id}/book`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId: currentUserId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedbackMsg(data.error ?? "שגיאה");
        return;
      }

      if (data.data.status === "CONFIRMED") {
        setLocalBooking("CONFIRMED");
        setLocalConfirmed((c) => c + 1);
        setFeedbackMsg("✅ נרשמת! מקומך שמור.");
      } else {
        setLocalBooking("WAITLISTED");
        setLocalWaitlist((w) => w + 1);
        setLocalWaitPos(data.data.waitlistPosition ?? localWaitlist + 1);
        setFeedbackMsg(`⏳ נוספת לרשימת המתנה במקום ${data.data.waitlistPosition}.`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (loading || isPast) return;
    setLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch(
        `/api/sessions/${session.id}/book?userId=${currentUserId}`,
        { method: "DELETE" },
      );
      const data = await res.json();

      if (!res.ok) {
        setFeedbackMsg(data.error ?? "שגיאה בביטול");
        return;
      }

      const wasConfirmed = localBooking === "CONFIRMED";
      if (wasConfirmed) {
        setLocalConfirmed((c) => Math.max(0, c - 1));
      } else {
        setLocalWaitlist((w) => Math.max(0, w - 1));
      }
      setLocalBooking("NONE");
      setFeedbackMsg(wasConfirmed ? "ביטלת את הרשמתך." : "הוסרת מרשימת ההמתנה.");
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={cardStyle}>
      {/* Status ribbon */}
      {localBooking === "CONFIRMED" && (
        <div className="absolute -top-px left-0 right-0 h-0.5 bg-brand-accent rounded-t-2xl" />
      )}
      {localBooking === "WAITLISTED" && (
        <div className="absolute -top-px left-0 right-0 h-0.5 bg-brand-warning rounded-t-2xl" />
      )}

      {/* Header: time + status icon */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-brand-text-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeStr(startDate)} — {timeStr(endDate)}
          </p>
        </div>

        {localBooking === "CONFIRMED" && (
          <CheckCircle className="w-4 h-4 text-brand-accent flex-shrink-0" />
        )}
        {localBooking === "WAITLISTED" && (
          <Clock4 className="w-4 h-4 text-brand-warning flex-shrink-0" />
        )}
        {localBooking === "NONE" && isFull && !isPast && (
          <XCircle className="w-4 h-4 text-brand-error flex-shrink-0" />
        )}
      </div>

      {/* Title */}
      <h3 className={cn(
        "font-semibold text-sm leading-snug mb-2",
        localBooking === "CONFIRMED" ? "text-brand-accent" : "text-white",
      )}>
        {session.title}
      </h3>

      {/* Meta */}
      <div className="space-y-1 mb-3">
        <p className="text-xs text-brand-text-muted flex items-center gap-1">
          <User className="w-3 h-3" />
          {coachName}
        </p>
        {session.location && (
          <p className="text-xs text-brand-text-muted flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {session.location.name}
          </p>
        )}
      </div>

      {/* Capacity bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-brand-text-dim flex items-center gap-1">
            <Users className="w-3 h-3" />
            {localConfirmed}/{session.maxCapacity}
          </span>
          {localWaitlist > 0 && (
            <span className="text-xs text-brand-warning">{localWaitlist} ממתינים</span>
          )}
        </div>
        <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isFull ? "bg-brand-error" : fillPct >= 80 ? "bg-brand-warning" : "bg-brand-accent",
            )}
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>

      {/* Waitlist position badge */}
      {localBooking === "WAITLISTED" && (
        <div className="mb-3 bg-brand-warning/10 border border-brand-warning/30 rounded-lg px-2 py-1.5 text-xs text-brand-warning text-center">
          ⏳ מקום {localWaitPos} ברשימת המתנה
        </div>
      )}

      {/* Feedback message */}
      {feedbackMsg && (
        <p className={cn(
          "text-xs mb-2 text-center",
          feedbackMsg.startsWith("✅") ? "text-brand-accent"
            : feedbackMsg.startsWith("⏳") ? "text-brand-warning"
            : "text-brand-error",
        )}>
          {feedbackMsg}
        </p>
      )}

      {/* CTA button */}
      {!isPast && (
        <>
          {localBooking === "NONE" && session.status === "SCHEDULED" && (
            <>
              {session.userBookingStatus === "NO_MEMBERSHIP" ? (
                <div className="text-xs text-brand-error text-center bg-brand-error/10 rounded-lg py-2">
                  נדרש מנוי פעיל
                </div>
              ) : (
                <button
                  onClick={handleBook}
                  disabled={loading}
                  className={cn(
                    "w-full py-2 rounded-xl text-xs font-semibold transition-all",
                    "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                    isFull
                      ? "bg-brand-warning/15 border border-brand-warning/30 text-brand-warning hover:bg-brand-warning/25"
                      : "bg-brand-accent text-black hover:bg-brand-accent-dim shadow-accent-sm",
                  )}
                >
                  {loading ? "רושם..." : isFull ? "הוסף לרשימת המתנה" : "הירשם לאימון"}
                </button>
              )}
            </>
          )}

          {(localBooking === "CONFIRMED" || localBooking === "WAITLISTED") && (
            <button
              onClick={handleCancel}
              disabled={loading}
              className="w-full py-2 rounded-xl text-xs font-medium border border-brand-border text-brand-text-muted hover:border-brand-error hover:text-brand-error transition-all disabled:opacity-50"
            >
              {loading ? "מבטל..." : "בטל רישום"}
            </button>
          )}
        </>
      )}

      {isPast && (
        <div className="text-xs text-center text-brand-text-dim">אימון עבר</div>
      )}
    </div>
  );
}
