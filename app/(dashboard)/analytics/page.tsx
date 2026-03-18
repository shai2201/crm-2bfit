import { Header } from "@/components/dashboard/Header";
import { RevenueChart } from "@/components/analytics/RevenueChart";
import { OccupancyChart } from "@/components/analytics/OccupancyChart";
import { AttendanceTable } from "@/components/analytics/AttendanceTable";
import type { OverviewData } from "@/app/api/analytics/overview/route";
import {
  TrendingUp, TrendingDown, Minus,
  Users, UserCheck, UserX,
  BarChart3, Calendar,
  CheckCircle, XCircle, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

async function getOverview(): Promise<OverviewData> {
  // Server-side: call our own API
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/analytics/overview`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load analytics");
  return res.json();
}

export default async function AnalyticsPage() {
  const data = await getOverview();

  const revDelta = data.revenueDelta;
  const RevIcon  = revDelta > 0 ? TrendingUp : revDelta < 0 ? TrendingDown : Minus;
  const revColor = revDelta > 0 ? "text-brand-accent" : revDelta < 0 ? "text-brand-error" : "text-brand-text-dim";

  return (
    <>
      <Header
        title="דוח עסקי"
        subtitle="סקירת ביצועים עסקיים בזמן אמת"
      />

      <div className="p-4 sm:p-6 space-y-6">

        {/* ── Row 1: KPI Cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Revenue this month */}
          <div className="card p-4 col-span-2 sm:col-span-1">
            <p className="text-xs text-brand-text-dim mb-1">הכנסות החודש</p>
            <p className="text-2xl font-bold text-white mb-1">
              ₪{data.revenueThisMonth.toLocaleString("he-IL")}
            </p>
            <div className={cn("flex items-center gap-1 text-xs font-semibold", revColor)}>
              <RevIcon className="w-3 h-3" />
              <span>{revDelta > 0 ? "+" : ""}{revDelta}% לעומת חודש שעבר</span>
            </div>
            <p className="text-xs text-brand-text-dim mt-0.5">
              חודש שעבר: ₪{data.revenueLastMonth.toLocaleString("he-IL")}
            </p>
          </div>

          {/* Active members */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-brand-accent/10 rounded-lg">
                <UserCheck className="w-4 h-4 text-brand-accent" />
              </div>
              <p className="text-xs text-brand-text-dim">מנויים פעילים</p>
            </div>
            <p className="text-2xl font-bold text-white">{data.activeMembers}</p>
            <p className="text-xs text-brand-text-dim mt-0.5">
              {data.expiredMembers} פג תוקף · {data.totalTrainees} סה״כ מתאמנים
            </p>
          </div>

          {/* Avg occupancy */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-brand-info/10 rounded-lg">
                <BarChart3 className="w-4 h-4 text-brand-info" />
              </div>
              <p className="text-xs text-brand-text-dim">תפוסה ממוצעת</p>
            </div>
            <p className={cn(
              "text-2xl font-bold",
              data.avgOccupancyPct >= 80 ? "text-brand-accent"
              : data.avgOccupancyPct >= 50 ? "text-brand-warning"
              : "text-brand-error",
            )}>
              {data.avgOccupancyPct}%
            </p>
            <p className="text-xs text-brand-text-dim mt-0.5">
              {data.upcomingSessionsCount} אימונים קרובים
            </p>
          </div>

          {/* Attendance summary */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-brand-warning/10 rounded-lg">
                <Calendar className="w-4 h-4 text-brand-warning" />
              </div>
              <p className="text-xs text-brand-text-dim">נוכחות 30 יום</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs">
                <CheckCircle className="w-3 h-3 text-brand-accent flex-shrink-0" />
                <span className="text-brand-text-muted">הגיעו:</span>
                <span className="font-semibold text-white">{data.attendedCount}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <XCircle className="w-3 h-3 text-brand-error flex-shrink-0" />
                <span className="text-brand-text-muted">ביטלו:</span>
                <span className="font-semibold text-white">{data.cancelledCount}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <AlertCircle className="w-3 h-3 text-brand-warning flex-shrink-0" />
                <span className="text-brand-text-muted">לא הגיעו:</span>
                <span className="font-semibold text-white">{data.noShowCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 2: Charts ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Revenue chart */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white text-sm">הכנסות — 6 חודשים אחרונים</h2>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-brand-accent" />
                <span className="text-xs text-brand-text-dim">₪</span>
              </div>
            </div>
            <RevenueChart data={data.revenueChart} />
          </div>

          {/* Occupancy chart */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white text-sm">תפוסת אימונים קרובים</h2>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-brand-accent inline-block" />
                  תקין
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-brand-warning inline-block" />
                  80%+
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-brand-error inline-block" />
                  מלא
                </span>
              </div>
            </div>
            <OccupancyChart data={data.occupancyChart} />
          </div>
        </div>

        {/* ── Row 3: Members breakdown ─────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="font-semibold text-white text-sm mb-4">פילוח מנויים</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "פעילים",        count: data.activeMembers,  color: "bg-brand-accent",  icon: <UserCheck className="w-4 h-4 text-brand-accent" /> },
              { label: "פג תוקף",       count: data.expiredMembers, color: "bg-brand-error",   icon: <UserX     className="w-4 h-4 text-brand-error"   /> },
              { label: "סה״כ מתאמנים",  count: data.totalTrainees,  color: "bg-brand-info",    icon: <Users     className="w-4 h-4 text-brand-info"    /> },
            ].map(({ label, count, color, icon }) => (
              <div key={label} className="flex flex-col items-center gap-2 p-3 bg-brand-elevated rounded-xl">
                <div className="p-2 bg-brand-surface rounded-xl">{icon}</div>
                <p className="text-xl font-bold text-white">{count}</p>
                <p className="text-xs text-brand-text-dim text-center">{label}</p>
                {/* Mini bar */}
                <div className="w-full h-1 bg-brand-border rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", color)}
                    style={{ width: data.totalTrainees > 0 ? `${Math.min((count / data.totalTrainees) * 100, 100)}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Row 4: Attendance table ──────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="font-semibold text-white text-sm mb-4">
            דוח נוכחות — 30 ימים אחרונים
          </h2>
          <AttendanceTable rows={data.attendanceRows} />
        </div>

      </div>
    </>
  );
}
