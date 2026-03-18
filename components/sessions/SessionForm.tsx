"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Calendar, Clock, MapPin, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Coach {
  id:     string;
  user:   { profile: { firstName: string; lastName: string } | null };
}

interface Location { id: string; name: string }

interface SessionFormProps {
  coaches:   Coach[];
  locations: Location[];
  sessionId?: string;
  initialData?: Partial<SessionFormState>;
}

interface SessionFormState {
  title:        string;
  description:  string;
  coachId:      string;
  locationId:   string;
  locationName: string;   // when creating a new location on the fly
  date:         string;
  startHour:    string;
  endHour:      string;
  maxCapacity:  string;
  notes:        string;
}

const EMPTY: SessionFormState = {
  title:        "",
  description:  "",
  coachId:      "",
  locationId:   "",
  locationName: "",
  date:         "",
  startHour:    "07:00",
  endHour:      "08:00",
  maxCapacity:  "15",
  notes:        "",
};

// Common fitness session durations
const HOUR_OPTIONS = Array.from({ length: 29 }, (_, i) => {
  const totalMins = 360 + i * 30;   // 06:00 to 22:00 in 30-min steps
  const h = String(Math.floor(totalMins / 60)).padStart(2, "0");
  const m = String(totalMins % 60).padStart(2, "0");
  return { value: `${h}:${m}`, label: `${h}:${m}` };
});

