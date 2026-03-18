"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("callbackUrl") ?? "/";

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("אימייל או סיסמה שגויים. נסה שוב.");
      setLoading(false);
      return;
    }

    // Navigate — middleware will route TRAINEE → /portal, ADMIN → /dashboard
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="card p-8 shadow-2xl">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-brand-accent flex items-center justify-center shadow-accent-sm mb-4">
          <span className="text-black font-black text-xl">2B</span>
        </div>
        <h1 className="text-2xl font-bold text-white">ברוכים הבאים</h1>
        <p className="text-sm text-brand-text-muted mt-1">התחבר לחשבון 2Bfit שלך</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">
            כתובת אימייל
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full bg-brand-elevated border border-brand-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-brand-text-dim focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-brand-text-muted mb-1.5">
            סיסמה
          </label>
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full bg-brand-elevated border border-brand-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-brand-text-dim focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-colors pr-10"
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
          disabled={loading || !email || !password}
          className={cn(
            "w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 mt-2",
            "bg-brand-accent text-black hover:bg-brand-accent-dim shadow-accent-sm active:scale-[0.98]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
          )}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "מתחבר..." : "כניסה"}
        </button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-brand-border" />
        <span className="text-xs text-brand-text-dim">אין לך חשבון?</span>
        <div className="flex-1 h-px bg-brand-border" />
      </div>

      <Link
        href="/register"
        className="block w-full py-2.5 rounded-xl text-sm font-semibold text-center border border-brand-border text-brand-text-muted hover:text-white hover:border-brand-accent/40 transition-colors"
      >
        הרשמה כמתאמן חדש
      </Link>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
