export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type RevenuePoint = {
  month:   string;  // "MM/YYYY"
  revenue: number;
};

export type OccupancyPoint = {
  date:      string;
  title:     string;
  confirmed: number;
  capacity:  number;
  pct:       number;
};

export type AttendanceRow = {
  sessionId:    string;
  sessionTitle: string;
  startTime:    string;
  userName:     string;
  userEmail:    string;
  status:       string;
};

export type OverviewData = {
  // Revenue
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueDelta:     number;     // %
  revenueChart:     RevenuePoint[];  // last 6 months

  // Members
  activeMembers:  number;
  expiredMembers: number;
  totalTrainees:  number;

  // Occupancy
  avgOccupancyPct:    number;
  upcomingSessionsCount: number;
  occupancyChart:     OccupancyPoint[];   // next 14 sessions

  // Attendance (last 30 days)
  attendanceRows: AttendanceRow[];
  attendedCount:  number;
  cancelledCount: number;
  noShowCount:    number;
};

// GET /api/analytics/overview
export async function GET() {
  try {
    const now          = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLast  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLast    = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

    // ── Revenue ─────────────────────────────────────────────────────────────
    const [paymentsThisMonth, paymentsLastMonth, paymentsLast6] = await Promise.all([
      prisma.payment.aggregate({
        where:  { status: "PAID", paidAt: { gte: startOfMonth } },
        _sum:   { amount: true },
      }),
      prisma.payment.aggregate({
        where:  { status: "PAID", paidAt: { gte: startOfLast, lte: endOfLast } },
        _sum:   { amount: true },
      }),
      prisma.payment.findMany({
        where:  { status: "PAID", paidAt: { gte: sixMonthsAgo } },
        select: { amount: true, paidAt: true },
      }),
    ]);

    const revenueThisMonth = Number(paymentsThisMonth._sum.amount ?? 0);
    const revenueLastMonth = Number(paymentsLastMonth._sum.amount ?? 0);
    const revenueDelta = revenueLastMonth > 0
      ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
      : 0;

    // Group last 6 months
    const revenueByMonth: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      revenueByMonth[key] = 0;
    }
    for (const p of paymentsLast6) {
      if (!p.paidAt) continue;
      const key = `${String(p.paidAt.getMonth() + 1).padStart(2, "0")}/${p.paidAt.getFullYear()}`;
      if (key in revenueByMonth) revenueByMonth[key] += Number(p.amount);
    }
    const revenueChart: RevenuePoint[] = Object.entries(revenueByMonth).map(([month, revenue]) => ({
      month,
      revenue: Math.round(revenue),
    }));

    // ── Members ──────────────────────────────────────────────────────────────
    const [activeMembers, expiredMembers, totalTrainees] = await Promise.all([
      prisma.membership.count({ where: { status: "ACTIVE" } }),
      prisma.membership.count({ where: { status: { in: ["EXPIRED", "CANCELLED"] } } }),
      prisma.user.count({ where: { role: "TRAINEE", isActive: true } }),
    ]);

    // ── Occupancy ────────────────────────────────────────────────────────────
    const upcomingSessions = await prisma.session.findMany({
      where:   { startTime: { gte: now }, status: "SCHEDULED" },
      orderBy: { startTime: "asc" },
      take:    14,
      include: {
        bookings: {
          where:  { status: "CONFIRMED" },
          select: { id: true },
        },
      },
    });

    const occupancyChart: OccupancyPoint[] = upcomingSessions.map((s) => {
      const confirmed = s.bookings.length;
      const pct       = Math.round((confirmed / s.maxCapacity) * 100);
      return {
        sessionId: s.id,
        date:  new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit" }).format(s.startTime),
        title: s.title,
        confirmed,
        capacity: s.maxCapacity,
        pct,
      };
    });

    const avgOccupancyPct = occupancyChart.length
      ? Math.round(occupancyChart.reduce((s, o) => s + o.pct, 0) / occupancyChart.length)
      : 0;

    // ── Attendance (last 30 days) ─────────────────────────────────────────────
    const recentBookings = await prisma.booking.findMany({
      where:   { bookedAt: { gte: thirtyDaysAgo } },
      orderBy: { bookedAt: "desc" },
      take:    100,
      include: {
        session: { select: { id: true, title: true, startTime: true } },
        user:    { include: { profile: true } },
      },
    });

    const attendanceRows: AttendanceRow[] = recentBookings.map((b) => ({
      sessionId:    b.session.id,
      sessionTitle: b.session.title,
      startTime:    b.session.startTime.toISOString(),
      userName:     b.user.profile
        ? `${b.user.profile.firstName} ${b.user.profile.lastName}`
        : b.user.email,
      userEmail: b.user.email,
      status:    b.status,
    }));

    const attendedCount  = recentBookings.filter((b) => b.status === "ATTENDED").length;
    const cancelledCount = recentBookings.filter((b) => b.status === "CANCELLED").length;
    const noShowCount    = recentBookings.filter((b) => b.status === "NO_SHOW").length;

    const data: OverviewData = {
      revenueThisMonth,
      revenueLastMonth,
      revenueDelta,
      revenueChart,
      activeMembers,
      expiredMembers,
      totalTrainees,
      avgOccupancyPct,
      upcomingSessionsCount: upcomingSessions.length,
      occupancyChart,
      attendanceRows,
      attendedCount,
      cancelledCount,
      noShowCount,
    };

    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/analytics/overview]", err);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}
