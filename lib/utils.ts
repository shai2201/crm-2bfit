import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number | string, currency = "ILS") {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(num);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function getMembershipStatusColor(status: string) {
  const map: Record<string, string> = {
    ACTIVE:    "text-brand-accent bg-brand-accent-glow border-brand-accent/30",
    EXPIRED:   "text-red-400 bg-red-400/10 border-red-400/30",
    FROZEN:    "text-brand-info bg-brand-info/10 border-brand-info/30",
    CANCELLED: "text-brand-text-muted bg-brand-surface border-brand-border",
  };
  return map[status] ?? map.CANCELLED;
}

export function getRoleLabel(role: string) {
  const map: Record<string, string> = {
    ADMIN:   "אדמין",
    COACH:   "מאמן",
    TRAINEE: "מתאמן",
  };
  return map[role] ?? role;
}

export function getFieldTypeLabel(type: string) {
  const map: Record<string, string> = {
    TEXT:    "טקסט",
    NUMBER:  "מספר",
    DATE:    "תאריך",
    BOOLEAN: "כן/לא",
    SELECT:  "בחירה מרשימה",
  };
  return map[type] ?? type;
}
