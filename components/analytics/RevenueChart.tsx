"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { RevenuePoint } from "@/app/api/analytics/overview/route";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="text-brand-text-muted mb-1">{label}</p>
      <p className="font-bold text-brand-accent">
        ₪{payload[0]?.value?.toLocaleString("he-IL")}
      </p>
    </div>
  );
}

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-brand-text-dim">
        אין נתוני הכנסה
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#00FF87" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#00FF87" stopOpacity={0}    />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: "#6b7280", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#6b7280", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `₪${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          name="הכנסה"
          stroke="#00FF87"
          strokeWidth={2}
          fill="url(#revenueGrad)"
          dot={{ r: 3, fill: "#00FF87", strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "#00FF87" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
