"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";
import type { OccupancyPoint } from "@/app/api/analytics/overview/route";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as OccupancyPoint;
  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-xs shadow-lg min-w-[140px]">
      <p className="text-brand-text-muted mb-0.5">{d?.date}</p>
      <p className="font-semibold text-white mb-1 truncate">{d?.title}</p>
      <p className="font-bold" style={{ color: payload[0]?.fill }}>
        {d?.confirmed}/{d?.capacity} ({d?.pct}%)
      </p>
    </div>
  );
}

export function OccupancyChart({ data }: { data: OccupancyPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-brand-text-dim">
        אין אימונים קרובים
      </div>
    );
  }

  function barColor(pct: number): string {
    if (pct >= 100) return "#FF4444";
    if (pct >= 80)  return "#FFB800";
    return "#00FF87";
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#6b7280", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fill: "#6b7280", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={80} stroke="#FFB800" strokeDasharray="4 2" strokeWidth={1} />
        <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={28}>
          {data.map((entry, i) => (
            <Cell key={i} fill={barColor(entry.pct)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
