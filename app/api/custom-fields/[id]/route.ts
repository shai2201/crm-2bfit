import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateFieldSchema = z.object({
  label:    z.string().min(1).optional(),
  fieldType: z.enum(["TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECT"]).optional(),
  options:  z.array(z.string()).nullable().optional(),
  required: z.boolean().optional(),
  order:    z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// PUT /api/custom-fields/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body   = await req.json();
    const parsed = UpdateFieldSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "נתונים לא תקינים" },
        { status: 400 },
      );
    }

    const field = await prisma.customFieldDefinition.update({
      where: { id },
      data:  parsed.data,
    });

    return NextResponse.json({ data: field });
  } catch (err) {
    console.error("[PUT /api/custom-fields/[id]]", err);
    return NextResponse.json({ error: "שגיאה בעדכון" }, { status: 500 });
  }
}

// DELETE /api/custom-fields/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    // Cascade: CustomFieldValue is deleted via Prisma onDelete: Cascade
    await prisma.customFieldDefinition.delete({ where: { id } });
    return NextResponse.json({ message: "נמחק" });
  } catch (err) {
    console.error("[DELETE /api/custom-fields/[id]]", err);
    return NextResponse.json({ error: "שגיאה במחיקה" }, { status: 500 });
  }
}
