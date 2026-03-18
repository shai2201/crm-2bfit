import { notFound } from "next/navigation";
import { Header } from "@/components/dashboard/Header";
import { ClientForm } from "@/components/clients/ClientForm";
import { StatusBadge } from "@/components/ui/Badge";
import { prisma } from "@/lib/prisma";
import { formatDate, formatPrice } from "@/lib/utils";
import type { CustomField, ClientFormData } from "@/types";
import { CreditCard, Heart, Calendar } from "lucide-react";

async function getClient(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      profile:          true,
      healthDeclaration: true,
      memberships: {
        orderBy: { createdAt: "desc" },
        include: { plan: true, payments: { orderBy: { createdAt: "desc" }, take: 5 } },
      },
      customValues: {
        include: { fieldDef: true },
      },
    },
  });
  return user;
}

async function getCustomFields(): Promise<CustomField[]> {
  const fields = await prisma.customFieldDefinition.findMany({
    where: { targetObject: "USER", isActive: true },
    orderBy: { order: "asc" },
  });
  return fields.map((f) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
    options:   f.options as string[] | null,
  }));
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, customFields] = await Promise.all([
    getClient(id),
    getCustomFields(),
  ]);

  if (!user) notFound();

  const fullName = user.profile
    ? `${user.profile.firstName} ${user.profile.lastName}`
    : user.email;

  // Build initial form data
  const customFieldsMap: Record<string, string> = {};
  user.customValues.forEach((cv) => {
    customFieldsMap[cv.fieldDefId] = cv.value;
  });

  const initialData: Partial<ClientFormData> = {
    email:             user.email,
    firstName:         user.profile?.firstName        ?? "",
    lastName:          user.profile?.lastName         ?? "",
    phone:             user.profile?.phone            ?? "",
    birthDate:         user.profile?.birthDate?.toISOString().split("T")[0] ?? "",
    gender:            user.profile?.gender           ?? "",
    notes:             user.profile?.notes            ?? "",
    role:              user.role as ClientFormData["role"],
    hasConditions:     user.healthDeclaration?.hasConditions    ?? false,
    conditions:        user.healthDeclaration?.conditions       ?? "",
    injuries:          user.healthDeclaration?.injuries         ?? "",
    medications:       user.healthDeclaration?.medications      ?? "",
    physicianApproval: user.healthDeclaration?.physicianApproval ?? false,
    customFields:      customFieldsMap,
  };

  const activeMembership = user.memberships.find((m) => m.status === "ACTIVE");

  return (
    <>
      <Header
        title={fullName}
        subtitle={user.email}
        action={{ label: "עריכה", href: `/dashboard/clients/${user.id}/edit` }}
      />

      <div className="p-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="p-2 bg-brand-elevated rounded-xl">
              <CreditCard className="w-5 h-5 text-brand-accent" />
            </div>
            <div>
              <p className="text-xs text-brand-text-muted">מנוי נוכחי</p>
              {activeMembership ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm font-semibold text-white">{activeMembership.plan.name}</p>
                  <StatusBadge status={activeMembership.status} />
                </div>
              ) : (
                <p className="text-sm text-brand-text-dim">ללא מנוי פעיל</p>
              )}
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <div className="p-2 bg-brand-elevated rounded-xl">
              <Calendar className="w-5 h-5 text-brand-text-muted" />
            </div>
            <div>
              <p className="text-xs text-brand-text-muted">תוקף מנוי</p>
              <p className="text-sm font-semibold text-white">
                {activeMembership ? formatDate(activeMembership.endDate) : "—"}
              </p>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <div className="p-2 bg-brand-elevated rounded-xl">
              <Heart className="w-5 h-5 text-brand-text-muted" />
            </div>
            <div>
              <p className="text-xs text-brand-text-muted">הצהרת בריאות</p>
              <p className="text-sm font-semibold text-white">
                {user.healthDeclaration ? "הוגשה" : "לא הוגשה"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 card p-6">
            <h2 className="text-base font-semibold text-white mb-5">פרטי לקוח</h2>
            <ClientForm
              initialData={initialData}
              clientId={user.id}
              customFields={customFields}
            />
          </div>

          {/* Payment history */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-brand-border">
              <h2 className="text-sm font-semibold text-white">היסטוריית מנויים</h2>
            </div>
            <div className="divide-y divide-brand-border">
              {user.memberships.length === 0 ? (
                <p className="p-4 text-sm text-brand-text-dim text-center">אין מנויים</p>
              ) : (
                user.memberships.map((m) => (
                  <div key={m.id} className="p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{m.plan.name}</span>
                      <StatusBadge status={m.status} />
                    </div>
                    <p className="text-xs text-brand-text-muted">
                      {formatDate(m.startDate)} — {formatDate(m.endDate)}
                    </p>
                    <p className="text-xs text-brand-accent font-semibold">
                      {formatPrice(Number(m.plan.price))}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
