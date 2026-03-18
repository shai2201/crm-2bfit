import { Header } from "@/components/dashboard/Header";
import { SessionForm } from "@/components/sessions/SessionForm";
import { prisma } from "@/lib/prisma";

async function getFormData() {
  const [coaches, locations] = await Promise.all([
    prisma.coach.findMany({
      include: { user: { include: { profile: true } } },
      where:   { user: { isActive: true } },
    }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return {
    coaches: coaches.map((c) => ({
      id:   c.id,
      user: {
        profile: c.user.profile
          ? { firstName: c.user.profile.firstName, lastName: c.user.profile.lastName }
          : null,
      },
    })),
    locations: locations.map((l) => ({ id: l.id, name: l.name })),
  };
}

export default async function NewSessionPage() {
  const { coaches, locations } = await getFormData();

  return (
    <>
      <Header title="אימון חדש" subtitle="הוסף אימון ללוח השבועי" />
      <div className="p-6 max-w-2xl">
        <div className="card p-6">
          <SessionForm coaches={coaches} locations={locations} />
        </div>
      </div>
    </>
  );
}
