import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type ProgressDataPoint = {
  date:      string;    // "DD/MM"
  dateISO:   string;    // for sorting
  weightKg:  number | null;
  reps:      number | null;
  sets:      number | null;
  rpe:       number | null;
  volume:    number | null;   // weightKg × reps × sets
};

// GET /api/analytics/progress?exerciseId=xxx&userId=xxx&period=30
// period options: 7 | 30 | 90 | 180 | 365
export async function GET(req: NextRequest) {
  try {
    const sp         = new URL(req.url).searchParams;
    const exerciseId = sp.get("exerciseId");
    const userId     = sp.get("userId");
    const period     = parseInt(sp.get("period") ?? "30");

    if (!exerciseId) return NextResponse.json({ error: "exerciseId נדרש" }, { status: 400 });
    if (!userId)     return NextResponse.json({ error: "userId נדרש"    }, { status: 400 });

    const ALLOWED_PERIODS = [7, 30, 90, 180, 365];
    const safePeriod = ALLOWED_PERIODS.includes(period) ? period : 30;

    const since = new Date();
    since.setDate(since.getDate() - safePeriod);

    const logs = await prisma.exerciseLog.findMany({
      where: {
        exerciseId,
        userId,
        loggedAt: { gte: since },
      },
      orderBy: { loggedAt: "asc" },
      select: {
        weightKg: true,
        reps:     true,
        sets:     true,
        rpe:      true,
        loggedAt: true,
      },
    });

    // Also fetch the exercise name for the chart title
    const exercise = await prisma.exercise.findUnique({
      where:  { id: exerciseId },
      select: { name: true },
    });

    const data: ProgressDataPoint[] = logs.map((log) => {
      const volume =
        log.weightKg && log.reps && log.sets
          ? Math.round(log.weightKg * log.reps * log.sets)
          : null;

      return {
        date: new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit" })
          .format(log.loggedAt),
        dateISO:  log.loggedAt.toISOString(),
        weightKg: log.weightKg,
        reps:     log.reps,
        sets:     log.sets,
        rpe:      log.rpe,
        volume,
      };
    });

    // Compute stats
    const weights  = data.map((d) => d.weightKg).filter(Boolean) as number[];
    const volumes  = data.map((d) => d.volume).filter(Boolean)   as number[];
    const maxWeight = weights.length ? Math.max(...weights) : null;
    const avgRpe    = logs.length
      ? Math.round((logs.reduce((s, l) => s + (l.rpe ?? 0), 0) / logs.length) * 10) / 10
      : null;

    const stats = {
      totalSessions: logs.length,
      maxWeight,
      maxVolume: volumes.length ? Math.max(...volumes) : null,
      avgRpe,
      improvement:
        weights.length >= 2
          ? Math.round(((weights.at(-1)! - weights[0]) / weights[0]) * 100)
          : null,
    };

    return NextResponse.json({
      data,
      stats,
      exerciseName: exercise?.name ?? "תרגיל",
      period:       safePeriod,
    });
  } catch (err) {
    console.error("[GET /api/analytics/progress]", err);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}
