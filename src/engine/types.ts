import type { Lang, Pair } from "./i18n.js";

export type BookingType = "instant" | "assisted" | "variable";

export type StatusTracks = {
  conv: string;
  book: string;
  pay: string;
  asg: string;
  ref: string;
  sup: string;
};

export type SessionState = {
  waId: string;
  lang: Lang;
  type: BookingType | null;
  svc: Pair | null;
  slot: Pair | null;
  address: string | null;
  draft: boolean;
  last: string;
  current: string;
  bookingId: string | null;
  tracks: StatusTracks;
};

export type OutgoingButton = {
  id: string;
  title: string;
  /** sim = prototype-only control (payment result / OTP entered) */
  style?: "default" | "sim" | "hi";
};

export type OutgoingMessage =
  | { kind: "text"; text: string }
  | { kind: "buttons"; body: string; buttons: OutgoingButton[] }
  | { kind: "tag"; text: string };

export type ApplyPatch = Partial<{
  type: BookingType;
  svc: Pair;
  slot: Pair;
  address: string;
  draft: boolean;
  last: string;
  book: string;
  pay: string;
  asg: string;
  ref: string;
  sup: string;
  bookingId: string | null;
}>;

export type OptionDef = {
  id: string;
  label: Pair;
  next: string | ((s: SessionState) => string);
  apply?: ApplyPatch;
  style?: "default" | "sim" | "hi";
};

export type NodeDef = {
  id: string;
  title?: string;
  messages: Array<
    Pair | ((s: SessionState) => Pair | null | Promise<Pair | null>)
  >;
  options?: OptionDef[] | ((s: SessionState) => OptionDef[]);
  /** Auto-advance after delayMs */
  auto?: { next: string | ((s: SessionState) => string); delayMs?: number };
  onEnter?: ApplyPatch | ((s: SessionState) => ApplyPatch | Promise<ApplyPatch>);
  /** Side-effect hook (create booking, payment, OTP, etc.) */
  effect?: (s: SessionState) => Promise<ApplyPatch | void>;
};
