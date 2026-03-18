"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import {
  Calendar, Clock, MapPin, Users, User, ChevronRight,
  Trash2, Pencil, Search, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SessionListItem {
  id:             string;
  title:          string;
  description:    string | null;
  startTime:      string;
  endTime:        string;
  maxCapacity:    number;
  status:         string;
  notes:          string | null;
  confirmedCount: number;
  waitlistCount:  number;
  coach: {
    id:   string;
    user: { profile: { firstName: string; lastName: string } | null };
  };
  location: { id: string; name: string } | null;
}

interface AdminSessionListProps {
  sessions: SessionListItem[];
}

type ViewMode = "upcoming" | "past" | "all";

export function AdminSessionList({ sessions: initial }: AdminSessionListProps) {
  const router  = useRouter();
  const [sessions, setSessions] = useState<SessionListItem[]>(initial);
  const [search,   setSearch]   = useState("");
  const [mode,     setMode]     = useState<ViewMode>("upcoming");
  const [deleting, setDeleting] = useState<string | null>(null);

  const now = new Date();

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      const start     = new Date(s.startTime);
      const matchMode = mode === "upcoming"
        ? start >= now
        : mode === "past"
        ? start < now
        : true;

      const coachName = s.coach.user.profile
        ? `${s.coach.user.profile.firstName} ${s.coach.user.profile.lastName}`
        : "";
      const matchSearch =
        !search ||
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        coachName.toLowerCase().includes(search.toLowerCase()) ||
        (s.location?.name ?? "").toLowerCase().includes(search.toLowerCase());

      return matchMode && matchSearch;
    });
  }, [sessions, search, mode]);

  async function handleDelete(id: string) {
    if (!confirm("למחוק אימון זה? כל ההרשמות יבוטלו.")) return;
    setDeleting(id);
    try {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  function getCapacityColor(confirmed: number, max: number) {
    const ratio = confirmed / max;
    if (ratio >= 1)    return "text-brand-error";
    if (ratio >= 0.8)  return "text-brand-warning";
    return "text-brand-accent";
  }

  function getStatusVariant(status: string): "accent" | "warning" | "error" | "neutral" | "info" {
    const map: Record<string, "accent" | "warning" | "error" | "neutral" | "info"> = {
      SCHEDULED:   "accent",
      IN_PROGRESS: "info",
      COMPLETED:   "neutral",
      CANCELLED:   "error",
    };
    return map[status] ?? "neutral";
  }

  function statusLabel(s: string) {
    const map: Record<string, string> = {
      SCHEDULED:   "מתוכנן",
      IN_PROGRESS: "מתקיים",
      COMPLETED:   "הסתיים",
      CANCELLED:   "בוטל",
    };
    return map[s] ?? s;
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  }

  function formatSessionDate(iso: string) {
    return new Date(iso).toLocaleDateString("he-IL", {
      weekday: "short", day: "numeric", month: "short",
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-dim" />
          <input
            type="text"
            placeholder="חיפוש לפי שם, מאמן, מיקום..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full input-base pr-9 pl-4 py-2 text-sm"
          />
        </div>
        <div className="flex gap-1">
          {(["upcoming", "past", "all"] as ViewMode[]).map((m) => {
            const labels = { upcoming: "קרובים", past: "עבר", all: "הכל" };
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                  mode === m
                    ? "bg-brand-accent text-black border-brand-accent"
                    : "bg-brand-elevated text-brand-text-muted hover:text-white border-brand-border",
                )}
              >
                {labels[m]}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-brand-text-dim">
        מציג {filtered.length} אימונים
      </p>

      {/* Session cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-brand-text-muted">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">אין אימונים להצגה</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((session) => {
            const coach = session.coach.user.profile
              ? `${session.coach.user.profile.firstName} ${session.coach.user.profile.lastName}`
              : "מאמן לא ידוע";

            const isFull    = session.confirmedCount >= session.maxCapacity;
            const isPast    = new Date(session.startTime) < now;
            const fillPct   = Math.min((session.confirmedCount / session.maxCapacity) * 100, 100);

            return (
              <div
                key={session.id}
                className={cn(
                  "card p-4 flex flex-col sm:flex-row sm:items-center gap-4",
                  "hover:border-brand-border-light transition-all",
                  isPast && "opacity-60",
                )}
              >
                {/* Date column */}
                <div className="flex-shrink-0 text-center w-16 hidden sm:block">
                  <p className="text-2xl font-bold text-brand-accent leading-none">
                    {new Date(session.startTime).getDate()}
                  </p>
                  <p className="text-xs text-brand-text-muted mt-0.5">
                    {new Date(session.startTime).toLocaleDateString("he-IL", { month: "short" })}
                  </p>
                  <p className="text-xs text-brand-text-dim">
                    {new Date(session.startTime).toLocaleDateString("he-IL", { weekday: "short" })}
                  </p>
                </div>

                {/* Main info */}
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-white">{session.title}</h3>
                    <Badge variant={getStatusVariant(session.status)}>
                      {statusLabel(session.status)}
                    </Badge>
                    {session.waitlistCount > 0 && (
                      <Badge variant="warning">{session.waitlistCount} המתנה</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-brand-text-muted">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatSessionDate(session.startTime)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTime(session.startTime)} — {formatTime(session.endTime)}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {coach}
                    </span>
                    {session.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {session.location.name}
                      </span>
                    )}
                  </div>

                  {/* Capacity bar */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-brand-border rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          isFull ? "bg-brand-error" : fillPct >= 80 ? "bg-brand-warning" : "bg-brand-accent",
                        )}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                    <span className={cn("text-xs font-semibold min-w-[40px]", getCapacityColor(session.confirmedCount, session.maxCapacity))}>
                      {session.confirmedCount}/{session.maxCapacity}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => router.push(`/dashboard/sessions/${session.id}`)}
                    className="p-2 rounded-lg text-brand-text-dim hover:text-white hover:bg-brand-elevated transition-colors"
                    title="פרטים ומשתתפים"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/sessions/${session.id}/edit`)}
                    className="p-2 rounded-lg text-brand-text-dim hover:text-white hover:bg-brand-elevated transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(session.id)}
                    disabled={deleting === session.id}
                    className="p-2 rounded-lg text-brand-text-dim hover:text-brand-error hover:bg-brand-elevated transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/sessions/${session.id}`)}
                    className="p-2 rounded-lg text-brand-text-muted hover:text-white hover:bg-brand-elevated transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
