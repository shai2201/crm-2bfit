import { Header } from "@/components/dashboard/Header";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { BookOpen, Plus, User } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

async function getBooklets() {
  return prisma.workoutBooklet.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      trainee: {
        include: { profile: true },
      },
      days: {
        include: { _count: { select: { exercises: true } } },
      },
    },
  });
}

export default async function BookletsPage() {
  const booklets = await getBooklets();

  const active   = booklets.filter((b) => b.isActive);
  const inactive = booklets.filter((b) => !b.isActive);

  function traineeName(b: (typeof booklets)[0]) {
    const p = b.trainee.profile;
    return p ? `${p.firstName} ${p.lastName}` : b.trainee.email;
  }

  function exerciseCount(b: (typeof booklets)[0]) {
    return b.days.reduce((sum, d) => sum + d._count.exercises, 0);
  }

  return (
    <>
      <Header
        title="חוברות אימון"
        subtitle={`${active.length} פעילות · ${inactive.length} לא פעילות`}
        action={{ label: "חוברת חדשה", href: "/dashboard/booklets/new" }}
      />

      <div className="p-6 space-y-8">
        {booklets.length === 0 && (
          <div className="card p-12 flex flex-col items-center justify-center gap-4 text-center">
            <div className="p-4 bg-brand-elevated rounded-2xl">
              <BookOpen className="w-8 h-8 text-brand-text-dim" />
            </div>
            <div>
              <p className="font-semibold text-white mb-1">אין חוברות אימון עדיין</p>
              <p className="text-sm text-brand-text-muted">צור חוברת אימון אישית לכל מתאמן</p>
            </div>
            <Link
              href="/dashboard/booklets/new"
              className="flex items-center gap-2 bg-brand-accent text-black font-semibold text-sm px-4 py-2 rounded-xl hover:bg-brand-accent-dim transition-colors"
            >
              <Plus className="w-4 h-4" /> חוברת חדשה
            </Link>
          </div>
        )}

        {/* Active booklets */}
        {active.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-text-dim mb-3">
              פעילות ({active.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {active.map((b) => (
                <BookletCard
                  key={b.id}
                  id={b.id}
                  title={b.title}
                  traineeName={traineeName(b)}
                  daysCount={b.days.length}
                  exercisesCount={exerciseCount(b)}
                  createdAt={b.createdAt.toISOString()}
                  isActive
                />
              ))}
            </div>
          </section>
        )}

        {/* Inactive booklets */}
        {inactive.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-text-dim mb-3">
              לא פעילות ({inactive.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {inactive.map((b) => (
                <BookletCard
                  key={b.id}
                  id={b.id}
                  title={b.title}
                  traineeName={traineeName(b)}
                  daysCount={b.days.length}
                  exercisesCount={exerciseCount(b)}
                  createdAt={b.createdAt.toISOString()}
                  isActive={false}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function BookletCard({
  id, title, traineeName, daysCount, exercisesCount, createdAt, isActive,
}: {
  id:             string;
  title:          string;
  traineeName:    string;
  daysCount:      number;
  exercisesCount: number;
  createdAt:      string;
  isActive:       boolean;
}) {
  return (
    <Link
      href={`/dashboard/booklets/${id}`}
      className={cn(
        "card p-5 block hover:border-brand-accent/30 transition-all group",
        isActive && "border-brand-accent/20",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="p-2 bg-brand-elevated rounded-xl group-hover:bg-brand-accent/10 transition-colors">
          <BookOpen className={cn("w-4 h-4", isActive ? "text-brand-accent" : "text-brand-text-dim")} />
        </div>
        {isActive && (
          <span className="text-[10px] font-semibold bg-brand-accent/10 text-brand-accent px-2 py-0.5 rounded-full">
            פעיל
          </span>
        )}
      </div>

      <h3 className="font-semibold text-white mb-1 line-clamp-1">{title}</h3>

      <div className="flex items-center gap-1.5 text-xs text-brand-text-muted mb-3">
        <User className="w-3 h-3" />
        <span>{traineeName}</span>
      </div>

      <div className="flex items-center gap-3 text-xs text-brand-text-dim border-t border-brand-border pt-3">
        <span>{daysCount} ימים</span>
        <span>·</span>
        <span>{exercisesCount} תרגילים</span>
        <span className="mr-auto">{formatDate(new Date(createdAt))}</span>
      </div>
    </Link>
  );
}
