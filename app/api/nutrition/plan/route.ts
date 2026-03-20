export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/nutrition/plan?userId=xxx
// Returns the most recent active plan with messages
export async function GET(req: NextRequest) {
  try {
    const userId = new URL(req.url).searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId נדרש" }, { status: 400 });

    const plan = await prisma.nutritionPlan.findFirst({
      where:   { userId, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ plan });
  } catch (err) {
    console.error("[GET /api/nutrition/plan]", err);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}

// DELETE /api/nutrition/plan?planId=xxx
// Deactivate a plan
export async function DELETE(req: NextRequest) {
  try {
    const planId = new URL(req.url).searchParams.get("planId");
    if (!planId) return NextResponse.json({ error: "planId נדרש" }, { status: 400 });

    await prisma.nutritionPlan.update({
      where: { id: planId },
      data:  { isActive: false },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/nutrition/plan]", err);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}
