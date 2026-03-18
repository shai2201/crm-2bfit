import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CheckoutButton } from "@/components/products/CheckoutButton";
import {
  CalendarDays, Dumbbell, Salad, CreditCard,
  Clock, MapPin, User, ChevronLeft,
  AlertCircle, CheckCircle, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────────────
// Data fetching
// ──────────────────────────────────────────────────────────────────────────────

async function getTraineeData(userId: string) {
  const [nextBooking, membership, booklet, renewalProduct] = await Promise.all([
    // Next upcoming confirmed session
    prisma.booking.findFirst({
      where: {
        userId,
        status: "CONFIRMED",
        session: { startTime: { gte: new Date() } },
      },
      orderBy: { session: { startTime: "asc" } },
      include: {
        session: {
          include: {
            coach:    { include: { user: { include: { profile: true } } } },
            location: true,
          },
        },
      },
    }),

    // Active membership
    prisma.membership.findFirst({
      where:   { userId, status: "ACTIVE" },
      orderBy: { endDate: "desc" },
      include: { plan: true },
    }),

    // Active workout booklet
    prisma.workoutBooklet.findFirst({
      where:   { traineeId: userId, isActive: true },
      select:  { id: true, title: true, days: { select: { _count: { select: { exercises: true } } } } },
    }),

    // A product to renew with (MEMBERSHIP_PLAN type, active)
    prisma.product.findFirst({
      where: { isActive: true, type: "MEMBERSHIP_PLAN" },
      select: { id: true, name: true, price: true, currency: true },
    }),
  ]);

  return { nextBooking, membership, booklet, renewalProduct };
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function formatTime(d: Date) {
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function formatDateHebrew(d: Date) {
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
  }).format(d);
}

function daysUntil(d: Date): number {
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ──────────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────────

export default async function PortalPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId   = session.user.id;
  const userName = session.user.name ?? "מתאמן";
  const greeting = new Date().getHours() < 12 ? "בוקר טוב" : new Date().getHours() < 17 ? "צהריים טובים" : "ערב טוב";

  const { nextBooking, membership, booklet, renewalProduct } = await getTraineeData(userId);

  const membershipDaysLeft  = membership ? daysUntil(membership.endDate) : null;
  const membershipIsExpiring = membershipDaysLeft !== null && membershipDaysLeft <= 7;
  const bookletExercises     = booklet?.days.reduce((s, d) => s + d._count.exercises, 0) ?? 0;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-2xl mx-auto lg:max-w-none">
      {/* Greeting */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-white">
          {greeting}, {userName.split(" ")[0]} 👋
        </h1>
        <p className="text-brand-text-muted text-sm mt-0.5">
          {formatDateHebrew(new Date())}
        </p>
      </div>

      {/* ── Card grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* 1. Next session */}
        <div className={cn(
          "card p-5 col-span-1",
          nextBooking && "border-brand-accent/20",
        )}>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-brand-accent/10 rounded-xl">
              <CalendarDays className="w-5 h-5 text-brand-accent" />
            </div>
            <h2 className="font-semibold text-white text-sm">האימון הקרוב</h2>
          </div>

          {nextBooking ? (
            <>
              <p className="text-brand-accent font-bold text-base mb-3">
                {nextBooking.session.title}
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-brand-text-muted">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    {formatDateHebrew(nextBooking.session.startTime)}{" "}
                    · {formatTime(nextBooking.session.startTime)}–{formatTime(nextBooking.session.endTime)}
                  </span>
                </div>
                {nextBooking.session.location && (
                  <div className="flex items-center gap-2 text-xs text-brand-text-muted">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{nextBooking.session.location.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-brand-text-muted">
                  <User className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    {nextBooking.session.coach.user.profile
                      ? `${nextBooking.session.coach.user.profile.firstName} ${nextBooking.session.coach.user.profile.lastName}`
                      : "מאמן"}
                  </span>
                </div>
              </div>

              {/* Countdown badge */}
              <div className="mt-4">
                {daysUntil(nextBooking.session.startTime) === 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold bg-brand-accent/10 text-brand-accent px-3 py-1 rounded-full">
                    <Zap className="w-3 h-3" /> היום!
                  </span>
                ) : (
                  <span className="text-xs text-brand-text-dim">
                    בעוד {daysUntil(nextBooking.session.startTime)} ימים
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-brand-text-dim mb-3">אין אימונים קרובים</p>
              <Link
                href="/dashboard/schedule"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-accent hover:underline"
              >
                לצפייה בלוח השיעורים <ChevronLeft className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        {/* 2. Membership status */}
        <div className={cn(
          "card p-5",
          membershipIsExpiring && "border-brand-warning/30",
          !membership && "border-brand-error/30",
        )}>
          <div className="flex items-center gap-2 mb-4">
            <div className={cn(
              "p-2 rounded-xl",
              membership ? "bg-brand-accent/10" : "bg-brand-error/10",
            )}>
              <CreditCard className={cn(
                "w-5 h-5",
                membership ? "text-brand-accent" : "text-brand-error",
              )} />
            </div>
            <h2 className="font-semibold text-white text-sm">סטטוס מנוי</h2>
          </div>

          {membership ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-brand-accent flex-shrink-0" />
                <span className="font-semibold text-white text-sm">{membership.plan.name}</span>
              </div>
              <p className={cn(
                "text-xs mb-4",
                membershipIsExpiring ? "text-brand-warning" : "text-brand-text-muted",
              )}>
                {membershipIsExpiring && "⚠️ "}
                {membershipDaysLeft === 0
                  ? "פג תוקף היום"
                  : `${membershipDaysLeft} ימים נותרו`}
                {" · "}תוקף עד{" "}
                {new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" })
                  .format(membership.endDate)}
              </p>

              {/* Progress bar */}
              <div className="h-1.5 bg-brand-border rounded-full overflow-hidden mb-4">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    membershipIsExpiring ? "bg-brand-warning" : "bg-brand-accent",
                  )}
                  style={{
                    width: `${Math.max(0, Math.min(100,
                      (membershipDaysLeft! / membership.plan.durationDays) * 100,
                    ))}%`,
                  }}
                />
              </div>

              {membershipIsExpiring && renewalProduct && (
                <CheckoutButton
                  productId={renewalProduct.id}
                  userId={userId}
                  label="חדש מנוי"
                  className="w-full justify-center"
                />
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-brand-error flex-shrink-0" />
                <span className="text-brand-error text-sm font-medium">אין מנוי פעיל</span>
              </div>
              <p className="text-xs text-brand-text-muted mb-4">
                רכוש מנוי כדי להירשם לאימונים
              </p>
              {renewalProduct && (
                <CheckoutButton
                  productId={renewalProduct.id}
                  userId={userId}
                  label={`רכוש מנוי · ₪${Number(renewalProduct.price).toLocaleString("he-IL")}`}
                  className="w-full justify-center"
                />
              )}
            </>
          )}
        </div>

        {/* 3. My workout plan */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-brand-info/10 rounded-xl">
              <Dumbbell className="w-5 h-5 text-brand-info" />
            </div>
            <h2 className="font-semibold text-white text-sm">התוכנית שלי</h2>
          </div>

          {booklet ? (
            <>
              <p className="font-semibold text-white mb-1">{booklet.title}</p>
              <p className="text-xs text-brand-text-muted mb-4">
                {booklet.days.length} ימי אימון · {bookletExercises} תרגילים
              </p>
              <Link
                href="/dashboard/my-booklet"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-sm font-semibold bg-brand-info/10 text-brand-info hover:bg-brand-info/20 transition-colors border border-brand-info/20"
              >
                פתח חוברת אימון <ChevronLeft className="w-4 h-4" />
              </Link>
            </>
          ) : (
            <div className="text-center py-3">
              <p className="text-sm text-brand-text-dim">אין תוכנית אימון פעילה</p>
              <p className="text-xs text-brand-text-dim mt-1">פנה למאמן שלך</p>
            </div>
          )}
        </div>

        {/* 4. Nutrition AI */}
        <div className="card p-5 bg-gradient-to-br from-brand-surface to-brand-elevated">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-brand-accent/10 rounded-xl">
              <Salad className="w-5 h-5 text-brand-accent" />
            </div>
            <h2 className="font-semibold text-white text-sm">תזונה AI</h2>
          </div>

          <p className="text-sm text-brand-text-muted mb-1">
            תפריט אישי מבוסס BMR/TDEE
          </p>
          <p className="text-xs text-brand-text-dim mb-4">
            קבל המלצות תזונה מותאמות אישית למטרות שלך
          </p>

          <Link
            href="/dashboard/my-nutrition"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-sm font-bold bg-brand-accent text-black hover:bg-brand-accent-dim transition-colors shadow-accent-sm"
          >
            פתח יועץ תזונה <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>

      </div>

      {/* ── Quick links bar ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {[
          { href: "/dashboard/schedule",      label: "לוח שיעורים",    icon: "📅" },
          { href: "/dashboard/my-booklet",    label: "סרטוני הדגמה",   icon: "🎬" },
          { href: "/dashboard/my-nutrition",  label: "מעקב תזונה",     icon: "📊" },
          { href: "/dashboard/schedule",      label: "הירשם לאימון",   icon: "➕" },
        ].map(({ href, label, icon }) => (
          <Link
            key={`${href}-${label}`}
            href={href}
            className="card p-3 text-center hover:border-brand-accent/30 transition-all group"
          >
            <div className="text-2xl mb-1">{icon}</div>
            <p className="text-xs text-brand-text-muted group-hover:text-white transition-colors font-medium">
              {label}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
