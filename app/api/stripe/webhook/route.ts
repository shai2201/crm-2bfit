import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

// Must disable body parsing for Stripe signature verification
export const config = { api: { bodyParser: false } };

// POST /api/stripe/webhook
// Handles Stripe events: checkout.session.completed, payment_intent.payment_failed
export async function POST(req: NextRequest) {
  const stripe    = getStripe();
  const payload   = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("[Stripe webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ──────────────────────────────────────────────────────────────
  // Handle: checkout.session.completed
  // → Create Membership + Payment, set status = ACTIVE / PAID
  // ──────────────────────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session  = event.data.object as Stripe.Checkout.Session;
    const userId   = session.metadata?.userId;
    const productId = session.metadata?.productId;

    if (!userId || !productId) {
      console.error("[Stripe webhook] missing metadata", session.metadata);
      return NextResponse.json({ error: "missing metadata" }, { status: 400 });
    }

    try {
      // Find the product and its linked MembershipPlan
      const product = await prisma.product.findUnique({
        where:   { id: productId },
        include: { plan: true },
      });

      if (!product) throw new Error(`Product ${productId} not found`);

      const amount = session.amount_total ? session.amount_total / 100 : Number(product.price);

      await prisma.$transaction(async (tx) => {
        let membershipId: string | undefined;

        // If the product is linked to a MembershipPlan, create an active Membership
        if (product.plan) {
          const startDate = new Date();
          const endDate   = new Date();
          endDate.setDate(endDate.getDate() + product.plan.durationDays);

          // Expire any existing active membership
          await tx.membership.updateMany({
            where:  { userId, status: "ACTIVE" },
            data:   { status: "EXPIRED" },
          });

          const membership = await tx.membership.create({
            data: {
              userId,
              planId:        product.plan.id,
              startDate,
              endDate,
              status:        "ACTIVE",
              paymentStatus: "PAID",
            },
          });
          membershipId = membership.id;
        }

        // Create Payment record
        await tx.payment.create({
          data: {
            userId,
            membershipId:          membershipId ?? null,
            amount,
            currency:              (session.currency ?? "ils").toUpperCase(),
            method:                "stripe",
            status:                "PAID",
            paidAt:                new Date(),
            stripeSessionId:       session.id,
            stripePaymentIntentId: session.payment_intent as string ?? null,
            notes:                 `Stripe checkout: ${product.name}`,
          },
        });
      });

      console.log(`[Stripe webhook] Payment processed for user ${userId}, product ${productId}`);
    } catch (err) {
      console.error("[Stripe webhook] Error processing payment:", err);
      return NextResponse.json({ error: "Processing error" }, { status: 500 });
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Handle: payment_intent.payment_failed
  // ──────────────────────────────────────────────────────────────
  if (event.type === "payment_intent.payment_failed") {
    const intent  = event.data.object as Stripe.PaymentIntent;
    const session = await stripe.checkout.sessions.list({
      payment_intent: intent.id,
      limit: 1,
    });

    const checkoutSession = session.data[0];
    if (checkoutSession) {
      await prisma.payment.updateMany({
        where: { stripeSessionId: checkoutSession.id },
        data:  { status: "FAILED" },
      });
    }
  }

  return NextResponse.json({ received: true });
}
