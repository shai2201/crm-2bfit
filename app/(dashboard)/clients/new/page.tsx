import { Header } from "@/components/dashboard/Header";
import { ClientForm } from "@/components/clients/ClientForm";
import { prisma } from "@/lib/prisma";
import type { CustomField } from "@/types";

async function getCustomFields(): Promise<CustomField[]> {
  const fields = await prisma.customFieldDefinition.findMany({
    where:   { targetObject: "USER", isActive: true },
    orderBy: { order: "asc" },
  });
  return fields.map((f) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
    options:   f.options as string[] | null,
  }));
}

export default async function NewClientPage() {
  const customFields = await getCustomFields();

  return (
    <>
      <Header title="לקוח חדש" subtitle="מלא את פרטי המתאמן" />
      <div className="p-6 max-w-2xl">
        <div className="card p-6">
          <ClientForm customFields={customFields} />
        </div>
      </div>
    </>
  );
}
