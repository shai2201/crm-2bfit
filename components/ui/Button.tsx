"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "accent" | "ghost" | "danger" | "secondary";
  size?:    "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

const variants = {
  accent:    "bg-brand-accent text-black font-semibold hover:bg-brand-accent-dim shadow-accent-sm hover:shadow-accent-md",
  ghost:     "bg-transparent border border-brand-border text-brand-text-muted hover:border-brand-accent hover:text-white",
  danger:    "bg-brand-error/10 border border-brand-error/40 text-brand-error hover:bg-brand-error/20",
  secondary: "bg-brand-elevated border border-brand-border text-white hover:border-brand-border-light",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-6 py-3 text-base rounded-xl",
};

export function Button({
  variant = "accent",
  size    = "md",
  loading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium",
        "transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
