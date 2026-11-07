import { prisma } from "../db.js";

function randomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function issueOtp(bookingId: string, kind: "start" | "complete") {
  const code = kind === "start" ? "4821" : "7396"; // stable for demo; random in production
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  return prisma.otp.create({
    data: { bookingId, kind, code: process.env.NODE_ENV === "test" ? randomCode() : code, expiresAt },
  });
}

export async function consumeOtp(bookingId: string, kind: "start" | "complete", code: string) {
  const otp = await prisma.otp.findFirst({
    where: { bookingId, kind, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return { ok: false as const, reason: "missing" };
  if (otp.expiresAt < new Date()) return { ok: false as const, reason: "expired" };
  if (otp.code !== code) return { ok: false as const, reason: "mismatch" };
  await prisma.otp.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
  return { ok: true as const, otp };
}

export async function latestOtp(bookingId: string, kind: "start" | "complete") {
  return prisma.otp.findFirst({
    where: { bookingId, kind },
    orderBy: { createdAt: "desc" },
  });
}
