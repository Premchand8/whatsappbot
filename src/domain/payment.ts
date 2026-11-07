import { eq } from "drizzle-orm";
import { db, payments, bookings } from "../db.js";
import { env } from "../config.js";

export interface PaymentProvider {
  createCheckout(input: {
    bookingId: string;
    amountPaise: number;
  }): Promise<{ paymentId: string; checkoutUrl: string }>;
  markResult(
    paymentId: string,
    result: "paid" | "failed" | "pending"
  ): Promise<{ bookingId: string; status: string }>;
}

export class MockPaymentProvider implements PaymentProvider {
  async createCheckout(input: { bookingId: string; amountPaise: number }) {
    const [payment] = await db
      .insert(payments)
      .values({
        bookingId: input.bookingId,
        provider: "mock",
        status: "created",
        amountPaise: input.amountPaise,
        externalId: `mock_${Date.now()}`,
      })
      .returning();
    const checkoutUrl = `${env.PUBLIC_BASE_URL}/simulate/pay/${payment.id}`;
    return { paymentId: payment.id, checkoutUrl };
  }

  async markResult(paymentId: string, result: "paid" | "failed" | "pending") {
    const [payment] = await db
      .update(payments)
      .set({ status: result })
      .where(eq(payments.id, paymentId))
      .returning();
    if (!payment) throw new Error(`Payment ${paymentId} not found`);
    const payStatus =
      result === "paid"
        ? "Paid (server verified)"
        : result === "failed"
          ? "Failed"
          : "Pending";
    await db
      .update(bookings)
      .set({
        payStatus,
        ...(result === "paid"
          ? { bookStatus: "Accepted", asgStatus: "Pending" }
          : result === "failed"
            ? { asgStatus: "Not started" }
            : { asgStatus: "Not started" }),
      })
      .where(eq(bookings.id, payment.bookingId));
    return { bookingId: payment.bookingId, status: result };
  }
}

export const paymentProvider: PaymentProvider = new MockPaymentProvider();
