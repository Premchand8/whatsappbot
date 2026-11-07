import { and, desc, eq, ilike, not, or } from "drizzle-orm";
import { db, customers, sessions, bookings, supportCases } from "../db.js";
import type { BookingType } from "../engine/types.js";
import type { Pair } from "../engine/i18n.js";
import { L, type Lang } from "../engine/i18n.js";

export function amountForType(type: BookingType): number {
  if (type === "variable") return 19900;
  if (type === "assisted") return 1260000;
  return 29900;
}

export async function ensureCustomer(waId: string, lang: Lang = "en") {
  await db
    .insert(customers)
    .values({ waId, lang, savedAddress: "Warangal, Telangana" })
    .onConflictDoNothing({ target: customers.waId });
  const [customer] = await db.select().from(customers).where(eq(customers.waId, waId));
  return customer;
}

export async function getOrCreateSession(waId: string) {
  const customer = await ensureCustomer(waId);
  await db
    .insert(sessions)
    .values({ customerId: customer.id })
    .onConflictDoNothing({ target: sessions.customerId });
  const [session] = await db.select().from(sessions).where(eq(sessions.customerId, customer.id));
  return { customer, session };
}

export async function createBooking(input: {
  customerId: string;
  type: BookingType;
  svc: Pair;
  slot: Pair | null;
  address: string;
  bookStatus: string;
}) {
  const [booking] = await db
    .insert(bookings)
    .values({
      customerId: input.customerId,
      type: input.type,
      service: input.svc[0],
      serviceTe: input.svc[1],
      slot: input.slot?.[0],
      slotTe: input.slot?.[1],
      address: input.address,
      amountPaise: amountForType(input.type),
      bookStatus: input.bookStatus,
      active: true,
    })
    .returning();
  return booking;
}

export async function updateBooking(
  bookingId: string,
  data: Partial<{
    bookStatus: string;
    payStatus: string;
    asgStatus: string;
    refStatus: string;
    supStatus: string;
    professional: string;
    quoteJson: string;
    active: boolean;
  }>
) {
  const [booking] = await db.update(bookings).set(data).where(eq(bookings.id, bookingId)).returning();
  return booking;
}

export async function activeBookingForCustomer(customerId: string) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.customerId, customerId),
        eq(bookings.active, true),
        not(
          or(
            ilike(bookings.bookStatus, "%Completed%"),
            ilike(bookings.bookStatus, "%Cancelled%"),
            ilike(bookings.bookStatus, "%declined%"),
            ilike(bookings.bookStatus, "%Closed%")
          )!
        )
      )
    )
    .orderBy(desc(bookings.createdAt))
    .limit(1);
  return booking ?? null;
}

export async function openSupportCase(waId: string, bookingId: string | null, note?: string) {
  const [supportCase] = await db
    .insert(supportCases)
    .values({ customerWaId: waId, bookingId, status: "opened", note })
    .returning();
  return supportCase;
}

export function serviceLabel(lang: Lang, service: string, serviceTe?: string | null) {
  return lang === "te" && serviceTe ? serviceTe : service;
}

export function bookingSummary(
  lang: Lang,
  b: {
    type: string;
    service: string;
    serviceTe?: string | null;
    bookStatus: string;
    payStatus: string;
  }
) {
  const typeLabel =
    b.type === "assisted"
      ? L(lang, ["Assisted booking", "అసిస్టెడ్ బుకింగ్"])
      : b.type === "variable"
        ? L(lang, ["Variable-price booking", "ధర మారే బుకింగ్"])
        : L(lang, ["Instant booking", "తక్షణ బుకింగ్"]);
  const svc = serviceLabel(lang, b.service, b.serviceTe);
  if (lang === "te") {
    return `${typeLabel}\n${svc}\nబుకింగ్: ${b.bookStatus}\nచెల్లింపు: ${b.payStatus}`;
  }
  return `${typeLabel}\n${svc}\nBooking: ${b.bookStatus}\nPayment: ${b.payStatus}`;
}
