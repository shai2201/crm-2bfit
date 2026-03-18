import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title:      string;
  value:      string | number;
  subtitle?:  string;
  icon:       LucideIcon;
  trend?:     { value: string; up: boolean };
  accent?:    boolean;
}

export function StatsCard({ title, value, subtitle, icon: Icon, trend, accent }: StatsCardProps) {
  return (
    <div
      className={cn(
        "card p-5 flex flex-col gap-4",
        accent && "border-brand-accent/30 bg-brand-accent-glow",
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-brand-text-muted font-medium">{title}</p>
          <p className={cn(
            "text-3xl font-bold mt-1",
            accent ? "text-brand-accent" : "text-white",
          )}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-brand-text-dim mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "p-2.5 rounded-xl",
          accent ? "bg-brand-accent/20" : "bg-brand-elevated",
        )}>
          <Icon className={cn("w-5 h-5", accent ? "text-brand-accent" : "text-brand-text-muted")} />
        </div>
      </div>

      {trend && (
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "text-xs font-semibold",
            trend.up ? "text-brand-accent" : "text-brand-error",
          )}>
            {trend.up ? "↑" : "↓"} {trend.value}
          </span>
          <span className="text-xs text-brand-text-dim">מהחודש שעבר</span>
        </div>
      )}
    </div>
  );
}
