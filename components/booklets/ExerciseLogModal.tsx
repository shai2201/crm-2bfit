"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { Dumbbell, Flame } from "lucide-react";

export interface ExerciseLogData {
  id:       string;
  weightKg: number | null;
  reps:     number | null;
  sets:     number | null;
  rpe:      number | null;
  notes:    string | null;
  loggedAt: string;
}

interface ExerciseLogModalProps {
  open:        boolean;
  onClose:     () => void;
  exerciseId:  string;
  exerciseName: string;
  userId:      string;
  previousLog?: ExerciseLogData | null;
  onLogged:    (log: ExerciseLogData) => void;
}

const RPE_LABELS: Record<number, string> = {
  1:  "1 – קל מאוד",
  2:  "2 – קל",
  3:  "3 – קל-בינוני",
  4:  "4 – בינוני",
  5:  "5 – בינוני+",
  6:  "6 – קשה-בינוני",
  7:  "7 – קשה",
  8:  "8 – קשה מאוד",
  9:  "9 – מאמץ מקסימלי",
  10: "10 – תשישות מוחלטת",
};

function RpeSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-white/80 flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-brand-warning" />
          RPE (רמת קושי)
        </label>
        <span className={cn(
          "text-xs font-semibold px-2 py-0.5 rounded-full",
          value <= 3 ? "text-brand-accent bg-brand-accent/10"
            : value <= 6 ? "text-brand-warning bg-brand-warning/10"
            : "text-brand-error bg-brand-error/10",
        )}>
          {value} / 10
        </span>
      </div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "h-9 rounded-lg text-xs font-bold transition-all",
              value === n
                ? n <= 3 ? "bg-brand-accent text-black"
                  : n <= 6 ? "bg-brand-warning text-black"
                  : "bg-brand-error text-white"
                : "bg-brand-elevated border border-brand-border text-brand-text-dim hover:border-brand-accent hover:text-white",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="text-xs text-brand-text-dim mt-1.5 text-center">
        {RPE_LABELS[value]}
      </p>
    </div>
  );
}

export function ExerciseLogModal({
  open,
  onClose,
  exerciseId,
  exerciseName,
  userId,
  previousLog,
  onLogged,
}: ExerciseLogModalProps) {
  const [form, setForm] = useState({
    weightKg: previousLog?.weightKg?.toString() ?? "",
    reps:     previousLog?.reps?.toString()     ?? "",
    sets:     previousLog?.sets?.toString()     ?? "",
    rpe:      previousLog?.rpe ?? 7,
    notes:    "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  function set(k: keyof typeof form, v: string | number) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function computeVolume() {
    const w = parseFloat(form.weightKg);
    const r = parseInt(form.reps);
    const s = parseInt(form.sets);
    if (w > 0 && r > 0 && s > 0) return Math.round(w * r * s);
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/exercises/${exerciseId}/logs`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          weightKg: form.weightKg ? parseFloat(form.weightKg) : null,
          reps:     form.reps     ? parseInt(form.reps)        : null,
          sets:     form.sets     ? parseInt(form.sets)        : null,
          rpe:      form.rpe      ?? null,
          notes:    form.notes    || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה");
      onLogged(data.data);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const volume = computeVolume();

  return (
    <Modal open={open} onClose={onClose} title={`רישום ביצוע: ${exerciseName}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Previous log reference */}
        {previousLog && (
          <div className="bg-brand-elevated border border-brand-border rounded-xl px-4 py-3 text-xs">
            <p className="text-brand-text-dim mb-1">האימון הקודם:</p>
            <p className="text-white font-medium">
              {[
                previousLog.sets ? `${previousLog.sets} סטים` : null,
                previousLog.reps ? `× ${previousLog.reps} חזרות` : null,
                previousLog.weightKg ? `@ ${previousLog.weightKg}kg` : null,
                previousLog.rpe ? `RPE ${previousLog.rpe}` : null,
              ].filter(Boolean).join("  ·  ")}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-brand-error/10 border border-brand-error/30 rounded-xl px-4 py-3 text-sm text-brand-error">
            {error}
          </div>
        )}

        {/* Performance inputs */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium text-white/80 flex items-center gap-1.5 mb-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-brand-accent" />
              משקל (kg)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              placeholder={previousLog?.weightKg?.toString() ?? "0"}
              value={form.weightKg}
              onChange={(e) => set("weightKg", e.target.value)}
              className="input-base px-3 py-2.5 text-sm w-full text-center text-lg font-bold"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-white/80 mb-1.5 block text-center">
              סטים
            </label>
            <input
              type="number"
              min="1"
              max="20"
              placeholder={previousLog?.sets?.toString() ?? "3"}
              value={form.sets}
              onChange={(e) => set("sets", e.target.value)}
              className="input-base px-3 py-2.5 text-sm w-full text-center text-lg font-bold"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-white/80 mb-1.5 block text-center">
              חזרות
            </label>
            <input
              type="number"
              min="1"
              max="100"
              placeholder={previousLog?.reps?.toString() ?? "10"}
              value={form.reps}
              onChange={(e) => set("reps", e.target.value)}
              className="input-base px-3 py-2.5 text-sm w-full text-center text-lg font-bold"
            />
          </div>
        </div>

        {/* Volume preview */}
        {volume && (
          <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-xl px-4 py-2 text-center">
            <p className="text-xs text-brand-text-muted">נפח אימון</p>
            <p className="text-xl font-bold text-brand-accent">{volume.toLocaleString()} kg</p>
            <p className="text-xs text-brand-text-dim">{form.sets} × {form.reps} × {form.weightKg}kg</p>
          </div>
        )}

        {/* RPE */}
        <RpeSelector
          value={form.rpe}
          onChange={(v) => set("rpe", v)}
        />

        {/* Notes */}
        <Textarea
          label="הערות"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="איך הרגשת? נקודות לשיפור..."
        />

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
            ביטול
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            שמור ביצוע
          </Button>
        </div>
      </form>
    </Modal>
  );
}
