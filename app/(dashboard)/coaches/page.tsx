import { Header } from "@/components/dashboard/Header";
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { prisma } from "@/lib/prisma";
import { Dumbbell } from "lucide-react";

async function getCoaches() {
  return prisma.user.findMany({
    where: { role: "COACH" },
    orderBy: { createdAt: "desc" },
    include: {
      profile:      true,
      coachProfile: true,
      _count: {
        select: {
          asTrainee: false,    // coaches don't have trainee relation in this direction
          bookings:  false,
        },
      },
    },
  });
}

export default async function CoachesPage() {
  const coaches = await getCoaches();

  return (
    <>
      <Header
        title="מאמנים"
        subtitle={`${coaches.length} מאמנים פעילים`}
        action={{ label: "מאמן חדש", href: "/dashboard/clients/new" }}
      />
      <div className="p-6">
        <Table>
          <Thead>
            <tr>
              <Th>מאמן</Th>
              <Th>התמחויות</Th>
              <Th>הסמכות</Th>
              <Th>טלפון</Th>
              <Th>סטטוס</Th>
              <Th className="text-center">פעולות</Th>
            </tr>
          </Thead>
          <Tbody>
            {coaches.length === 0 ? (
              <EmptyRow colSpan={6} message="אין מאמנים רשומים עדיין" />
            ) : (
              coaches.map((coach) => {
                const name = coach.profile
                  ? `${coach.profile.firstName} ${coach.profile.lastName}`
                  : coach.email;

                return (
                  <Tr key={coach.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-accent/30 to-brand-info/30 border border-brand-border flex items-center justify-center">
                          <Dumbbell className="w-4 h-4 text-brand-accent" />
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm">{name}</p>
                          <p className="text-xs text-brand-text-muted">{coach.email}</p>
                        </div>
                      </div>
                    </Td>

                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {(coach.coachProfile?.specializations ?? []).length === 0 ? (
                          <span className="text-xs text-brand-text-dim">—</span>
                        ) : (
                          (coach.coachProfile?.specializations ?? []).map((s) => (
                            <span
                              key={s}
                              className="text-[11px] bg-brand-elevated border border-brand-border rounded-full px-2 py-0.5 text-brand-text-muted"
                            >
                              {s}
                            </span>
                          ))
                        )}
                      </div>
                    </Td>

                    <Td>
                      <span className="text-sm text-brand-text-muted">
                        {(coach.coachProfile?.certifications ?? []).join(", ") || "—"}
                      </span>
                    </Td>

                    <Td>
                      <span className="text-sm">{coach.profile?.phone ?? "—"}</span>
                    </Td>

                    <Td>
                      <Badge variant={coach.isActive ? "accent" : "neutral"}>
                        {coach.isActive ? "פעיל" : "לא פעיל"}
                      </Badge>
                    </Td>

                    <Td className="text-center">
                      <a
                        href={`/dashboard/clients/${coach.id}`}
                        className="text-xs text-brand-accent hover:text-brand-accent-dim transition-colors"
                      >
                        עריכה
                      </a>
                    </Td>
                  </Tr>
                );
              })
            )}
          </Tbody>
        </Table>
      </div>
    </>
  );
}
