import { Header } from "@/components/dashboard/Header";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate, formatPrice } from "@/lib/utils";
import { Users, Dumbbell, Calendar, TrendingUp, CreditCard, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";

// Fetch dashboard stats from DB
async function getDashboardStats() {
  const [totalClients, activeMembers, scheduledSessions, totalRevenue, recentClients] =
    await Promise.all([
      prisma.user.count({ where: { role: "TRAINEE" } }),
      prisma.membership.count({ where: { status: "ACTIVE" } }),
      prisma.session.count({ where: { status: "SCHEDULED" } }),
      prisma.payment.aggregate({
        where: { status: "PAID" },
        _sum: { amount: true },
      }),
      prisma.user.findMany({
        where: { role: "TRAINEE" },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          profile: true,
          memberships: {
            take: 1,
            orderBy: { createdAt: "desc" },
            include: { plan: true },
          },
        },
      }),
    ]);

  return {
    totalClients,
    activeMembers,
    scheduledSessions,
    totalRevenue: totalRevenue._sum.amount ?? 0,
    recentClients,
  };
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <>
      <Header
        title="לוח בקרה"
        subtitle={`שלום! יש לך ${stats.scheduledSessions} שיעורים מתוכננים השבוע`}
      />
      <div className="p-6 space-y-8">

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard
            title="סה״כ לקוחות"
            value={stats.totalClients}
            icon={Users}
            trend={{ value: "12%", up: true }}
            accent
          />
          <StatsCard
            title="מנויים פעילים"
            value={stats.activeMembers}
            icon={CreditCard}
            trend={{ value: "5%", up: true }}
          />
          <StatsCard
            title="שיעורים מתוכננים"
            value={stats.scheduledSessions}
            icon={Calendar}
            subtitle="השבוע"
          />
          <StatsCard
            title="הכנסות (כל הזמן)"
            value={formatPrice(Number(stats.totalRevenue))}
            icon={TrendingUp}
            trend={{ value: "8%", up: true }}
          />
        </div>

        {/* Recent clients */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-brand-border">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-accent" />
              <h2 className="font-semibold text-white">לקוחות חדשים לאחרונה</h2>
            </div>
            <a
              href="/dashboard/clients"
              className="text-sm text-brand-accent hover:text-brand-accent-dim transition-colors"
            >
              כל הלקוחות →
            </a>
          </div>

          <div className="divide-y divide-brand-border">
            {stats.recentClients.length === 0 ? (
              <div className="p-8 text-center text-brand-text-muted text-sm">
                אין לקוחות עדיין
              </div>
            ) : (
              stats.recentClients.map((client) => {
                const membership = client.memberships[0];
                return (
                  <div
                    key={client.id}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-brand-elevated transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-accent/30 to-brand-info/30 border border-brand-border flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-white">
                          {client.profile?.firstName?.[0] ?? client.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {client.profile
                            ? `${client.profile.firstName} ${client.profile.lastName}`
                            : client.email}
                        </p>
                        <p className="text-xs text-brand-text-muted">{client.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-brand-text-dim hidden sm:block">
                        {formatDate(client.createdAt)}
                      </span>
                      {membership ? (
                        <StatusBadge status={membership.status} />
                      ) : (
                        <span className="text-xs text-brand-text-dim">ללא מנוי</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "הוסף לקוח", href: "/dashboard/clients/new",                  icon: Users,    desc: "רישום מתאמן חדש" },
            { label: "לוח שיעורים",   href: "/dashboard/sessions",              icon: Calendar, desc: "תכנון שיעורים" },
            { label: "הגדרות שדות",  href: "/dashboard/settings/custom-fields", icon: Dumbbell, desc: "שדות מותאמים אישית" },
          ].map((q) => (
            <a
              key={q.href}
              href={q.href}
              className="card p-5 flex items-center gap-4 hover:border-brand-accent/40 hover:bg-brand-elevated transition-all group"
            >
              <div className="p-2.5 rounded-xl bg-brand-elevated group-hover:bg-brand-accent/10 transition-colors">
                <q.icon className="w-5 h-5 text-brand-text-muted group-hover:text-brand-accent transition-colors" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{q.label}</p>
                <p className="text-xs text-brand-text-muted">{q.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
