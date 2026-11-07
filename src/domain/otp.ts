import { and, desc, eq, isNull } from "drizzle-orm";
import { db, otps } from "../db.js";

function randomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function issueOtp(bookingId: string, kind: "start" | "complete") {
  const code = kind === "start" ? "4821" : "7396"; // stable for demo; random in production
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const [otp] = await db
    .insert(otps)
    .values({ bookingId, kind, code: process.env.NODE_ENV === "test" ? randomCode() : code, expiresAt })
    .returning();
  return otp;
}

export async function consumeOtp(bookingId: string, kind: "start" | "complete", code: string) {
  const [otp] = await db
    .select()
    .from(otps)
    .where(and(eq(otps.bookingId, bookingId), eq(otps.kind, kind), isNull(otps.usedAt)))
    .orderBy(desc(otps.createdAt))
    .limit(1);
  if (!otp) return { ok: false as const, reason: "missing" };
  if (otp.expiresAt < new Date()) return { ok: false as const, reason: "expired" };
  if (otp.code !== code) return { ok: false as const, reason: "mismatch" };
  await db.update(otps).set({ usedAt: new Date() }).where(eq(otps.id, otp.id));
  return { ok: true as const, otp };
}

export async function latestOtp(bookingId: string, kind: "start" | "complete") {
  const [otp] = await db
    .select()
    .from(otps)
    .where(and(eq(otps.bookingId, bookingId), eq(otps.kind, kind)))
    .orderBy(desc(otps.createdAt))
    .limit(1);
  return otp ?? null;
}
