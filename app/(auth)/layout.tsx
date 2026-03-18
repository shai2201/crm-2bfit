export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      {/* Background glow */}
      <div
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, #00FF8740, transparent)",
        }}
      />
      <div className="w-full max-w-md relative z-10">{children}</div>
    </div>
  );
}
