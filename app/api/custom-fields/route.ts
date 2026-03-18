import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateFieldSchema = z.object({
  name:         z.string().min(1).regex(/^[\w\u0590-\u05ff]+$/, "רק אנגלית/ספרות/קו_תחתי"),
  label:        z.string().min(1),
  fieldType:    z.enum(["TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECT"]),
  options:      z.array(z.string()).nullable().optional(),
  targetObject: z.enum(["USER", "SESSION", "MEMBERSHIP", "WORKOUT_BOOKLET"]).default("USER"),
  required:     z.boolean().default(false),
  order:        z.number().int().default(0),
});

// GET /api/custom-fields
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const target = searchParams.get("target");

    const fields = await prisma.customFieldDefinition.findMany({
      where: {
        isActive: true,
        ...(target && { targetObject: target as "USER" | "SESSION" | "MEMBERSHIP" | "WORKOUT_BOOKLET" }),
      },
      orderBy: [{ targetObject: "asc" }, { order: "asc" }],
    });

    return NextResponse.json({ data: fields });
  } catch (err) {
    console.error("[GET /api/custom-fields]", err);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}

// POST /api/custom-fields
export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = CreateFieldSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "נתונים לא תקינים" },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Check name uniqueness per target
    const existing = await prisma.customFieldDefinition.findFirst({
      where: { name: data.name, targetObject: data.targetObject },
    });
    if (existing) {
      return NextResponse.json(
        { error: `שדה עם מזהה '${data.name}' כבר קיים עבור אובייקט זה` },
        { status: 409 },
      );
    }

    const field = await prisma.customFieldDefinition.create({
      data: {
        name:         data.name,
        label:        data.label,
        fieldType:    data.fieldType,
        options:      data.options ?? null,
        targetObject: data.targetObject,
        required:     data.required,
        order:        data.order,
      },
    });

    return NextResponse.json({ data: field }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/custom-fields]", err);
    return NextResponse.json({ error: "שגיאה ביצירת שדה" }, { status: 500 });
  }
}
