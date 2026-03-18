import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateProductSchema = z.object({
  name:        z.string().min(1).optional(),
  description: z.string().optional(),
  type:        z.enum(["PERSONAL_TRAINING", "GROUP_SESSION", "MEMBERSHIP_PLAN", "NUTRITION_PLAN", "OTHER"]).optional(),
  price:       z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currency:    z.string().optional(),
  isActive:    z.boolean().optional(),
});

// PUT /api/products/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body   = await req.json();
    const parsed = UpdateProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "נתונים לא תקינים" },
        { status: 400 },
      );
    }

    const { price, ...rest } = parsed.data;
    const product = await prisma.product.update({
      where: { id },
      data:  {
        ...rest,
        ...(price !== undefined && { price: parseFloat(price) }),
      },
    });

    return NextResponse.json({ data: { ...product, price: String(product.price) } });
  } catch (err) {
    console.error("[PUT /api/products/[id]]", err);
    return NextResponse.json({ error: "שגיאה בעדכון" }, { status: 500 });
  }
}

// DELETE /api/products/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ message: "נמחק" });
  } catch (err) {
    console.error("[DELETE /api/products/[id]]", err);
    return NextResponse.json({ error: "שגיאה במחיקה" }, { status: 500 });
  }
}
