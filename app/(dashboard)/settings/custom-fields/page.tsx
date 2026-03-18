import { Header } from "@/components/dashboard/Header";
import { CustomFieldManager } from "@/components/custom-fields/CustomFieldManager";
import { prisma } from "@/lib/prisma";
import type { CustomField } from "@/types";

async function getCustomFields(): Promise<CustomField[]> {
  const fields = await prisma.customFieldDefinition.findMany({
    orderBy: [{ targetObject: "asc" }, { order: "asc" }],
  });
  return fields.map((f) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
    options:   f.options as string[] | null,
  }));
}

export default async function CustomFieldsPage() {
  const fields = await getCustomFields();

  return (
    <>
      <Header
        title="שדות מותאמים אישית"
        subtitle="הגדר שדות דינמיים לכל אובייקט במערכת"
      />
      <div className="p-6">
        <CustomFieldManager fields={fields} />
      </div>
    </>
  );
}
