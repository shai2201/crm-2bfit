import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateClientSchema = z.object({
  firstName:         z.string().min(1).optional(),
  lastName:          z.string().min(1).optional(),
  phone:             z.string().optional(),
  birthDate:         z.string().optional(),
  gender:            z.string().optional(),
  notes:             z.string().optional(),
  role:              z.enum(["ADMIN", "COACH", "TRAINEE"]).optional(),
  isActive:          z.boolean().optional(),
  // health
  hasConditions:     z.boolean().optional(),
  conditions:        z.string().optional(),
  injuries:          z.string().optional(),
  medications:       z.string().optional(),
  physicianApproval: z.boolean().optional(),
  // custom fields
  customFields:      z.record(z.string()).optional(),
});

// GET /api/clients/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile:           true,
        healthDeclaration: true,
        memberships: {
          orderBy: { createdAt: "desc" },
          include: { plan: true, payments: { orderBy: { createdAt: "desc" } } },
        },
        customValues: {
          include: { fieldDef: true },
        },
      },
    });

    if (!user) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    return NextResponse.json({ data: user });
  } catch (err) {
    console.error("[GET /api/clients/[id]]", err);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}

// PUT /api/clients/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body   = await req.json();
    const parsed = UpdateClientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "נתונים לא תקינים" },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Update user base
    const userUpdates: Record<string, unknown> = {};
    if (data.role     !== undefined) userUpdates.role     = data.role;
    if (data.isActive !== undefined) userUpdates.isActive = data.isActive;

    // Profile upsert
    const profileUpdates: Record<string, unknown> = {};
    if (data.firstName !== undefined) profileUpdates.firstName = data.firstName;
    if (data.lastName  !== undefined) profileUpdates.lastName  = data.lastName;
    if (data.phone     !== undefined) profileUpdates.phone     = data.phone;
    if (data.gender    !== undefined) profileUpdates.gender    = data.gender;
    if (data.notes     !== undefined) profileUpdates.notes     = data.notes;
    if (data.birthDate !== undefined) {
      profileUpdates.birthDate = data.birthDate ? new Date(data.birthDate) : null;
    }

    // Health upsert
    const healthUpdates: Record<string, unknown> = {};
    if (data.hasConditions     !== undefined) healthUpdates.hasConditions     = data.hasConditions;
    if (data.conditions        !== undefined) healthUpdates.conditions        = data.conditions;
    if (data.injuries          !== undefined) healthUpdates.injuries          = data.injuries;
    if (data.medications       !== undefined) healthUpdates.medications       = data.medications;
    if (data.physicianApproval !== undefined) healthUpdates.physicianApproval = data.physicianApproval;

    const user = await prisma.$transaction(async (tx) => {
      // Update user
      if (Object.keys(userUpdates).length > 0) {
        await tx.user.update({ where: { id }, data: userUpdates });
      }
      // Upsert profile
      if (Object.keys(profileUpdates).length > 0) {
        await tx.profile.upsert({
          where:  { userId: id },
          update: profileUpdates,
          create: { userId: id, firstName: "", lastName: "", ...profileUpdates },
        });
      }
      // Upsert health declaration
      if (Object.keys(healthUpdates).length > 0) {
        await tx.healthDeclaration.upsert({
          where:  { userId: id },
          update: healthUpdates,
          create: { userId: id, ...healthUpdates },
        });
      }
      // Custom fields: upsert each value
      if (data.customFields) {
        for (const [fieldDefId, value] of Object.entries(data.customFields)) {
          await tx.customFieldValue.upsert({
            where:  { fieldDefId_targetId: { fieldDefId, targetId: id } },
            update: { value },
            create: { fieldDefId, targetId: id, value, userId: id },
          });
        }
      }

      return tx.user.findUnique({
        where:   { id },
        include: { profile: true, healthDeclaration: true },
      });
    });

    return NextResponse.json({ data: user, message: "עודכן בהצלחה" });
  } catch (err) {
    console.error("[PUT /api/clients/[id]]", err);
    return NextResponse.json({ error: "שגיאה בעדכון" }, { status: 500 });
  }
}

// DELETE /api/clients/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: "נמחק בהצלחה" });
  } catch (err) {
    console.error("[DELETE /api/clients/[id]]", err);
    return NextResponse.json({ error: "שגיאה במחיקה" }, { status: 500 });
  }
}
