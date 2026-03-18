import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Home, Dumbbell, CalendarDays, Salad, LogOut } from "lucide-react";
import { signOut } from "@/auth";

// Bottom tab bar for mobile, left rail for desktop (RTL: right side)

const TABS = [
  { href: "/portal",           label: "ראשי",     Icon: Home        },
  { href: "/dashboard/my-booklet", label: "אימונים", Icon: Dumbbell    },
  { href: "/dashboard/schedule",   label: "לוח",     Icon: CalendarDays },
  { href: "/dashboard/my-nutrition", label: "תזונה", Icon: Salad       },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const userName  = session.user?.name  ?? "מתאמן";
  const userEmail = session.user?.email ?? "";
  const initial   = userName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      {/* ── Top header (mobile only shown, desktop has sidebar) ── */}
      <header className="sticky top-0 z-40 bg-brand-surface border-b border-brand-border px-4 py-3 flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-accent flex items-center justify-center">
            <span className="text-black font-black text-xs">2B</span>
          </div>
          <span className="text-white font-bold text-sm">2Bfit</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-accent to-brand-info flex items-center justify-center">
            <span className="text-black text-xs font-bold">{initial}</span>
          </div>
          <span className="text-white text-sm font-medium hidden sm:block">{userName}</span>
        </div>
      </header>

      <div className="flex flex-1">
        {/* ── Desktop sidebar (right side — RTL) ── */}
        <aside className="hidden lg:flex flex-col w-64 bg-brand-surface border-l border-brand-border h-screen sticky top-0">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-brand-border">
            <div className="w-10 h-10 rounded-xl bg-brand-accent flex items-center justify-center shadow-accent-sm">
              <span className="text-black font-black">2B</span>
            </div>
            <div>
              <p className="text-white font-bold">2Bfit</p>
              <p className="text-brand-text-dim text-xs">אזור אישי</p>
            </div>
          </div>

          {/* User info */}
          <div className="px-4 py-4 border-b border-brand-border">
            <div className="flex items-center gap-3 bg-brand-elevated rounded-xl px-3 py-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-accent to-brand-info flex items-center justify-center flex-shrink-0">
                <span className="text-black text-sm font-bold">{initial}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{userName}</p>
                <p className="text-brand-text-dim text-xs truncate">{userEmail}</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {TABS.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-brand-text-muted hover:text-white hover:bg-brand-elevated transition-colors group"
              >
                <Icon className="w-5 h-5 text-brand-text-dim group-hover:text-brand-accent transition-colors" />
                {label}
              </Link>
            ))}
          </nav>

          {/* Sign out */}
          <div className="p-3 border-t border-brand-border">
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-brand-text-muted hover:text-brand-error hover:bg-brand-error/10 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                יציאה
              </button>
            </form>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 pb-20 lg:pb-6 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-brand-surface border-t border-brand-border">
        <div className="grid grid-cols-4 h-16">
          {TABS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-1 text-brand-text-dim hover:text-brand-accent transition-colors active:scale-95"
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
