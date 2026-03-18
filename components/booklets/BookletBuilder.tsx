"use client";

import { useState, useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  Plus, Trash2, GripVertical, Video, ChevronDown, ChevronUp,
  Save, ExternalLink, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExerciseData {
  id:       string;
  name:     string;
  sets:     number | null;
  reps:     string | null;
  weight:   string | null;
  restTime: string | null;
  videoUrl: string | null;
  notes:    string | null;
  order:    number;
}

export interface DayData {
  id:        string;
  dayNumber: number;
  name:      string | null;
  notes:     string | null;
  exercises: ExerciseData[];
}

export interface BookletData {
  id:          string;
  title:       string;
  description: string | null;
  trainee: { profile: { firstName: string; lastName: string } | null };
  days:    DayData[];
}

interface BookletBuilderProps { booklet: BookletData }

// ─── Empty exercise form ─────────────────────────────────────────────────────

const EMPTY_EX = {
  name: "", sets: "", reps: "", weight: "", restTime: "", videoUrl: "", notes: "",
};

// ─── YouTube embed parser ────────────────────────────────────────────────────

function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&\s?]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

// ─── Single exercise row ─────────────────────────────────────────────────────

function ExerciseRow({
  exercise,
  bookletId,
  dayId,
  onSaved,
  onDeleted,
}: {
  exercise:  ExerciseData;
  bookletId: string;
  dayId:     string;
  onSaved:   (ex: ExerciseData) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [form, setForm] = useState({
    name:     exercise.name,
    sets:     exercise.sets?.toString() ?? "",
    reps:     exercise.reps     ?? "",
    weight:   exercise.weight   ?? "",
    restTime: exercise.restTime ?? "",
    videoUrl: exercise.videoUrl ?? "",
    notes:    exercise.notes    ?? "",
  });

  function set(k: keyof typeof form, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/booklets/${bookletId}/days/${dayId}/exercises?exerciseId=${exercise.id}`,
        {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name:     form.name,
            sets:     form.sets ? parseInt(form.sets) : null,
            reps:     form.reps     || null,
            weight:   form.weight   || null,
            restTime: form.restTime || null,
            videoUrl: form.videoUrl || null,
            notes:    form.notes    || null,
          }),
        },
      );
      if (res.ok) {
        const { data } = await res.json();
        onSaved(data);
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`למחוק את "${exercise.name}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/booklets/${bookletId}/days/${dayId}/exercises?exerciseId=${exercise.id}`,
        { method: "DELETE" },
      );
      if (res.ok) onDeleted(exercise.id);
    } finally {
      setDeleting(false);
    }
  }

  const embedUrl = getEmbedUrl(form.videoUrl);

  return (
    <div className={cn(
      "border border-brand-border rounded-xl bg-brand-elevated transition-all",
      editing && "border-brand-accent/40",
    )}>
      {/* Collapsed header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => !editing && setEditing(true)}
      >
        <GripVertical className="w-4 h-4 text-brand-text-dim flex-shrink-0 cursor-grab" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{exercise.name}</p>
          <p className="text-xs text-brand-text-dim mt-0.5">
            {[
              exercise.sets ? `${exercise.sets} סטים` : null,
              exercise.reps ? `× ${exercise.reps}` : null,
              exercise.weight ? `@ ${exercise.weight}` : null,
              exercise.restTime ? `מנוחה: ${exercise.restTime}` : null,
            ]
              .filter(Boolean)
              .join("  ·  ") || "לחץ לעריכה"}
          </p>
        </div>

        {exercise.videoUrl && (
          <Video className="w-4 h-4 text-brand-info flex-shrink-0" />
        )}

        <div className="flex items-center gap-1">
          {saved && <Check className="w-4 h-4 text-brand-accent" />}
          {editing ? (
            <ChevronUp className="w-4 h-4 text-brand-text-dim" />
          ) : (
            <ChevronDown className="w-4 h-4 text-brand-text-dim" />
          )}
        </div>
      </div>

      {/* Expanded editor */}
      {editing && (
        <div className="px-4 pb-4 space-y-4 border-t border-brand-border animate-fade-in">
          <div className="pt-3">
            <Input
              label="שם התרגיל"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              placeholder="סקוואט, לחיצת חזה,..."
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="סטים"
              type="number"
              min="1"
              value={form.sets}
              onChange={(e) => set("sets", e.target.value)}
              placeholder="3"
            />
            <Input
              label="חזרות"
              value={form.reps}
              onChange={(e) => set("reps", e.target.value)}
              placeholder="10 / 8-12"
            />
            <Input
              label="משקל יעד"
              value={form.weight}
              onChange={(e) => set("weight", e.target.value)}
              placeholder="60kg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="זמן מנוחה"
              value={form.restTime}
              onChange={(e) => set("restTime", e.target.value)}
              placeholder="90 שניות"
            />
            <div>
              <Input
                label="קישור לסרטון"
                type="url"
                value={form.videoUrl}
                onChange={(e) => set("videoUrl", e.target.value)}
                placeholder="YouTube / Vimeo URL"
              />
            </div>
          </div>

          {/* Video preview */}
          {embedUrl && (
            <div className="rounded-xl overflow-hidden aspect-video bg-black">
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          <Textarea
            label="הוראות / הערות למתאמן"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="טיפים לביצוע, נקודות בטיחות..."
          />

          <div className="flex gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
            >
              ביטול
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              loading={deleting}
            >
              <Trash2 className="w-3.5 h-3.5" />
              מחק
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              loading={saving}
              className="flex-1"
            >
              <Save className="w-3.5 h-3.5" />
              שמור
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Day Section ──────────────────────────────────────────────────────────────

function DaySection({
  day,
  bookletId,
  onDayDeleted,
}: {
  day:          DayData;
  bookletId:    string;
  onDayDeleted: (id: string) => void;
}) {
  const [exercises, setExercises] = useState<ExerciseData[]>(day.exercises);
  const [addingEx,  setAddingEx]  = useState(false);
  const [addForm,   setAddForm]   = useState(EMPTY_EX);
  const [saving,    setSaving]    = useState(false);
  const [open,      setOpen]      = useState(true);

  function setF(k: keyof typeof addForm, v: string) {
    setAddForm((p) => ({ ...p, [k]: v }));
  }

  async function addExercise() {
    if (!addForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/booklets/${bookletId}/days/${day.id}/exercises`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name:     addForm.name,
            sets:     addForm.sets ? parseInt(addForm.sets) : null,
            reps:     addForm.reps     || null,
            weight:   addForm.weight   || null,
            restTime: addForm.restTime || null,
            videoUrl: addForm.videoUrl || null,
            notes:    addForm.notes    || null,
            order:    exercises.length,
          }),
        },
      );
      if (res.ok) {
        const { data } = await res.json();
        setExercises((prev) => [...prev, data]);
        setAddForm(EMPTY_EX);
        setAddingEx(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteDay() {
    if (!confirm(`למחוק את "${day.name ?? `יום ${day.dayNumber}`}" וכל תרגיליו?`)) return;
    const res = await fetch(
      `/api/booklets/${bookletId}/days?dayId=${day.id}`,
      { method: "DELETE" },
    );
    if (res.ok) onDayDeleted(day.id);
  }

  return (
    <div className="card overflow-hidden">
      {/* Day header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-brand-elevated transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center flex-shrink-0">
            <span className="text-brand-accent font-bold text-sm">
              {String.fromCharCode(64 + day.dayNumber)}
            </span>
          </div>
          <div>
            <p className="font-semibold text-white text-sm">{day.name ?? `יום ${day.dayNumber}`}</p>
            <p className="text-xs text-brand-text-dim">{exercises.length} תרגילים</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); deleteDay(); }}
            className="p-1.5 rounded-lg text-brand-text-dim hover:text-brand-error hover:bg-brand-surface transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {open ? (
            <ChevronUp className="w-4 h-4 text-brand-text-dim" />
          ) : (
            <ChevronDown className="w-4 h-4 text-brand-text-dim" />
          )}
        </div>
      </div>

      {/* Exercise list */}
      {open && (
        <div className="px-5 pb-5 space-y-2 animate-fade-in">
          {exercises.map((ex) => (
            <ExerciseRow
              key={ex.id}
              exercise={ex}
              bookletId={bookletId}
              dayId={day.id}
              onSaved={(updated) =>
                setExercises((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
              }
              onDeleted={(id) => setExercises((prev) => prev.filter((e) => e.id !== id))}
            />
          ))}

          {/* Add exercise */}
          {!addingEx ? (
            <button
              onClick={() => setAddingEx(true)}
              className="w-full py-2.5 rounded-xl border border-dashed border-brand-border text-sm text-brand-text-muted hover:border-brand-accent hover:text-brand-accent transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              הוסף תרגיל
            </button>
          ) : (
            <div className="border border-brand-accent/30 rounded-xl p-4 space-y-3 bg-brand-accent/5 animate-slide-in">
              <p className="text-sm font-semibold text-brand-accent">תרגיל חדש</p>

              <Input
                placeholder="שם התרגיל *"
                value={addForm.name}
                onChange={(e) => setF("name", e.target.value)}
                required
                autoFocus
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  placeholder="סטים"
                  value={addForm.sets}
                  onChange={(e) => setF("sets", e.target.value)}
                />
                <Input
                  placeholder="חזרות"
                  value={addForm.reps}
                  onChange={(e) => setF("reps", e.target.value)}
                />
                <Input
                  placeholder="משקל"
                  value={addForm.weight}
                  onChange={(e) => setF("weight", e.target.value)}
                />
              </div>
              <Input
                type="url"
                placeholder="קישור לסרטון (YouTube / Vimeo)"
                value={addForm.videoUrl}
                onChange={(e) => setF("videoUrl", e.target.value)}
              />
              <Textarea
                placeholder="הוראות למתאמן..."
                value={addForm.notes}
                onChange={(e) => setF("notes", e.target.value)}
              />

              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAddingEx(false)}>
                  ביטול
                </Button>
                <Button size="sm" loading={saving} onClick={addExercise} className="flex-1">
                  <Plus className="w-3.5 h-3.5" />
                  הוסף
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main BookletBuilder ──────────────────────────────────────────────────────

export function BookletBuilder({ booklet }: BookletBuilderProps) {
  const [days,     setDays]     = useState<DayData[]>(booklet.days);
  const [addingDay, setAddingDay] = useState(false);
  const [newDayName, setNewDayName] = useState("");

  const traineeName = booklet.trainee.profile
    ? `${booklet.trainee.profile.firstName} ${booklet.trainee.profile.lastName}`
    : "מתאמן";

  async function addDay() {
    const res = await fetch(`/api/booklets/${booklet.id}/days`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: newDayName || undefined }),
    });
    if (res.ok) {
      const { data } = await res.json();
      setDays((prev) => [...prev, { ...data, exercises: [] }]);
      setNewDayName("");
      setAddingDay(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Info bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-brand-text-muted mb-0.5">תוכנית אימון עבור</p>
          <p className="text-lg font-bold text-white">{traineeName}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-brand-text-dim">
          <span className="bg-brand-elevated border border-brand-border rounded-full px-3 py-1">
            {days.length} ימי אימון
          </span>
          <span className="bg-brand-elevated border border-brand-border rounded-full px-3 py-1">
            {days.reduce((s, d) => s + d.exercises.length, 0)} תרגילים
          </span>
        </div>
      </div>

      {/* Day sections */}
      {days.length === 0 ? (
        <div className="text-center py-16 card">
          <p className="text-brand-text-muted text-sm">לא נוצרו ימי אימון עדיין.</p>
          <p className="text-brand-text-dim text-xs mt-1">לחץ "הוסף יום" כדי להתחיל.</p>
        </div>
      ) : (
        days.map((day) => (
          <DaySection
            key={day.id}
            day={day}
            bookletId={booklet.id}
            onDayDeleted={(id) => setDays((prev) => prev.filter((d) => d.id !== id))}
          />
        ))
      )}

      {/* Add day */}
      {!addingDay ? (
        <button
          onClick={() => setAddingDay(true)}
          className="w-full py-3 rounded-xl border-2 border-dashed border-brand-border text-sm text-brand-text-muted hover:border-brand-accent hover:text-brand-accent transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          הוסף יום אימון
        </button>
      ) : (
        <div className="card p-4 flex gap-2 animate-slide-in">
          <Input
            placeholder={`שם היום (לדוגמה: יום A - דחיפה)`}
            value={newDayName}
            onChange={(e) => setNewDayName(e.target.value)}
            autoFocus
          />
          <Button variant="ghost" onClick={() => setAddingDay(false)}>ביטול</Button>
          <Button onClick={addDay}>הוסף</Button>
        </div>
      )}
    </div>
  );
}
