"use client";

import { useState } from "react";
import type { AttendanceRow } from "@/app/api/analytics/overview/route";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  CONFIRMED:  { label: "רשום",    className: "bg-brand-accent/15 text-brand-accent" },
  ATTENDED:   { label: "הגיע",    className: "bg-brand-info/15 text-brand-info" },
  CANCELLED:  { label: "ביטל",    className: "bg-brand-error/15 text-brand-error" },
  NO_SHOW:    { label: "לא הגיע", className: "bg-brand-warning/15 text-brand-warning" },
  WAITLISTED: { label: "המתנה",   className: "bg-brand-text-dim/15 text-brand-text-dim" },
};

type Filter = "ALL" | "ATTENDED" | "CANCELLED" | "NO_SHOW";

export function AttendanceTable({ rows }: { rows: AttendanceRow[] }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");

  const filtered = rows.filter((r) => {
    const matchesFilter = filter === "ALL" || r.status === filter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      r.userName.toLowerCase().includes(q) ||
      r.sessionTitle.toLowerCase().includes(q) ||
      r.userEmail.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const filters: { key: Filter; label: string }[] = [
    { key: "ALL",       label: "הכל" },
    { key: "ATTENDED",  label: "הגיעו" },
    { key: "CANCELLED", label: "ביטלו" },
    { key: "NO_SHOW",   label: "לא הגיעו" },
  ];

  function formatDate(iso: string) {
    return new Intl.DateTimeFormat("he-IL", {
      day:   "2-digit",
      month: "2-digit",
      hour:  "2-digit",
      minute:"2-digit",
    }).format(new Date(iso));
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="חיפוש לפי שם / אימון..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] bg-brand-elevated border border-brand-border rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-brand-text-dim focus:outline-none focus:ring-1 focus:ring-brand-accent/50"
        />
        <div className="flex items-center gap-1 bg-brand-elevated rounded-xl p-1">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
                filter === key
                  ? "bg-brand-accent text-black"
                  : "text-brand-text-dim hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-brand-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-brand-border bg-brand-elevated/50">
              <th className="text-right px-4 py-2.5 text-brand-text-dim font-semibold">מתאמן</th>
              <th className="text-right px-4 py-2.5 text-brand-text-dim font-semibold">אימון</th>
              <th className="text-right px-4 py-2.5 text-brand-text-dim font-semibold">תאריך</th>
              <th className="text-right px-4 py-2.5 text-brand-text-dim font-semibold">סטטוס</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-6 text-brand-text-dim">
                  לא נמצאו רשומות
                </td>
              </tr>
            ) : (
              filtered.slice(0, 50).map((row, i) => {
                const s = STATUS_MAP[row.status] ?? { label: row.status, className: "bg-brand-elevated text-brand-text-muted" };
                return (
                  <tr key={i} className="hover:bg-brand-elevated/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-white">{row.userName}</p>
                      <p className="text-brand-text-dim">{row.userEmail}</p>
                    </td>
                    <td className="px-4 py-2.5 text-brand-text-muted">{row.sessionTitle}</td>
                    <td className="px-4 py-2.5 text-brand-text-muted">{formatDate(row.startTime)}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", s.className)}>
                        {s.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 50 && (
        <p className="text-xs text-brand-text-dim text-center">מציג 50 מתוך {filtered.length}</p>
      )}
    </div>
  );
}
