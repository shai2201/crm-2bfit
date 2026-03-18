import { Header } from "@/components/dashboard/Header";
import { ClientTable } from "@/components/clients/ClientTable";
import { prisma } from "@/lib/prisma";
import type { ClientProfile } from "@/types";

async function getClients(): Promise<ClientProfile[]> {
  const users = await prisma.user.findMany({
    where: { role: { in: ["TRAINEE", "COACH"] } },
    orderBy: { createdAt: "desc" },
    include: {
      profile: true,
      memberships: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { plan: { select: { name: true, price: true } } },
      },
      customValues: {
        include: { fieldDef: { select: { label: true, fieldType: true } } },
      },
    },
  });

  // Serialize Decimal fields
  return users.map((u) => ({
    ...u,
    createdAt:   u.createdAt.toISOString(),
    updatedAt:   u.updatedAt.toISOString(),
    memberships: u.memberships.map((m) => ({
      ...m,
      startDate: m.startDate.toISOString(),
      endDate:   m.endDate.toISOString(),
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      plan:      { name: m.plan.name, price: String(m.plan.price) },
    })),
    profile: u.profile
      ? {
          ...u.profile,
          birthDate: u.profile.birthDate?.toISOString() ?? null,
        }
      : null,
    customValues: u.customValues.map((cv) => ({
      fieldDefId: cv.fieldDefId,
      value:      cv.value,
      fieldDef:   cv.fieldDef,
    })),
  })) as ClientProfile[];
}

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <>
      <Header
        title="לקוחות"
        subtitle={`${clients.length} לקוחות רשומים`}
        action={{ label: "לקוח חדש", href: "/dashboard/clients/new" }}
      />
      <div className="p-6">
        <ClientTable clients={clients} />
      </div>
    </>
  );
}
