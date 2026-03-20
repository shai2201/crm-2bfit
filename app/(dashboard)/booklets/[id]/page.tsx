import { notFound } from "next/navigation";
import { Header } from "@/components/dashboard/Header";
import { BookletBuilder } from "@/components/booklets/BookletBuilder";
import { prisma } from "@/lib/prisma";
import { User } from "lucide-react";

async function getBooklet(id: string) {
  return prisma.workoutBooklet.findUnique({
    where:   { id },
    include: {
      trainee: { include: { profile: true } },
      days: {
        orderBy:  { dayNumber: "asc" },
        include: {
          exercises: {
            orderBy: { order: "asc" },
            include: {
              logs: {
                orderBy: { loggedAt: "desc" },
                take:    3,
              },
            },
          },
        },
      },
    },
  });
}

export default async function BookletDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booklet = await getBooklet(id);
  if (!booklet) notFound();

  const traineeName = booklet.trainee.profile
    ? `${booklet.trainee.profile.firstName} ${booklet.trainee.profile.lastName}`
    : booklet.trainee.email;

  // Serialize for client component
  const initialData = {
    id:          booklet.id,
    title:       booklet.title,
    description: booklet.description ?? null,
    isActive:    booklet.isActive,
    trainee:     { profile: booklet.trainee.profile ? {
      firstName: booklet.trainee.profile.firstName,
      lastName:  booklet.trainee.profile.lastName,
    } : null },
    days: booklet.days.map((d) => ({
      id:        d.id,
      dayNumber: d.dayNumber,
      name:      d.name,
      notes:     d.notes ?? null,
      exercises: d.exercises.map((ex) => ({
        id:       ex.id,
        name:     ex.name,
        sets:     ex.sets,
        reps:     ex.reps,
        weight:   ex.weight,
        restTime: ex.restTime,
        videoUrl: ex.videoUrl,
        notes:    ex.notes,
        order:    ex.order,
        logs:     ex.logs.map((l) => ({
          id:       l.id,
          weightKg: l.weightKg,
          reps:     l.reps,
          sets:     l.sets,
          rpe:      l.rpe,
          notes:    l.notes,
          loggedAt: l.loggedAt.toISOString(),
        })),
      })),
    })),
  };

  return (
    <>
      <Header
        title={booklet.title}
        subtitle={
          <span className="flex items-center gap-1.5">
            <User className="w-3 h-3" />
            {traineeName}
            {booklet.isActive && (
              <span className="text-[10px] font-semibold bg-brand-accent/10 text-brand-accent px-2 py-0.5 rounded-full mr-1">
                פעיל
              </span>
            )}
          </span>
        }
        action={{ label: "כל החוברות", href: "/dashboard/booklets" }}
      />
      <div className="p-6">
        <BookletBuilder booklet={initialData} />
      </div>
    </>
  );
}
