import { prisma } from "../db.js";
import { getOrCreateSession } from "../domain/booking.js";
import type { Lang, Pair } from "./i18n.js";
import type { BookingType, SessionState, StatusTracks, ApplyPatch } from "./types.js";

const emptyTracks = (): StatusTracks => ({
  conv: "Home menu",
  book: "—",
  pay: "—",
  asg: "—",
  ref: "—",
  sup: "—",
});

function parseDraftJson(raw: string): {
  bookingId?: string | null;
  tracks?: StatusTracks;
  svc?: Pair | null;
  slot?: Pair | null;
} {
  try {
    return JSON.parse(raw || "{}") as {
      bookingId?: string | null;
      tracks?: StatusTracks;
      svc?: Pair | null;
      slot?: Pair | null;
    };
  } catch {
    return {};
  }
}

export async function loadState(waId: string): Promise<SessionState & { customerId: string }> {
  const { customer, session } = await getOrCreateSession(waId);
  const draft = parseDraftJson(session.draftJson);
  const tracks = draft.tracks ?? emptyTracks();
  const svc: Pair | null =
    draft.svc ??
    (session.service ? ([session.service, session.serviceTe ?? session.service] as Pair) : null);
  const slot: Pair | null =
    draft.slot ??
    (session.slot ? ([session.slot, session.slotTe ?? session.slot] as Pair) : null);

  return {
    waId,
    customerId: customer.id,
    lang: (customer.lang as Lang) || "en",
    type: (session.bookingType as BookingType) || null,
    svc,
    slot,
    address: session.address ?? customer.savedAddress ?? "Warangal, Telangana",
    draft: session.draft,
    last: session.lastNode,
    current: session.currentNode,
    bookingId: draft.bookingId ?? null,
    tracks,
  };
}

export async function saveState(
  state: SessionState & { customerId?: string }
): Promise<void> {
  const { customer, session } = await getOrCreateSession(state.waId);
  await prisma.customer.update({
    where: { id: customer.id },
    data: { lang: state.lang },
  });
  const draftJson = JSON.stringify({
    bookingId: state.bookingId,
    tracks: state.tracks,
    svc: state.svc,
    slot: state.slot,
  });
  await prisma.session.update({
    where: { id: session.id },
    data: {
      currentNode: state.current,
      lastNode: state.last,
      draft: state.draft,
      bookingType: state.type,
      service: state.svc?.[0] ?? null,
      serviceTe: state.svc?.[1] ?? null,
      slot: state.slot?.[0] ?? null,
      slotTe: state.slot?.[1] ?? null,
      address: state.address,
      draftJson,
    },
  });
}

export function applyPatch<T extends SessionState>(state: T, patch?: ApplyPatch | null): T {
  if (!patch) return state;
  const next = { ...state, tracks: { ...state.tracks } };
  if (patch.type !== undefined) next.type = patch.type;
  if (patch.svc !== undefined) next.svc = patch.svc;
  if (patch.slot !== undefined) next.slot = patch.slot;
  if (patch.address !== undefined) next.address = patch.address;
  if (patch.draft !== undefined) next.draft = patch.draft;
  if (patch.last !== undefined) next.last = patch.last;
  if (patch.bookingId !== undefined) next.bookingId = patch.bookingId;
  if (patch.book !== undefined) next.tracks.book = patch.book;
  if (patch.pay !== undefined) next.tracks.pay = patch.pay;
  if (patch.asg !== undefined) next.tracks.asg = patch.asg;
  if (patch.ref !== undefined) next.tracks.ref = patch.ref;
  if (patch.sup !== undefined) next.tracks.sup = patch.sup;
  return next;
}

export async function resetConversation(waId: string): Promise<SessionState & { customerId: string }> {
  const { customer, session } = await getOrCreateSession(waId);
  await prisma.session.update({
    where: { id: session.id },
    data: {
      currentNode: "home",
      lastNode: "home",
      draft: false,
      bookingType: null,
      service: null,
      serviceTe: null,
      slot: null,
      slotTe: null,
      draftJson: "{}",
    },
  });
  return loadState(waId);
}

export function setLang(waId: string, lang: Lang) {
  return prisma.customer.update({ where: { waId }, data: { lang } });
}
