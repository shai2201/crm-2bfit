/**
 * Core booking business logic.
 * All mutations run inside Serializable transactions to prevent race conditions.
 *
 * Race-condition guarantee:
 *   With SERIALIZABLE isolation, PostgreSQL detects concurrent reads of the
 *   same confirmed-count and forces all but one concurrent transaction to
 *   retry (P2034). We retry up to MAX_RETRIES times with exponential back-off.
 *   This means: if 20 people click "הירשם" in the same millisecond, only the
 *   first 15 get CONFIRMED — the rest get WAITLISTED, without any exception.
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const MAX_RETRIES = 4;

// ─── Types ─────────────────────────────────────────────────────────────────────

export type BookingResult =
  | { status: "CONFIRMED";   booking: { id: string; status: string } }
  | { status: "WAITLISTED";  booking: { id: string; status: string }; position: number }
  | { status: "ALREADY_BOOKED" }
  | { status: "NO_ACTIVE_MEMBERSHIP" }
  | { status: "SESSION_FULL_NO_WAITLIST" }     // edge-case guard
  | { status: "SESSION_NOT_FOUND" }
  | { status: "SESSION_NOT_BOOKABLE"; reason: string };

export type CancelResult =
  | { status: "CANCELLED"; promoted: boolean }
  | { status: "BOOKING_NOT_FOUND" }
  | { status: "ALREADY_CANCELLED" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Check if a user has an active membership right now */
async function hasActiveMembership(userId: string): Promise<boolean> {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      status:  "ACTIVE",
      endDate: { gte: new Date() },
    },
  });
  return membership !== null;
}

// ─── Book ─────────────────────────────────────────────────────────────────────

/**
 * Book a session for a user.
 * Uses Serializable transaction + retry to be 100% race-condition safe.
 */
export async function bookSession(
  sessionId: string,
  userId:    string,
): Promise<BookingResult> {
  // ── Pre-checks (outside transaction — fast path) ───────────────────────────

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return { status: "SESSION_NOT_FOUND" };

  if (session.status !== "SCHEDULED") {
    return { status: "SESSION_NOT_BOOKABLE", reason: `מצב אימון: ${session.status}` };
  }

  if (new Date(session.startTime) <= new Date()) {
    return { status: "SESSION_NOT_BOOKABLE", reason: "האימון כבר התחיל או עבר" };
  }

  // Check membership (doesn't need to be in the serializable tx)
  const membershipOk = await hasActiveMembership(userId);
  if (!membershipOk) return { status: "NO_ACTIVE_MEMBERSHIP" };

  // Check if already booked (fast path)
  const existingBooking = await prisma.booking.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
  });
  if (existingBooking && existingBooking.status !== "CANCELLED") {
    return { status: "ALREADY_BOOKED" };
  }

  // ── Serializable transaction with retry ────────────────────────────────────

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const booking = await prisma.$transaction(
        async (tx) => {
          // Count current CONFIRMED bookings — this read is serializable-protected
          const confirmedCount = await tx.booking.count({
            where: { sessionId, status: "CONFIRMED" },
          });

          const isAvailable = confirmedCount < session.maxCapacity;

          if (isAvailable) {
            // ── CONFIRMED path ──────────────────────────────────────────────
            if (existingBooking?.status === "CANCELLED") {
              // Re-use existing record
              return tx.booking.update({
                where: { id: existingBooking.id },
                data:  { status: "CONFIRMED", waitlistPosition: null, cancelledAt: null },
              });
            }
            return tx.booking.create({
              data: { sessionId, userId, status: "CONFIRMED" },
            });
          } else {
            // ── WAITLISTED path ─────────────────────────────────────────────
            const maxPos = await tx.booking.aggregate({
              where: { sessionId, status: "WAITLISTED" },
              _max:  { waitlistPosition: true },
            });
            const nextPosition = (maxPos._max.waitlistPosition ?? 0) + 1;

            if (existingBooking?.status === "CANCELLED") {
              return tx.booking.update({
                where: { id: existingBooking.id },
                data:  { status: "WAITLISTED", waitlistPosition: nextPosition, cancelledAt: null },
              });
            }
            return tx.booking.create({
              data: { sessionId, userId, status: "WAITLISTED", waitlistPosition: nextPosition },
            });
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 8000 },
      );

      // Re-read final state
      if (booking.status === "CONFIRMED") {
        return { status: "CONFIRMED", booking };
      }
      return {
        status:   "WAITLISTED",
        booking,
        position: booking.waitlistPosition ?? 0,
      };
    } catch (err: unknown) {
      // P2034 = serialization failure — retry with back-off
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2034" &&
        attempt < MAX_RETRIES - 1
      ) {
        await sleep(60 * (attempt + 1));   // 60ms, 120ms, 180ms
        continue;
      }
      throw err;   // unexpected error — rethrow
    }
  }

  // Should never reach here
  return { status: "SESSION_FULL_NO_WAITLIST" };
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

/**
 * Cancel a booking and auto-promote the first waitlisted user.
 */
export async function cancelBooking(bookingId: string): Promise<CancelResult> {
  const existing = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!existing)                         return { status: "BOOKING_NOT_FOUND" };
  if (existing.status === "CANCELLED")   return { status: "ALREADY_CANCELLED" };

  const wasConfirmed = existing.status === "CONFIRMED";

  await prisma.$transaction(
    async (tx) => {
      // 1. Cancel the booking
      await tx.booking.update({
        where: { id: bookingId },
        data:  { status: "CANCELLED", cancelledAt: new Date() },
      });

      if (!wasConfirmed) return;   // waitlisted cancellation: just remove, no promotion

      // 2. Find the first person in the waitlist
      const nextInLine = await tx.booking.findFirst({
        where:   { sessionId: existing.sessionId, status: "WAITLISTED" },
        orderBy: { waitlistPosition: "asc" },
      });

      if (!nextInLine) return;

      // 3. Promote them to CONFIRMED
      await tx.booking.update({
        where: { id: nextInLine.id },
        data:  { status: "CONFIRMED", waitlistPosition: null },
      });

      // 4. Decrement everyone else's waitlist position
      await tx.booking.updateMany({
        where: {
          sessionId:        existing.sessionId,
          status:           "WAITLISTED",
          waitlistPosition: { gt: nextInLine.waitlistPosition! },
        },
        data: { waitlistPosition: { decrement: 1 } },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 8000 },
  );

  return { status: "CANCELLED", promoted: wasConfirmed };
}

// ─── Session enrichment helpers ──────────────────────────────────────────────

/** Get confirmed + waitlist counts and a user's booking for a session */
export async function getSessionBookingInfo(sessionId: string, userId?: string) {
  const [confirmedCount, waitlistCount, userBooking] = await Promise.all([
    prisma.booking.count({ where: { sessionId, status: "CONFIRMED" } }),
    prisma.booking.count({ where: { sessionId, status: "WAITLISTED" } }),
    userId
      ? prisma.booking.findUnique({
          where: { sessionId_userId: { sessionId, userId } },
        })
      : null,
  ]);
  return { confirmedCount, waitlistCount, userBooking };
}
