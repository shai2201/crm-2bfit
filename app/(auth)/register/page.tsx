"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName:  "",
    email:     "",
    password:  "",
    phone:     "",
  });
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (form.password.length < 8) {
      setError("הסיסמה חייבת להיות לפחות 8 תווים");
      setLoading(false);
      return;
    }

    try {
      const res  = await fetch("/api/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "שגיאה");

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="card p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-accent/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-brand-accent" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">נרשמת בהצלחה!</h2>
        <p className="text-sm text-brand-text-muted">מעביר אותך לדף הכניסה...</p>
      </div>
    );
  }

  return (
    <div className="card p-8 shadow-2xl">
      {/* Logo */}
      <div className="flex flex-col items-center mb-7">
        <div className="w-14 h-14 rounded-2xl bg-brand-accent flex items-center justify-center shadow-accent-sm mb-4">
          <span className="text-black font-black text-xl">2B</span>
        </div>
        <h1 className="text-2xl font-bold text-white">הצטרף ל-2Bfit</h1>
        <p className="text-sm text-brand-text-muted mt-1">צור חשבון מתאמן חדש</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-brand-text-muted mb-1.5">שם פרטי</label>
            <input
              type="text"
              value={form.firstName}
              onChange={update("firstName")}
              required
              placeholder="ישראל"
              className="w-full bg-brand-elevated border border-brand-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-brand-text-dim focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-text-muted mb-1.5">שם משפחה</label>
            <input
              type="text"
              value={form.lastName}
              onChange={update("lastName")}
              required
              placeholder="ישראלי"
              className="w-full bg-brand-elevated border border-brand-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-brand-text-dim focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-medium text-brand-text-muted mb-1.5">כתובת אימייל</label>
          <input
            type="email"
            value={form.email}
            onChange={update("email")}
            required
            placeholder="you@example.com"
            className="w-full bg-brand-elevated border border-brand-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-brand-text-dim focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
          />
        </div>

        {/* Phone (optional) */}
        <div>
          <label className="block text-xs font-medium text-brand-text-muted mb-1.5">
            טלפון <span className="text-brand-text-dim">(אופציונלי)</span>
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={update("phone")}
            placeholder="050-0000000"
            className="w-full bg-brand-elevated border border-brand-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-brand-text-dim focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-medium text-brand-text-muted mb-1.5">
            סיסמה <span className="text-brand-text-dim">(לפחות 8 תווים)</span>
          </label>
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              value={form.password}
              onChange={update("password")}
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full bg-brand-elevated border border-brand-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-brand-text-dim focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors pr-10"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPwd((v) => !v)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-dim hover:text-white"
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {/* Strength indicator */}
          <div className="mt-1.5 flex gap-1">
            {[8, 10, 14].map((threshold) => (
              <div
                key={threshold}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  form.password.length >= threshold
                    ? threshold === 14 ? "bg-brand-accent"
                      : threshold === 10 ? "bg-brand-warning"
                      : "bg-brand-error"
                    : "bg-brand-border",
                )}
              />
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-brand-error/10 border border-brand-error/30 rounded-xl px-4 py-2.5 text-sm text-brand-error">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 mt-1",
            "bg-brand-accent text-black hover:bg-brand-accent-dim shadow-accent-sm active:scale-[0.98]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "נרשם..." : "הרשמה"}
        </button>
      </form>

      <p className="text-center text-xs text-brand-text-dim mt-5">
        כבר יש לך חשבון?{" "}
        <Link href="/login" className="text-brand-accent hover:underline font-medium">
          כניסה
        </Link>
      </p>
    </div>
  );
}
