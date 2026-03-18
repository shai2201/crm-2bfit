"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/dashboard/Header";

// This page needs the trainee list — fetched client-side for simplicity
// (could be a server component with a form component for the select)

export default function NewBookletPage() {
  return (
    <>
      <Header title="חוברת אימון חדשה" subtitle="בחר מתאמן וצור תוכנית אימון אישית" />
      <div className="p-6 max-w-lg">
        <div className="card p-6">
          <NewBookletForm />
        </div>
      </div>
    </>
  );
}

function NewBookletForm() {
  const router  = useRouter();
  const [title,     setTitle]     = useState("");
  const [traineeId, setTraineeId] = useState("");
  const [trainees,  setTrainees]  = useState<{ id: string; label: string }[]>([]);
  const [loaded,    setLoaded]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // Lazy-load trainees on focus
  async function loadTrainees() {
    if (loaded) return;
    try {
      const res  = await fetch("/api/clients?role=TRAINEE&limit=200");
      const json = await res.json();
      const list = (json.clients ?? []).map((c: { id: string; profile?: { firstName: string; lastName: string } | null; email: string }) => ({
        id:    c.id,
        label: c.profile ? `${c.profile.firstName} ${c.profile.lastName}` : c.email,
      }));
      setTrainees(list);
      setLoaded(true);
    } catch {
      // silent fail — user sees empty select
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!traineeId || !title.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/booklets", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ traineeId, title: title.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "שגיאה");
      router.push(`/dashboard/booklets/${json.booklet.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-brand-text-muted mb-1.5">
          מתאמן <span className="text-brand-error">*</span>
        </label>
        <select
          value={traineeId}
          onChange={(e) => setTraineeId(e.target.value)}
          onFocus={loadTrainees}
          required
          className="w-full bg-brand-elevated border border-brand-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
        >
          <option value="">— בחר מתאמן —</option>
          {trainees.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text-muted mb-1.5">
          שם החוברת <span className="text-brand-error">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="לדוגמה: תוכנית כוח — מחזור 1"
          required
          className="w-full bg-brand-elevated border border-brand-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-brand-text-dim focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
        />
      </div>

      {error && (
        <p className="text-sm text-brand-error bg-brand-error/10 rounded-xl px-3 py-2">{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-brand-border text-brand-text-muted hover:text-white hover:border-brand-accent/40 transition-colors"
        >
          ביטול
        </button>
        <button
          type="submit"
          disabled={loading || !traineeId || !title.trim()}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-brand-accent text-black hover:bg-brand-accent-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "יוצר..." : "צור חוברת"}
        </button>
      </div>
    </form>
  );
}