export function SessionForm({ coaches, locations, sessionId, initialData }: SessionFormProps) {
  const router  = useRouter();
  const isEdit  = Boolean(sessionId);
  const [form,   setForm]   = useState<SessionFormState>({ ...EMPTY, ...initialData });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [newLocation, setNewLocation] = useState(false);

  function set<K extends keyof SessionFormState>(key: K, val: string) {
    setForm((p) => ({ ...p, [key]: val }));
    setErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.title.trim())   e.title   = "כותרת נדרשת";
    if (!form.coachId)        e.coachId = "בחר מאמן";
    if (!form.date)           e.date    = "תאריך נדרש";
    if (!form.startHour)      e.startHour = "שעת התחלה נדרשת";
    if (!form.endHour)        e.endHour   = "שעת סיום נדרשת";
    if (form.startHour >= form.endHour) e.endHour = "שעת הסיום חייבת להיות אחרי ההתחלה";
    const cap = parseInt(form.maxCapacity);
    if (isNaN(cap) || cap < 1 || cap > 50) e.maxCapacity = "קיבולת חייבת להיות 1–50";
    if (newLocation && !form.locationName.trim()) e.locationName = "שם מיקום נדרש";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    // Build ISO datetimes from date + hour fields
    const startTime = `${form.date}T${form.startHour}:00`;
    const endTime   = `${form.date}T${form.endHour}:00`;

    const payload = {
      title:        form.title,
      description:  form.description || undefined,
      coachId:      form.coachId,
      locationId:   !newLocation && form.locationId ? form.locationId : undefined,
      locationName: newLocation ? form.locationName : undefined,
      startTime,
      endTime,
      maxCapacity:  parseInt(form.maxCapacity),
      notes:        form.notes || undefined,
    };

    try {
      const url    = isEdit ? `/api/sessions/${sessionId}` : "/api/sessions";
      const method = isEdit ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "שגיאה");
      }

      router.push("/dashboard/sessions");
      router.refresh();
    } catch (err) {
      setErrors({ _global: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  const coachOptions = coaches.map((c) => ({
    value: c.id,
    label: c.user.profile
      ? `${c.user.profile.firstName} ${c.user.profile.lastName}`
      : c.id,
  }));

  const locationOptions = locations.map((l) => ({ value: l.id, label: l.name }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors._global && (
        <div className="bg-brand-error/10 border border-brand-error/30 rounded-xl px-4 py-3 text-sm text-brand-error">
          {errors._global}
        </div>
      )}

      {/* Title + description */}
      <div className="space-y-4">
        <Input
          label="שם האימון"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          error={errors.title}
          required
          placeholder="פונקציונלי בוקר, HIIT אינטנסיבי..."
        />
        <Textarea
          label="תיאור (אופציונלי)"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="פרטים נוספים על האימון..."
        />
      </div>

      {/* Coach + Capacity row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-white/80 flex items-center gap-1.5 mb-1.5">
            <User className="w-3.5 h-3.5 text-brand-accent" />
            מאמן <span className="text-brand-accent">*</span>
          </label>
          <select
            value={form.coachId}
            onChange={(e) => set("coachId", e.target.value)}
            className={cn(
              "input-base px-3 py-2 text-sm cursor-pointer w-full",
              errors.coachId && "border-brand-error",
            )}
          >
            <option value="">בחר מאמן...</option>
            {coachOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {errors.coachId && <p className="text-xs text-brand-error mt-1">{errors.coachId}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-white/80 flex items-center gap-1.5 mb-1.5">
            <Users className="w-3.5 h-3.5 text-brand-accent" />
            קיבולת מקסימלית
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={form.maxCapacity}
            onChange={(e) => set("maxCapacity", e.target.value)}
            className={cn(
              "input-base px-3 py-2 text-sm w-full",
              errors.maxCapacity && "border-brand-error",
            )}
          />
          {errors.maxCapacity && (
            <p className="text-xs text-brand-error mt-1">{errors.maxCapacity}</p>
          )}
          <p className="text-xs text-brand-text-dim mt-1">ברירת מחדל: 15</p>
        </div>
      </div>

      {/* Date + times */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-white/80 flex items-center gap-1.5 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-brand-accent" />
            תאריך <span className="text-brand-accent">*</span>
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            className={cn(
              "input-base px-3 py-2 text-sm w-full",
              errors.date && "border-brand-error",
            )}
          />
          {errors.date && <p className="text-xs text-brand-error mt-1">{errors.date}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-white/80 flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3.5 h-3.5 text-brand-accent" />
            שעת התחלה
          </label>
          <select
            value={form.startHour}
            onChange={(e) => set("startHour", e.target.value)}
            className="input-base px-3 py-2 text-sm cursor-pointer w-full"
          >
            {HOUR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-white/80 flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3.5 h-3.5 text-brand-text-dim" />
            שעת סיום
          </label>
          <select
            value={form.endHour}
            onChange={(e) => set("endHour", e.target.value)}
            className={cn(
              "input-base px-3 py-2 text-sm cursor-pointer w-full",
              errors.endHour && "border-brand-error",
            )}
          >
            {HOUR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {errors.endHour && <p className="text-xs text-brand-error mt-1">{errors.endHour}</p>}
        </div>
      </div>

      {/* Location */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-white/80 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-brand-accent" />
          מיקום
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setNewLocation(false)}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
              !newLocation
                ? "bg-brand-accent text-black border-brand-accent"
                : "bg-transparent border-brand-border text-brand-text-muted hover:text-white",
            )}
          >
            מיקום קיים
          </button>
          <button
            type="button"
            onClick={() => setNewLocation(true)}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
              newLocation
                ? "bg-brand-accent text-black border-brand-accent"
                : "bg-transparent border-brand-border text-brand-text-muted hover:text-white",
            )}
          >
            + מיקום חדש
          </button>
        </div>

        {!newLocation ? (
          <select
            value={form.locationId}
            onChange={(e) => set("locationId", e.target.value)}
            className="input-base px-3 py-2 text-sm cursor-pointer w-full"
          >
            <option value="">ללא מיקום ספציפי</option>
            {locationOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <Input
            value={form.locationName}
            onChange={(e) => set("locationName", e.target.value)}
            error={errors.locationName}
            placeholder="לדוגמה: אולם ראשי, גג, חדר 2..."
          />
        )}
      </div>

      {/* Notes */}
      <Textarea
        label="הערות פנימיות"
        value={form.notes}
        onChange={(e) => set("notes", e.target.value)}
        placeholder="הערות לצוות (לא מוצגות למתאמנים)..."
      />

      {/* Footer */}
      <div className="flex gap-3 pt-2 border-t border-brand-border">
        <Button type="button" variant="ghost" onClick={() => router.back()} className="flex-1">
          ביטול
        </Button>
        <Button type="submit" loading={loading} className="flex-1">
          {isEdit ? "שמור שינויים" : "צור אימון"}
        </Button>
      </div>
    </form>
  );
}
