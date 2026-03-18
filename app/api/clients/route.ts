import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const CreateClientSchema = z.object({
  email:             z.string().email("מייל לא תקין"),
  firstName:         z.string().min(1, "שם פרטי נדרש"),
  lastName:          z.string().min(1, "שם משפחה נדרש"),
  phone:             z.string().optional(),
  birthDate:         z.string().optional(),
  gender:            z.string().optional(),
  notes:             z.string().optional(),
  role:              z.enum(["ADMIN", "COACH", "TRAINEE"]).default("TRAINEE"),
  // health
  hasConditions:     z.boolean().default(false),
  conditions:        z.string().optional(),
  injuries:          z.string().optional(),
  medications:       z.string().optional(),
  physicianApproval: z.boolean().default(false),
  // custom fields
  customFields:      z.record(z.string()).optional(),
});

// GET /api/clients — list all trainees & coaches
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role   = searchParams.get("role") as "TRAINEE" | "COACH" | null;
    const search = searchParams.get("q");

    const users = await prisma.user.findMany({
      where: {
        role: role ? { equals: role } : { in: ["TRAINEE", "COACH"] },
        ...(search && {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { profile: { firstName: { contains: search, mode: "insensitive" } } },
            { profile: { lastName:  { contains: search, mode: "insensitive" } } },
            { profile: { phone:     { contains: search } } },
          ],
        }),
      },
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

    return NextResponse.json({ data: users });
  } catch (err) {
    console.error("[GET /api/clients]", err);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}

// POST /api/clients — create new user + profile + health declaration
export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = CreateClientSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "נתונים לא תקינים";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const data = parsed.data;

    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "מייל כבר רשום במערכת" }, { status: 409 });
    }

    // Generate a temporary password
    const tempPassword   = Math.random().toString(36).slice(-8);
    const passwordHash   = await bcrypt.hash(tempPassword, 12);

    const user = await prisma.user.create({
      data: {
        email:        data.email,
        passwordHash,
        role:         data.role,
        profile: {
          create: {
            firstName:  data.firstName,
            lastName:   data.lastName,
            phone:      data.phone,
            gender:     data.gender,
            notes:      data.notes,
            birthDate:  data.birthDate ? new Date(data.birthDate) : undefined,
          },
        },
        healthDeclaration: {
          create: {
            hasConditions:     data.hasConditions,
            conditions:        data.conditions,
            injuries:          data.injuries,
            medications:       data.medications,
            physicianApproval: data.physicianApproval,
          },
        },
      },
      include: {
        profile:          true,
        healthDeclaration: true,
      },
    });

    // Persist custom field values
    if (data.customFields) {
      const entries = Object.entries(data.customFields).filter(([, v]) => v !== "");
      if (entries.length > 0) {
        await prisma.customFieldValue.createMany({
          data: entries.map(([fieldDefId, value]) => ({
            fieldDefId,
            targetId: user.id,
            value,
            userId:   user.id,
          })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json(
      { data: user, message: `לקוח נוצר. סיסמה זמנית: ${tempPassword}` },
      { status: 201 },
    );
  } catch (err) {
    console.error("[POST /api/clients]", err);
    return NextResponse.json({ error: "שגיאה ביצירת לקוח" }, { status: 500 });
  }
}
