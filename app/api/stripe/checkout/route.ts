export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

const bodySchema = z.object({
  productId: z.string(),
  userId:    z.string(),
});

// POST /api/stripe/checkout
// Body: { productId, userId }
// Returns: { url: string } — Stripe Checkout redirect URL
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  try {
    const body   = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "productId ו-userId נדרשים" }, { status: 400 });
    }

    const { productId, userId } = parsed.data;

    // Fetch product
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) {
      return NextResponse.json({ error: "מוצר לא נמצא" }, { status: 404 });
    }

    // Fetch or create Stripe customer
    const user = await prisma.user.findUnique({
      where:   { id: userId },
      include: { profile: true },
    });
    if (!user) return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name:  user.profile
          ? `${user.profile.firstName} ${user.profile.lastName}`
          : user.email,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
      await prisma.user.update({
        where: { id: userId },
        data:  { stripeCustomerId },
      });
    }

    const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    // Build price data (use stripePriceId if set, otherwise create inline)
    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = product.stripePriceId
      ? { price: product.stripePriceId, quantity: 1 }
      : {
          quantity: 1,
          price_data: {
            currency:     product.currency.toLowerCase(),
            unit_amount:  Math.round(Number(product.price) * 100), // to cents/agorot
            product_data: {
              name:        product.name,
              description: product.description ?? undefined,
            },
          },
        };

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer:   stripeCustomerId,
      mode:       "payment",
      line_items: [lineItem],
      success_url: `${origin}/dashboard?payment=success&product=${productId}`,
      cancel_url:  `${origin}/dashboard/pricing?payment=cancelled`,
      metadata: {
        userId,
        productId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[POST /api/stripe/checkout]", err);
    return NextResponse.json({ error: "שגיאה ביצירת סליקה" }, { status: 500 });
  }
}
