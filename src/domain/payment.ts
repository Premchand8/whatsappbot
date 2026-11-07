import { prisma } from "../db.js";
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
    const payment = await prisma.payment.create({
      data: {
        bookingId: input.bookingId,
        provider: "mock",
        status: "created",
        amountPaise: input.amountPaise,
        externalId: `mock_${Date.now()}`,
      },
    });
    const checkoutUrl = `${env.PUBLIC_BASE_URL}/simulate/pay/${payment.id}`;
    return { paymentId: payment.id, checkoutUrl };
  }

  async markResult(paymentId: string, result: "paid" | "failed" | "pending") {
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: result },
    });
    const payStatus =
      result === "paid"
        ? "Paid (server verified)"
        : result === "failed"
          ? "Failed"
          : "Pending";
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: {
        payStatus,
        ...(result === "paid"
          ? { bookStatus: "Accepted", asgStatus: "Pending" }
          : result === "failed"
            ? { asgStatus: "Not started" }
            : { asgStatus: "Not started" }),
      },
    });
    return { bookingId: payment.bookingId, status: result };
  }
}

export const paymentProvider: PaymentProvider = new MockPaymentProvider();
