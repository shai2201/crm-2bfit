import { notFound } from "next/navigation";
import { Header } from "@/components/dashboard/Header";
import { ExerciseCard, type ExerciseCardData } from "@/components/booklets/ExerciseCard";
import { prisma } from "@/lib/prisma";
import { BookOpen, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// In production replace with: import { auth } from "@/lib/auth"; const session = await auth();
const DEMO_USER_ID = process.env.DEMO_TRAINEE_ID ?? "";

async function getActiveBooklet(userId: string) {
  return prisma.workoutBooklet.findFirst({
    where:   { traineeId: userId, isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      coach: { include: { user: { include: { profile: true } } } },
      days: {
        orderBy: { dayNumber: "asc" },
        include: {
          exercises: {
            orderBy: { order: "asc" },
            include: {
              logs: {
                where:   { userId },
                orderBy: { loggedAt: "desc" },
                take:    5,
              },
            },
          },
        },
      },
    },
  });
}

export default async function MyBookletPage({
  searchParams,
}: {
  searchParams: { day?: string };
}) {
  const booklet = await getActiveBooklet(DEMO_USER_ID);

  if (!booklet || booklet.days.length === 0) {
    return (
      <>
        <Header title="חוברת האימון שלי" subtitle="תוכנית אימון אישית" />
        <div className="p-6 flex flex-col items-center justify-center gap-4 text-center min-h-[40vh]">
          <div className="p-4 bg-brand-elevated rounded-2xl">
            <BookOpen className="w-8 h-8 text-brand-text-dim" />
          </div>
          <div>
            <p className="font-semibold text-white mb-1">אין חוברת אימון פעילה</p>
            <p className="text-sm text-brand-text-muted">
              פנה למאמן שלך להכנת תוכנית אימון אישית
            </p>
          </div>
        </div>
      </>
    );
  }

  const coachName = booklet.coach.user.profile
    ? `${booklet.coach.user.profile.firstName} ${booklet.coach.user.profile.lastName}`
    : "המאמן שלך";

  // Selected day (default: first day)
  const selectedDayNumber = searchParams.day
    ? parseInt(searchParams.day)
    : booklet.days[0]?.dayNumber ?? 1;

  const selectedDay = booklet.days.find((d) => d.dayNumber === selectedDayNumber)
    ?? booklet.days[0];

  // Map exercises to ExerciseCardData
  const exercises: ExerciseCardData[] = selectedDay.exercises.map((ex) => ({
    id:       ex.id,
    name:     ex.name,
    sets:     ex.sets,
    reps:     ex.reps,
    weight:   ex.weight,
    restTime: ex.restTime,
    videoUrl: ex.videoUrl,
    notes:    ex.notes,
    logs: ex.logs.map((l) => ({
      id:       l.id,
      weightKg: l.weightKg,
      reps:     l.reps,
      sets:     l.sets,
      rpe:      l.rpe,
      notes:    l.notes,
      loggedAt: l.loggedAt.toISOString(),
    })),
  }));

  // Day label letter A/B/C...
  const dayLetter = (n: number) =>
    String.fromCharCode(64 + n); // 1→A, 2→B ...

  return (
    <>
      <Header
        title={booklet.title}
        subtitle={`מאמן: ${coachName}`}
      />

      <div className="p-4 sm:p-6 space-y-5">
        {/* Day selector tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {booklet.days.map((day) => (
            <a
              key={day.id}
              href={`/dashboard/my-booklet?day=${day.dayNumber}`}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                day.dayNumber === selectedDay.dayNumber
                  ? "bg-brand-accent text-black shadow-accent-sm"
                  : "bg-brand-elevated text-brand-text-muted hover:text-white border border-brand-border",
              )}
            >
              יום {dayLetter(day.dayNumber)}
              {day.name && day.name !== `יום ${dayLetter(day.dayNumber)}` && (
                <span className="hidden sm:inline mr-1 font-normal opacity-70">
                  · {day.name}
                </span>
              )}
            </a>
          ))}
        </div>

        {/* Day header */}
        <div className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-brand-accent" />
          <h2 className="font-semibold text-white">
            {selectedDay.name ?? `יום ${dayLetter(selectedDay.dayNumber)}`}
          </h2>
          <span className="text-xs text-brand-text-dim">
            · {exercises.length} תרגילים
          </span>
        </div>

        {/* Day notes */}
        {selectedDay.notes && (
          <div className="bg-brand-elevated border border-brand-border rounded-xl px-4 py-2.5 text-sm text-brand-text-muted">
            📋 {selectedDay.notes}
          </div>
        )}

        {/* Exercise cards */}
        {exercises.length === 0 ? (
          <div className="card p-8 text-center text-sm text-brand-text-dim">
            אין תרגילים ביום זה עדיין
          </div>
        ) : (
          <div className="space-y-3">
            {exercises.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                userId={DEMO_USER_ID}
                coachNotes
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
