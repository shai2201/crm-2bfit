import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "accent" | "error" | "warning" | "info" | "neutral";
  className?: string;
}

const variants = {
  accent:  "bg-brand-accent/15 text-brand-accent border-brand-accent/30",
  error:   "bg-brand-error/15 text-brand-error border-brand-error/30",
  warning: "bg-brand-warning/15 text-brand-warning border-brand-warning/30",
  info:    "bg-brand-info/15 text-brand-info border-brand-info/30",
  neutral: "bg-brand-elevated text-brand-text-muted border-brand-border",
};

export function Badge({ children, variant = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
    ACTIVE:    { label: "פעיל",     variant: "accent"  },
    EXPIRED:   { label: "פג תוקף", variant: "error"   },
    FROZEN:    { label: "מוקפא",    variant: "info"    },
    CANCELLED: { label: "בוטל",     variant: "neutral" },
    PENDING:   { label: "ממתין",    variant: "warning" },
    PAID:      { label: "שולם",     variant: "accent"  },
    FAILED:    { label: "נכשל",     variant: "error"   },
  };
  const { label, variant } = map[status] ?? { label: status, variant: "neutral" };
  return <Badge variant={variant}>{label}</Badge>;
}
