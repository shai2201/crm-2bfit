"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { ProgressDataPoint } from "@/app/api/analytics/progress/route";
import { TrendingUp, TrendingDown, Minus, BarChart2, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressChartProps {
  exerciseId: string;
  userId:     string;
}

type Period = 7 | 30 | 90 | 180 | 365;

const PERIOD_LABELS: Record<Period, string> = {
  7:   "7י",
  30:  "30י",
  90:  "3ח",
  180: "6ח",
  365: "שנה",
};

type ChartMode = "weight" | "volume";

interface Stats {
  totalSessions: number;
  maxWeight:     number | null;
  maxVolume:     number | null;
  avgRpe:        number | null;
  improvement:   number | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="text-brand-text-muted mb-1 font-medium">{label}</p>
      {payload.map((entry: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: entry.color }} className="font-semibold">
          {entry.name}: {entry.value}
          {entry.name === "משקל" ? " kg" : entry.name === "עצימות (RPE)" ? "" : " kg×"}
        </p>
      ))}
    </div>
  );
}

export function ProgressChart({ exerciseId, userId }: ProgressChartProps) {
  const [period,    setPeriod]    = useState<Period>(30);
  const [mode,      setMode]      = useState<ChartMode>("weight");
  const [data,      setData]      = useState<ProgressDataPoint[]>([]);
  const [stats,     setStats]     = useState<Stats | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/analytics/progress?exerciseId=${exerciseId}&userId=${userId}&period=${period}`,
      );
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      setData(json.data ?? []);
      setStats(json.stats ?? null);
    } catch {
      setError("שגיאה בטעינת הנתונים");
    } finally {
      setLoading(false);
    }
  }, [exerciseId, userId, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const improvement = stats?.improvement ?? null;
  const ImprovementIcon =
    improvement === null ? Minus
    : improvement > 0    ? TrendingUp
    :                      TrendingDown;

  return (
    <div className="space-y-3">
      {/* Controls row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Period selector */}
        <div className="flex items-center gap-1 bg-brand-elevated rounded-xl p-1">
          {(Object.keys(PERIOD_LABELS) as unknown as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
                period === p
                  ? "bg-brand-accent text-black"
                  : "text-brand-text-dim hover:text-white",
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-brand-elevated rounded-xl p-1">
          <button
            onClick={() => setMode("weight")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
              mode === "weight"
                ? "bg-brand-accent/20 text-brand-accent"
                : "text-brand-text-dim hover:text-white",
            )}
          >
            <Activity className="w-3 h-3" /> משקל
          </button>
          <button
            onClick={() => setMode("volume")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
              mode === "volume"
                ? "bg-brand-info/20 text-brand-info"
                : "text-brand-text-dim hover:text-white",
            )}
          >
            <BarChart2 className="w-3 h-3" /> נפח
          </button>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-brand-elevated rounded-xl px-3 py-2 text-center">
            <p className="text-[10px] text-brand-text-dim uppercase tracking-wider">אימונים</p>
            <p className="text-sm font-bold text-white">{stats.totalSessions}</p>
          </div>
          <div className="bg-brand-elevated rounded-xl px-3 py-2 text-center">
            <p className="text-[10px] text-brand-text-dim uppercase tracking-wider">שיא משקל</p>
            <p className="text-sm font-bold text-white">
              {stats.maxWeight != null ? `${stats.maxWeight}kg` : "—"}
            </p>
          </div>
          <div className="bg-brand-elevated rounded-xl px-3 py-2 text-center">
            <p className="text-[10px] text-brand-text-dim uppercase tracking-wider">שיפור</p>
            <div className="flex items-center justify-center gap-0.5">
              <ImprovementIcon
                className={cn(
                  "w-3 h-3",
                  improvement === null ? "text-brand-text-dim"
                  : improvement > 0    ? "text-brand-accent"
                  :                      "text-brand-error",
                )}
              />
              <p
                className={cn(
                  "text-sm font-bold",
                  improvement === null ? "text-brand-text-dim"
                  : improvement > 0    ? "text-brand-accent"
                  :                      "text-brand-error",
                )}
              >
                {improvement != null ? `${improvement > 0 ? "+" : ""}${improvement}%` : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chart area */}
      <div className="h-44">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-xs text-brand-error">{error}</div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-brand-text-dim">
            אין נתונים לתקופה זו
          </div>
        ) : mode === "weight" ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="weightKg"
                name="משקל"
                stroke="#00FF87"
                strokeWidth={2}
                dot={{ r: 3, fill: "#00FF87", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#00FF87" }}
                connectNulls
              />
              {data.some((d) => d.rpe !== null) && (
                <Line
                  type="monotone"
                  dataKey="rpe"
                  name="עצימות (RPE)"
                  stroke="#FFB800"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                  connectNulls
                  yAxisId={0}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="volume"
                name="נפח"
                fill="#00C8FF"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
