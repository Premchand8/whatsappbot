import { prisma } from "../db.js";
import type { BookingType } from "../engine/types.js";
import type { Pair } from "../engine/i18n.js";
import { L, type Lang } from "../engine/i18n.js";

export function amountForType(type: BookingType): number {
  if (type === "variable") return 19900;
  if (type === "assisted") return 1260000;
  return 29900;
}

export async function ensureCustomer(waId: string, lang: Lang = "en") {
  return prisma.customer.upsert({
    where: { waId },
    create: { waId, lang, savedAddress: "Warangal, Telangana" },
    update: {},
  });
}

export async function getOrCreateSession(waId: string) {
  const customer = await ensureCustomer(waId);
  let session = await prisma.session.findUnique({ where: { customerId: customer.id } });
  if (!session) {
    session = await prisma.session.create({ data: { customerId: customer.id } });
  }
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
  return prisma.booking.create({
    data: {
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
    },
  });
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
  return prisma.booking.update({ where: { id: bookingId }, data });
}

export async function activeBookingForCustomer(customerId: string) {
  return prisma.booking.findFirst({
    where: {
      customerId,
      active: true,
      NOT: {
        OR: [
          { bookStatus: { contains: "Completed" } },
          { bookStatus: { contains: "Cancelled" } },
          { bookStatus: { contains: "declined" } },
          { bookStatus: { contains: "Closed" } },
        ],
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function openSupportCase(waId: string, bookingId: string | null, note?: string) {
  return prisma.supportCase.create({
    data: {
      customerWaId: waId,
      bookingId: bookingId ?? undefined,
      status: "opened",
      note,
    },
  });
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
