import { cn } from "@/lib/utils";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-brand-border">
      <table className={cn("w-full text-sm", className)}>{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-brand-border bg-brand-elevated">
      {children}
    </thead>
  );
}

export function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-right text-xs font-semibold text-brand-text-muted uppercase tracking-wider",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-brand-border">{children}</tbody>;
}

export function Tr({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "bg-brand-surface hover:bg-brand-elevated transition-colors",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("px-4 py-3 text-white/80", className)}>{children}</td>
  );
}

export function EmptyRow({ colSpan, message = "אין נתונים להצגה" }: { colSpan: number; message?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-brand-text-muted text-sm">
        {message}
      </td>
    </tr>
  );
}
