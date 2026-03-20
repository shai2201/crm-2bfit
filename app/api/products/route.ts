export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateProductSchema = z.object({
  name:        z.string().min(1),
  description: z.string().optional(),
  type:        z.enum(["PERSONAL_TRAINING", "GROUP_SESSION", "MEMBERSHIP_PLAN", "NUTRITION_PLAN", "OTHER"]),
  price:       z.string().regex(/^\d+(\.\d{1,2})?$/, "מחיר לא תקין"),
  currency:    z.string().default("ILS"),
});

// GET /api/products
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: products });
  } catch (err) {
    console.error("[GET /api/products]", err);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}

// POST /api/products
export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = CreateProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "נתונים לא תקינים" },
        { status: 400 },
      );
    }

    const product = await prisma.product.create({
      data: {
        ...parsed.data,
        price: parseFloat(parsed.data.price),
      },
    });

    return NextResponse.json(
      { data: { ...product, price: String(product.price) } },
      { status: 201 },
    );
  } catch (err) {
    console.error("[POST /api/products]", err);
    return NextResponse.json({ error: "שגיאה ביצירה" }, { status: 500 });
  }
}
