"use client";

import { Bell, Search, Plus } from "lucide-react";
import Link from "next/link";

interface HeaderProps {
  title:       string;
  subtitle?:   string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-brand-border bg-brand-surface/60 backdrop-blur-sm sticky top-0 z-10">
      {/* Left: title */}
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-brand-text-muted mt-0.5">{subtitle}</p>}
      </div>

      {/* Right: search + notifications + action */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-brand-elevated border border-brand-border rounded-xl px-3 py-2 w-56">
          <Search className="w-4 h-4 text-brand-text-dim flex-shrink-0" />
          <input
            type="text"
            placeholder="חיפוש מהיר..."
            className="bg-transparent text-sm text-white placeholder-brand-text-dim outline-none w-full"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl text-brand-text-muted hover:text-white hover:bg-brand-elevated transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-accent rounded-full" />
        </button>

        {/* CTA */}
        {action && (
          action.href ? (
            <Link
              href={action.href}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-accent text-black text-sm font-semibold rounded-xl hover:bg-brand-accent-dim shadow-accent-sm hover:shadow-accent-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-accent text-black text-sm font-semibold rounded-xl hover:bg-brand-accent-dim shadow-accent-sm hover:shadow-accent-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              {action.label}
            </button>
          )
        )}
      </div>
    </header>
  );
}
