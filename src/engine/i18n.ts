export type Lang = "en" | "te";

/** Pair of English / Telugu strings */
export type Pair = readonly [string, string];

export function L(lang: Lang, p: string | Pair): string {
  if (typeof p === "string") return p;
  return lang === "te" ? p[1] : p[0];
}

export const P = (en: string, te: string): Pair => [en, te] as const;

export const labels = {
  conversation: P("Conversation", "సంభాషణ"),
  booking: P("Booking", "బుకింగ్"),
  payment: P("Payment", "చెల్లింపు"),
  assignment: P("Assignment", "కేటాయింపు"),
  refund: P("Refund", "రీఫండ్"),
  support: P("Support", "సపోర్ట్"),
};

export const typeName = {
  instant: P("Instant booking", "తక్షణ బుకింగ్"),
  assisted: P("Assisted booking", "అసిస్టెడ్ బుకింగ్"),
  variable: P("Variable-price booking", "ధర మారే బుకింగ్"),
} as const;

export const defaultAddress = P("Warangal, Telangana", "వరంగల్, తెలంగాణ");
export const backToMenu = P("Back to menu", "మెనూకు వెళ్ళండి");
