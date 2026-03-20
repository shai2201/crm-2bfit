export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const bodySchema = z.object({
  firstName: z.string().min(2),
  lastName:  z.string().min(2),
  email:     z.string().email(),
  password:  z.string().min(8, "הסיסמה חייבת להיות לפחות 8 תווים"),
  phone:     z.string().optional(),
});

// POST /api/auth/register
// Creates a new TRAINEE user (self-service registration)
export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "בקשה לא תקינה";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { firstName, lastName, email, password, phone } = parsed.data;

    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "כתובת המייל כבר רשומה במערכת" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role:     "TRAINEE",
        isActive: true,
        profile: {
          create: {
            firstName,
            lastName,
            phone: phone ?? null,
          },
        },
      },
      select: { id: true, email: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/auth/register]", err);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}
