"use client";

import { useState } from "react";
import { Loader2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckoutButtonProps {
  productId: string;
  userId:    string;
  label?:    string;
  className?: string;
}

export function CheckoutButton({
  productId,
  userId,
  label = "רכוש עכשיו",
  className,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ productId, userId }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error ?? "שגיאה ביצירת סליקה");
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className={cn(
          "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
          "bg-brand-accent text-black hover:bg-brand-accent-dim shadow-accent-sm active:scale-95",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className,
        )}
      >
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <CreditCard className="w-4 h-4" />
        }
        {loading ? "מעביר לסליקה..." : label}
      </button>
      {error && (
        <p className="mt-1.5 text-xs text-brand-error">{error}</p>
      )}
    </div>
  );
}
