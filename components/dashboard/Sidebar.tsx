"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Calendar,
  CalendarDays,
  ShoppingBag,
  Settings,
  Sliders,
  Apple,
  BookOpen,
  LogOut,
  ChevronLeft,
  BarChart3,
  Salad,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label:    string;
  href:     string;
  icon:     React.ElementType;
  badge?:   string;
  children?: { label: string; href: string }[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "לוח בקרה",
    href:  "/dashboard",
    icon:  LayoutDashboard,
  },
  {
    label: "לקוחות",
    href:  "/dashboard/clients",
    icon:  Users,
  },
  {
    label: "מאמנים",
    href:  "/dashboard/coaches",
    icon:  Dumbbell,
  },
  {
    label: "לוח שיעורים",
    href:  "/dashboard/sessions",
    icon:  Calendar,
  },
  {
    label: "יומן שלי",
    href:  "/dashboard/schedule",
    icon:  CalendarDays,
  },
  {
    label: "חוברות אימון",
    href:  "/dashboard/booklets",
    icon:  BookOpen,
  },
  {
    label: "חוברת שלי",
    href:  "/dashboard/my-booklet",
    icon:  Apple,
  },
  {
    label: "תזונה AI",
    href:  "/dashboard/my-nutrition",
    icon:  Salad,
  },
  {
    label: "מוצרים ותמחור",
    href:  "/dashboard/products",
    icon:  ShoppingBag,
  },
  {
    label: "דוח עסקי",
    href:  "/dashboard/analytics",
    icon:  BarChart3,
  },
];

const SETTINGS_ITEMS: NavItem[] = [
  {
    label: "שדות מותאמים",
    href:  "/dashboard/settings/custom-fields",
    icon:  Sliders,
  },
  {
    label: "הגדרות מערכת",
    href:  "/dashboard/settings",
    icon:  Settings,
  },
];

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
        "group relative",
        isActive
          ? "bg-brand-accent-glow text-brand-accent border border-brand-accent/20"
          : "text-brand-text-muted hover:text-white hover:bg-brand-elevated",
        collapsed && "justify-center px-2",
      )}
    >
      <Icon
        className={cn(
          "w-5 h-5 flex-shrink-0 transition-colors",
          isActive ? "text-brand-accent" : "text-brand-text-dim group-hover:text-white",
        )}
      />
      {!collapsed && <span>{item.label}</span>}
      {!collapsed && item.badge && (
        <span className="ml-auto bg-brand-accent text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
          {item.badge}
        </span>
      )}
      {/* Active indicator */}
      {isActive && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-accent rounded-l-full" />
      )}
    </Link>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-brand-surface border-l border-brand-border",
        "transition-all duration-300 flex-shrink-0",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-brand-border",
        collapsed && "justify-center px-2",
      )}>
        <div className="w-9 h-9 rounded-xl bg-brand-accent flex items-center justify-center flex-shrink-0 shadow-accent-sm">
          <span className="text-black font-black text-sm">2B</span>
        </div>
        {!collapsed && (
          <div>
            <p className="text-white font-bold text-base leading-tight">2Bfit</p>
            <p className="text-brand-text-dim text-xs">מערכת ניהול</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] font-semibold uppercase text-brand-text-dim tracking-widest px-3 mb-2">
            ניהול ראשי
          </p>
        )}
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} />
        ))}

        <div className="pt-4">
          {!collapsed && (
            <p className="text-[10px] font-semibold uppercase text-brand-text-dim tracking-widest px-3 mb-2">
              הגדרות
            </p>
          )}
          {SETTINGS_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} />
          ))}
        </div>
      </nav>

      {/* Bottom: User + collapse */}
      <div className="border-t border-brand-border p-3 space-y-2">
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm",
            "text-brand-text-muted hover:text-white hover:bg-brand-elevated transition-colors",
            collapsed && "justify-center",
          )}
        >
          <ChevronLeft
            className={cn(
              "w-4 h-4 transition-transform duration-300",
              collapsed && "rotate-180",
            )}
          />
          {!collapsed && <span>צמצם תפריט</span>}
        </button>

        {/* User */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl",
          collapsed && "justify-center",
        )}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-accent to-brand-info flex items-center justify-center flex-shrink-0">
            <span className="text-black text-xs font-bold">A</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">אדמין</p>
              <p className="text-brand-text-dim text-xs truncate">admin@2bfit.co.il</p>
            </div>
          )}
          {!collapsed && (
            <button className="text-brand-text-dim hover:text-brand-error transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
