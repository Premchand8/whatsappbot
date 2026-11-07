import { P, backToMenu, defaultAddress, type Pair } from "./i18n.js";
import type { NodeDef, SessionState } from "./types.js";
import {
  createBooking,
  updateBooking,
  activeBookingForCustomer,
  openSupportCase,
  bookingSummary,
  amountForType,
} from "../domain/booking.js";
import { paymentProvider } from "../domain/payment.js";
import { issueOtp } from "../domain/otp.js";
import { and, desc, eq } from "drizzle-orm";
import { db, customers, payments, supportCases } from "../db.js";

async function customerByWaId(waId: string) {
  const [customer] = await db.select().from(customers).where(eq(customers.waId, waId));
  if (!customer) throw new Error(`Customer ${waId} not found`);
  return customer;
}

const isA = (s: SessionState) => s.type === "assisted";
const svc = (s: SessionState) => (s.svc ? (s.lang === "te" ? s.svc[1] : s.svc[0]) : "Service");
const slot = (s: SessionState) => (s.slot ? (s.lang === "te" ? s.slot[1] : s.slot[0]) : "—");
const addr = (s: SessionState) => s.address ?? (s.lang === "te" ? defaultAddress[1] : defaultAddress[0]);

const SLOTS = [
  P("Today, 10 AM–12 PM", "ఈ రోజు, ఉ. 10–మ. 12"),
  P("Today, 2–4 PM", "ఈ రోజు, మ. 2–సా. 4"),
  P("Tomorrow, 10 AM–12 PM", "రేపు, ఉ. 10–మ. 12"),
] as const;

async function ensureDraftBooking(s: SessionState, bookStatus: string) {
  if (!s.type || !s.svc) return {};
  if (s.bookingId) {
    await updateBooking(s.bookingId, { bookStatus });
    return { book: bookStatus };
  }
  const customer = await customerByWaId(s.waId);
  const b = await createBooking({
    customerId: customer.id,
    type: s.type,
    svc: s.svc,
    slot: s.slot,
    address: addr(s),
    bookStatus,
  });
  return { bookingId: b.id, book: bookStatus };
}

export const nodes: Record<string, NodeDef> = {
  home: {
    id: "home",
    title: "Home menu",
    messages: [
      (s) =>
        s.draft
          ? P(
              "You have an unfinished booking. Would you like to continue?",
              "మీకు పూర్తికాని బుకింగ్ ఉంది. కొనసాగిస్తారా?"
            )
          : null,
      P(
        "Welcome to ReadyLocal! What service do you need?",
        "ReadyLocal కు స్వాగతం! మీకు ఏ సేవ కావాలి?"
      ),
    ],
    options: (s) => [
      ...(s.draft
        ? [
            {
              id: "continue",
              label: P("Continue Previous Booking", "మునుపటి బుకింగ్ కొనసాగించండి"),
              next: s.last || "cat",
              style: "hi" as const,
            },
          ]
        : []),
      { id: "book", label: P("Book a Service", "సేవ బుక్ చేయండి"), next: "cat" },
      { id: "mine", label: P("My Bookings", "నా బుకింగ్‌లు"), next: "mine" },
      { id: "help", label: P("Help & Support", "సహాయం & మద్దతు"), next: "help" },
      {
        id: "lang_en",
        label: P("English", "English"),
        next: "set_lang_en",
      },
      {
        id: "lang_te",
        label: P("తెలుగు", "తెలుగు"),
        next: "set_lang_te",
      },
    ],
  },

  set_lang_en: {
    id: "set_lang_en",
    messages: [P("Language set to English.", "Language set to English.")],
    effect: async (s) => {
      s.lang = "en";
      await db.update(customers).set({ lang: "en" }).where(eq(customers.waId, s.waId));
    },
    auto: { next: "home", delayMs: 400 },
  },

  set_lang_te: {
    id: "set_lang_te",
    messages: [P("భాష తెలుగుకు మార్చబడింది.", "భాష తెలుగుకు మార్చబడింది.")],
    effect: async (s) => {
      s.lang = "te";
      await db.update(customers).set({ lang: "te" }).where(eq(customers.waId, s.waId));
    },
    auto: { next: "home", delayMs: 400 },
  },

  cat: {
    id: "cat",
    title: "Choosing service",
    messages: [P("Choose a service category.", "సేవ వర్గాన్ని ఎంచుకోండి.")],
    options: [
      {
        id: "plumbing",
        label: P("Plumbing", "ప్లంబింగ్"),
        next: "iIssue",
        apply: { type: "instant", draft: true },
      },
      {
        id: "nursing",
        label: P("Nursing & caretaker", "నర్సింగ్ & కేర్‌టేకర్"),
        next: "aReq",
        apply: { type: "assisted", draft: true },
      },
      {
        id: "ac",
        label: P("AC & appliance repair", "AC & అప్లయన్స్ రిపేర్"),
        next: "vIssue",
        apply: { type: "variable", draft: true },
      },
      { id: "back", label: backToMenu, next: "home" },
    ],
  },

  iIssue: {
    id: "iIssue",
    messages: [P("What help do you need?", "మీకు ఎలాంటి సహాయం కావాలి?")],
    options: [
      {
        id: "leak",
        label: P("Water leakage", "నీటి లీకేజీ"),
        next: "addr",
        apply: { svc: P("Plumbing: water leakage", "ప్లంబింగ్: నీటి లీకేజీ") },
      },
      {
        id: "tap",
        label: P("Tap repair", "ట్యాప్ రిపేర్"),
        next: "addr",
        apply: { svc: P("Plumbing: tap repair", "ప్లంబింగ్: ట్యాప్ రిపేర్") },
      },
      {
        id: "drain",
        label: P("Blocked drain", "డ్రైన్ బ్లాక్"),
        next: "addr",
        apply: { svc: P("Plumbing: blocked drain", "ప్లంబింగ్: డ్రైన్ బ్లాక్") },
      },
    ],
  },

  vIssue: {
    id: "vIssue",
    messages: [P("What needs repair?", "దేనికి రిపేర్ కావాలి?")],
    options: [
      {
        id: "ac_cool",
        label: P("AC not cooling", "AC చల్లబడటం లేదు"),
        next: "addr",
        apply: { svc: P("AC repair", "AC రిపేర్") },
      },
      {
        id: "wm",
        label: P("Washing machine", "వాషింగ్ మెషిన్"),
        next: "addr",
        apply: { svc: P("Washing machine repair", "వాషింగ్ మెషిన్ రిపేర్") },
      },
      {
        id: "fridge",
        label: P("Refrigerator", "ఫ్రిజ్"),
        next: "addr",
        apply: { svc: P("Refrigerator repair", "ఫ్రిజ్ రిపేర్") },
      },
    ],
  },

  aReq: {
    id: "aReq",
    messages: [
      P(
        "What kind of care do you need? Please avoid sharing detailed medical history here.",
        "మీకు ఎలాంటి సేవ కావాలి? వివరమైన వైద్య చరిత్రను ఇక్కడ పంచుకోవద్దు."
      ),
    ],
    options: [
      {
        id: "care",
        label: P("Caretaker (non-clinical)", "కేర్‌టేకర్ (వైద్యేతర)"),
        next: "aDur",
        apply: { svc: P("Caretaker", "కేర్‌టేకర్") },
      },
      {
        id: "nurse",
        label: P("Nursing", "నర్సింగ్"),
        next: "aDur",
        apply: { svc: P("Nursing care", "నర్సింగ్ సేవ") },
      },
      {
        id: "physio",
        label: P("Physiotherapy", "ఫిజియోథెరపీ"),
        next: "aDur",
        apply: { svc: P("Physiotherapy", "ఫిజియోథెరపీ") },
      },
    ],
  },

  aDur: {
    id: "aDur",
    messages: [P("For how long?", "ఎంత కాలం కావాలి?")],
    options: [
      { id: "w1", label: P("1 week", "1 వారం"), next: "addr" },
      { id: "m1", label: P("1 month", "1 నెల"), next: "addr" },
      { id: "ongoing", label: P("Ongoing", "నిరంతరం"), next: "addr" },
    ],
  },

  addr: {
    id: "addr",
    messages: [P("Where do you need the service?", "సేవ ఎక్కడ కావాలి?")],
    options: [
      {
        id: "saved",
        label: P("Use saved: Warangal", "సేవ్ చేసినది: వరంగల్"),
        next: "chk",
        apply: { address: "Warangal, Telangana" },
      },
      {
        id: "newloc",
        label: P("Share new location", "కొత్త లొకేషన్ పంపండి"),
        next: "chk",
        apply: { address: "Warangal, Telangana" },
      },
      { id: "back", label: backToMenu, next: "home" },
    ],
  },

  chk: {
    id: "chk",
    messages: [
      P(
        "Checking that we serve this location…",
        "ఈ ప్రాంతంలో సేవ అందుబాటులో ఉందో చూస్తున్నాం…"
      ),
      P("Good news, we serve your area.", "శుభవార్త, మీ ప్రాంతంలో మేము సేవ అందిస్తున్నాం."),
    ],
    auto: { next: (s) => (isA(s) ? "aPref" : "slot"), delayMs: 600 },
  },

  slot: {
    id: "slot",
    title: "Choosing slot",
    messages: [
      P(
        "When would you like the service? These are live available slots.",
        "మీకు సేవ ఎప్పుడు కావాలి? ఇవి అందుబాటులో ఉన్న సమయాలు."
      ),
    ],
    options: SLOTS.map((p, i) => ({
      id: `slot_${i}`,
      label: p,
      next: "review",
      apply: { slot: p },
    })),
  },

  aPref: {
    id: "aPref",
    messages: [
      P(
        "When would you like to start? This is a preference, the coordinator will confirm.",
        "ఎప్పుడు ప్రారంభించాలి? ఇది మీ ఇష్టం మాత్రమే, కోఆర్డినేటర్ నిర్ధారిస్తారు."
      ),
    ],
    options: [
      {
        id: "tm",
        label: P("Tomorrow morning", "రేపు ఉదయం"),
        next: "aSub",
        apply: { slot: P("Tomorrow morning", "రేపు ఉదయం") },
      },
      {
        id: "we",
        label: P("This weekend", "ఈ వారాంతం"),
        next: "aSub",
        apply: { slot: P("This weekend", "ఈ వారాంతం") },
      },
      {
        id: "flex",
        label: P("Flexible", "సౌకర్యంగా"),
        next: "aSub",
        apply: { slot: P("Flexible", "సౌకర్యంగా") },
      },
    ],
  },

  aSub: {
    id: "aSub",
    onEnter: { book: "Requested, under review", draft: false },
    messages: [
      P(
        "Request sent to our care coordinator. We will review it and send a written scope and quotation here. No payment is needed yet.",
        "మీ అభ్యర్థన మా కేర్ కోఆర్డినేటర్‌కు పంపాం. సమీక్షించి, వ్రాతపూర్వక వివరాలు, కోటేషన్ ఇక్కడ పంపుతాం. ఇప్పుడు చెల్లింపు అవసరం లేదు."
      ),
    ],
    effect: async (s) => ensureDraftBooking(s, "Requested, under review"),
    auto: { next: "aQuote", delayMs: 1200 },
  },

  aQuote: {
    id: "aQuote",
    onEnter: { book: "Quoted, awaiting approval" },
    messages: [
      (s) =>
        P(
          `Your quotation\n\nService: ${svc(s)}\nVisits: 8 hrs/day × 7 days\nStart: ${slot(s)}\nTotal: ₹12,600 (sample)\n\nConsent and safety checks happen before the first visit.`,
          `మీ కోటేషన్\n\nసేవ: ${svc(s)}\nవిజిట్‌లు: రోజుకు 8 గంటలు × 7 రోజులు\nప్రారంభం: ${slot(s)}\nమొత్తం: ₹12,600 (నమూనా)\n\nమొదటి విజిట్‌కు ముందు సమ్మతి, భద్రతా తనిఖీలు జరుగుతాయి.`
        ),
    ],
    effect: async (s) => {
      if (s.bookingId) await updateBooking(s.bookingId, { bookStatus: "Quoted, awaiting approval" });
    },
    options: [
      {
        id: "approve",
        label: P("Approve & pay", "ఆమోదించి చెల్లించండి"),
        next: "pay",
        apply: { book: "Quote approved" },
      },
      {
        id: "decline",
        label: P("Decline quote", "తిరస్కరించండి"),
        next: "qDecl",
        apply: { book: "Quote declined" },
      },
      { id: "ask", label: P("Ask a question", "ప్రశ్న అడగండి"), next: "human" },
    ],
  },

  qDecl: {
    id: "qDecl",
    messages: [
      P("Quote declined. Nothing was charged.", "కోటేషన్ తిరస్కరించారు. ఎలాంటి ఛార్జ్ లేదు."),
    ],
    effect: async (s) => {
      if (s.bookingId) await updateBooking(s.bookingId, { bookStatus: "Quote declined", active: false });
    },
    options: [{ id: "back", label: backToMenu, next: "home" }],
  },

  review: {
    id: "review",
    title: "Reviewing price",
    onEnter: { book: "Draft: awaiting payment" },
    messages: [
      (s) =>
        s.type === "variable"
          ? P(
              `Review before paying\n\nService: ${svc(s)}\nAddress: ${addr(s)}\nSlot: ${slot(s)}\nInspection fee: ₹199\n\nParts or extra labour are quoted first. You are charged for them only after you approve.`,
              `చెల్లించే ముందు సమీక్షించండి\n\nసేవ: ${svc(s)}\nచిరునామా: ${addr(s)}\nసమయం: ${slot(s)}\nఇన్‌స్పెక్షన్ ఫీజు: ₹199\n\nభాగాలు లేదా అదనపు పని ముందుగా కోట్ చేస్తాం. మీరు ఆమోదించిన తర్వాతే వాటికి ఛార్జ్ ఉంటుంది.`
            )
          : P(
              `Review the scope and price, then pay securely.\n\nService: ${svc(s)}\nAddress: ${addr(s)}\nSlot: ${slot(s)}\nService charge: ₹299`,
              `సేవ వివరాలు, ధర చూసి సురక్షితంగా చెల్లించండి.\n\nసేవ: ${svc(s)}\nచిరునామా: ${addr(s)}\nసమయం: ${slot(s)}\nసేవా ఛార్జ్: ₹299`
            ),
    ],
    effect: async (s) => ensureDraftBooking(s, "Draft: awaiting payment"),
    options: [
      { id: "pay", label: P("Pay now", "ఇప్పుడే చెల్లించండి"), next: "pay" },
      { id: "change", label: P("Change slot", "సమయం మార్చండి"), next: "slot" },
    ],
  },

  pay: {
    id: "pay",
    title: "At checkout",
    messages: [
      P(
        "Secure checkout opened. Choose the payment result (mock provider).",
        "సురక్షిత చెక్‌అవుట్ తెరుచుకుంది. చెల్లింపు ఫలితాన్ని ఎంచుకోండి (మాక్)."
      ),
    ],
    effect: async (s) => {
      if (!s.bookingId && s.type && s.svc) {
        const patch = await ensureDraftBooking(s, s.tracks.book || "Draft: awaiting payment");
        Object.assign(s, patch);
        if (patch.bookingId) s.bookingId = patch.bookingId;
      }
      if (s.bookingId && s.type) {
        await paymentProvider.createCheckout({
          bookingId: s.bookingId,
          amountPaise: amountForType(s.type),
        });
      }
    },
    options: [
      { id: "ok", label: P("Payment succeeds", "చెల్లింపు విజయవంతం"), next: "paid", style: "sim" },
      { id: "fail", label: P("Payment fails", "చెల్లింపు విఫలం"), next: "pfail", style: "sim" },
      { id: "pend", label: P("Payment pending", "చెల్లింపు పెండింగ్"), next: "ppend", style: "sim" },
    ],
  },

  pfail: {
    id: "pfail",
    onEnter: { pay: "Failed", asg: "Not started" },
    messages: [
      P(
        "Your payment was not successful. Your booking details are saved.",
        "మీ చెల్లింపు విజయవంతం కాలేదు. మీ బుకింగ్ వివరాలు సేవ్ అయ్యాయి."
      ),
    ],
    effect: async (s) => {
      if (s.bookingId) await updateBooking(s.bookingId, { payStatus: "Failed", asgStatus: "Not started" });
    },
    options: [
      { id: "retry", label: P("Retry payment", "మళ్ళీ చెల్లించండి"), next: "pay" },
      { id: "help", label: P("Help", "సహాయం"), next: "help" },
    ],
  },

  ppend: {
    id: "ppend",
    onEnter: { pay: "Pending", asg: "Not started" },
    messages: [
      P(
        "We are checking your payment status. Please do not pay again.",
        "చెల్లింపు స్థితిని తనిఖీ చేస్తున్నాం. దయచేసి మళ్ళీ చెల్లించవద్దు."
      ),
    ],
    effect: async (s) => {
      if (s.bookingId) await updateBooking(s.bookingId, { payStatus: "Pending", asgStatus: "Not started" });
    },
    options: [
      { id: "check", label: P("Check payment status", "చెల్లింపు స్థితి చూడండి"), next: "paid" },
      { id: "help", label: P("Help", "సహాయం"), next: "help" },
    ],
  },

  paid: {
    id: "paid",
    onEnter: { pay: "Paid (server verified)", book: "Accepted", asg: "Pending", draft: false },
    messages: [
      P(
        "Payment received. We are arranging your Service Professional.",
        "పేమెంట్ అందింది. మీ కోసం సర్వీస్ ప్రొఫెషనల్‌ని ఏర్పాటు చేస్తున్నాం."
      ),
    ],
    effect: async (s) => {
      if (s.bookingId) {
        const [pay] = await db
          .select()
          .from(payments)
          .where(eq(payments.bookingId, s.bookingId))
          .orderBy(desc(payments.createdAt))
          .limit(1);
        if (pay) await paymentProvider.markResult(pay.id, "paid");
        else
          await updateBooking(s.bookingId, {
            payStatus: "Paid (server verified)",
            bookStatus: "Accepted",
            asgStatus: "Pending",
          });
      }
    },
    auto: { next: "assigned", delayMs: 1000 },
  },

  assigned: {
    id: "assigned",
    onEnter: { asg: "Assigned" },
    messages: [
      (s) =>
        P(
          `Your Service Professional has been assigned.\n\n${
            isA(s) ? "Care coordinator: Sunita Rao" : "Ramesh Kumar, 4.8 rating, 312 jobs"
          }`,
          `మీకు సర్వీస్ ప్రొఫెషనల్‌ని కేటాయించాం.\n\n${
            isA(s) ? "కేర్ కోఆర్డినేటర్: సునీత రావు" : "రమేష్ కుమార్, రేటింగ్ 4.8, 312 పనులు"
          }`
        ),
    ],
    effect: async (s) => {
      if (s.bookingId) {
        await updateBooking(s.bookingId, {
          asgStatus: "Assigned",
          professional: isA(s) ? "Sunita Rao" : "Ramesh Kumar",
        });
      }
    },
    auto: { next: (s) => (isA(s) ? "aCo" : "otw"), delayMs: 1000 },
  },

  aCo: {
    id: "aCo",
    messages: [
      P(
        "Our coordinator will call you to confirm the start details, consent and safety checks.",
        "ప్రారంభ వివరాలు, సమ్మతి, భద్రతా తనిఖీలను నిర్ధారించడానికి మా కోఆర్డినేటర్ మీకు కాల్ చేస్తారు."
      ),
    ],
    options: [{ id: "back", label: backToMenu, next: "home" }],
  },

  otw: {
    id: "otw",
    onEnter: { asg: "On the way" },
    messages: [
      P("Your Service Professional is on the way.", "మీ సర్వీస్ ప్రొఫెషనల్ బయలుదేరారు."),
    ],
    effect: async (s) => {
      if (s.bookingId) await updateBooking(s.bookingId, { asgStatus: "On the way" });
    },
    auto: { next: "arr", delayMs: 900 },
  },

  arr: {
    id: "arr",
    onEnter: { asg: "Arrived" },
    messages: [
      P("Your Service Professional has arrived.", "మీ సర్వీస్ ప్రొఫెషనల్ వచ్చారు."),
    ],
    effect: async (s) => {
      if (s.bookingId) await updateBooking(s.bookingId, { asgStatus: "Arrived" });
    },
    auto: { next: "sotp", delayMs: 700 },
  },

  sotp: {
    id: "sotp",
    messages: [
      asyncMsgStartOtp,
    ],
    effect: async (s) => {
      if (s.bookingId) await issueOtp(s.bookingId, "start");
    },
    options: [
      {
        id: "otp_ok",
        label: P("Professional entered the OTP", "ప్రొఫెషనల్ OTP ఎంటర్ చేశారు"),
        next: (s) => (s.type === "variable" ? "insp" : "prog"),
        apply: { asg: "In progress" },
        style: "sim",
      },
    ],
  },

  prog: {
    id: "prog",
    messages: [P("Service in progress.", "సేవ జరుగుతోంది.")],
    effect: async (s) => {
      if (s.bookingId) await updateBooking(s.bookingId, { asgStatus: "In progress" });
    },
    options: [
      { id: "done", label: P("Work is finished", "పని పూర్తయింది"), next: "cotp" },
      { id: "issue", label: P("Report an issue", "సమస్య నివేదించండి"), next: "issue" },
    ],
  },

  insp: {
    id: "insp",
    messages: [P("Inspection in progress.", "ఇన్‌స్పెక్షన్ జరుగుతోంది.")],
    auto: { next: "vq", delayMs: 1000 },
  },

  vq: {
    id: "vq",
    onEnter: { book: "Extra work quoted" },
    messages: [
      P(
        "Additional work needed\n\nCompressor capacitor: ₹1,450\nLabour: ₹350\nTotal extra: ₹1,800\n\nNo work or charge starts until you approve.",
        "అదనపు పని అవసరం\n\nకంప్రెసర్ కెపాసిటర్: ₹1,450\nలేబర్: ₹350\nఅదనపు మొత్తం: ₹1,800\n\nమీరు ఆమోదించే వరకు పని లేదా ఛార్జ్ ప్రారంభం కాదు."
      ),
    ],
    effect: async (s) => {
      if (s.bookingId) await updateBooking(s.bookingId, { bookStatus: "Extra work quoted" });
    },
    options: [
      {
        id: "approve",
        label: P("Approve quote", "ఆమోదించండి"),
        next: "vw",
        apply: { book: "Extra work approved" },
      },
      { id: "decline", label: P("Decline", "తిరస్కరించండి"), next: "vd" },
    ],
  },

  vw: {
    id: "vw",
    messages: [
      P("Quote approved. Work is in progress.", "కోటేషన్ ఆమోదించారు. పని జరుగుతోంది."),
    ],
    effect: async (s) => {
      if (s.bookingId) await updateBooking(s.bookingId, { bookStatus: "Extra work approved" });
    },
    auto: { next: "cotp", delayMs: 900 },
  },

  vd: {
    id: "vd",
    onEnter: { book: "Closed after inspection" },
    messages: [
      P(
        "Quote declined. No extra work or charges. The inspection fee stays as disclosed before payment.",
        "కోటేషన్ తిరస్కరించారు. అదనపు పని, ఛార్జ్ లేవు. చెల్లింపుకు ముందు చెప్పిన ఇన్‌స్పెక్షన్ ఫీజు ఉంటుంది."
      ),
    ],
    effect: async (s) => {
      if (s.bookingId)
        await updateBooking(s.bookingId, { bookStatus: "Closed after inspection", active: false });
    },
    options: [{ id: "back", label: backToMenu, next: "home" }],
  },

  cotp: {
    id: "cotp",
    messages: [asyncMsgCompleteOtp],
    effect: async (s) => {
      if (s.bookingId) await issueOtp(s.bookingId, "complete");
    },
    options: [
      {
        id: "complete",
        label: P("Work complete, OTP shared", "పని పూర్తి, OTP చెప్పాను"),
        next: "done",
        apply: { book: "Completed", asg: "Completed" },
        style: "sim",
      },
      {
        id: "not_done",
        label: P("Work not complete: report issue", "పని పూర్తి కాలేదు: సమస్య నివేదించండి"),
        next: "issue",
      },
    ],
  },

  done: {
    id: "done",
    messages: [
      P("Service completed. Thank you!", "సేవ పూర్తయింది. ధన్యవాదాలు!"),
      P("How was your experience?", "మా సేవ మీకు ఎలా అనిపించింది?"),
    ],
    effect: async (s) => {
      if (s.bookingId)
        await updateBooking(s.bookingId, {
          bookStatus: "Completed",
          asgStatus: "Completed",
          active: false,
        });
    },
    options: [
      { id: "great", label: P("★★★★★ Great", "★★★★★ చాలా బాగుంది"), next: "thx" },
      { id: "ok", label: P("★★★ Okay", "★★★ పర్వాలేదు"), next: "thx" },
      { id: "poor", label: P("★ Poor", "★ బాగోలేదు"), next: "issue" },
    ],
  },

  thx: {
    id: "thx",
    messages: [P("Thanks for your feedback.", "మీ అభిప్రాయానికి ధన్యవాదాలు.")],
    options: [{ id: "back", label: backToMenu, next: "home" }],
  },

  issue: {
    id: "issue",
    onEnter: { sup: "Case opened" },
    messages: [
      P(
        "We are sorry you faced an issue. A support case is open with your booking details. You do not need to share the Completion OTP to raise a dispute.",
        "మీకు సమస్య ఎదురైనందుకు క్షమించండి. మీ బుకింగ్ వివరాలతో సపోర్ట్ కేసు తెరిచాం. వివాదం తెలపడానికి Completion OTP చెప్పాల్సిన అవసరం లేదు."
      ),
    ],
    effect: async (s) => {
      await openSupportCase(s.waId, s.bookingId, "Customer reported issue");
      if (s.bookingId) await updateBooking(s.bookingId, { supStatus: "Case opened" });
    },
    options: [{ id: "back", label: backToMenu, next: "home" }],
  },

  mine: {
    id: "mine",
    messages: [
      async (s) => {
        const customer = await customerByWaId(s.waId);
        const b = await activeBookingForCustomer(customer.id);
        if (!b && s.tracks.book === "—") {
          return P("You have no bookings yet.", "మీకు ఇంకా బుకింగ్‌లు లేవు.");
        }
        if (b) {
          return P(bookingSummary("en", b), bookingSummary("te", b));
        }
        return P(
          `Booking: ${s.tracks.book}\nPayment: ${s.tracks.pay}`,
          `బుకింగ్: ${s.tracks.book}\nచెల్లింపు: ${s.tracks.pay}`
        );
      },
    ],
    options: (s) => {
      const canCancel =
        s.tracks.book !== "—" &&
        !/Completed|Cancelled|declined|Closed/i.test(s.tracks.book);
      return [
        ...(canCancel
          ? [{ id: "cancel", label: P("Cancel booking", "బుకింగ్ రద్దు"), next: "canc" }]
          : []),
        { id: "back", label: backToMenu, next: "home" },
      ];
    },
  },

  canc: {
    id: "canc",
    messages: [
      P(
        "Cancellation terms: the refund shown here depends on how close the visit is. Sample: full refund if cancelled before assignment.",
        "రద్దు నిబంధనలు: విజిట్ ఎంత దగ్గరగా ఉందో బట్టి రీఫండ్ ఉంటుంది. నమూనా: కేటాయింపుకు ముందు రద్దు చేస్తే పూర్తి రీఫండ్."
      ),
    ],
    options: [
      {
        id: "confirm",
        label: P("Continue cancellation", "రద్దు కొనసాగించండి"),
        next: "cdone",
        apply: { book: "Cancelled", ref: "Processing" },
      },
      { id: "keep", label: P("Keep booking", "బుకింగ్ ఉంచండి"), next: "mine" },
    ],
  },

  cdone: {
    id: "cdone",
    messages: [
      P(
        "Booking cancelled. Refund is being processed. Time depends on your bank.",
        "బుకింగ్ రద్దయింది. రీఫండ్ ప్రాసెస్ అవుతోంది. సమయం మీ బ్యాంక్‌పై ఆధారపడి ఉంటుంది."
      ),
    ],
    effect: async (s) => {
      if (s.bookingId)
        await updateBooking(s.bookingId, {
          bookStatus: "Cancelled",
          refStatus: "Processing",
          active: false,
        });
      s.draft = false;
    },
    options: [{ id: "back", label: backToMenu, next: "home" }],
  },

  help: {
    id: "help",
    messages: [P("How can we help?", "మేము ఎలా సహాయం చేయగలం?")],
    options: [
      { id: "human", label: P("Talk to a person", "వ్యక్తితో మాట్లాడండి"), next: "human" },
      { id: "back", label: backToMenu, next: "home" },
    ],
  },

  human: {
    id: "human",
    onEnter: { sup: "Handed to agent" },
    messages: [
      P(
        "A support agent will join this chat with your booking and conversation details. If this is an emergency, please call local emergency services right away. WhatsApp support is not an emergency service.",
        "సపోర్ట్ ఏజెంట్ మీ బుకింగ్, సంభాషణ వివరాలతో ఈ చాట్‌లో చేరతారు. ఇది అత్యవసరమైతే, వెంటనే స్థానిక అత్యవసర సేవలకు కాల్ చేయండి. WhatsApp సపోర్ట్ అత్యవసర సేవ కాదు."
      ),
    ],
    effect: async (s) => {
      await openSupportCase(s.waId, s.bookingId, "Human handoff");
      if (s.bookingId) await updateBooking(s.bookingId, { supStatus: "Handed to agent" });
      await db
        .update(supportCases)
        .set({ status: "handed_off" })
        .where(and(eq(supportCases.customerWaId, s.waId), eq(supportCases.status, "opened")));
    },
    options: [{ id: "back", label: backToMenu, next: "home" }],
  },
};

function asyncMsgStartOtp(s: SessionState) {
  return P(
    "Start OTP: 4821\nShare it only when the professional has arrived and you are ready to begin. Valid for 30 minutes.",
    "Start OTP: 4821\nసర్వీస్ ప్రొఫెషనల్ వచ్చిన తర్వాత, పని ప్రారంభించడానికి సిద్ధంగా ఉన్నప్పుడే చెప్పండి. 30 నిమిషాలు చెల్లుతుంది."
  );
}

function asyncMsgCompleteOtp(s: SessionState) {
  return P(
    "Completion OTP: 7396\nShare it only after confirming the agreed work is complete.",
    "Completion OTP: 7396\nఅంగీకరించిన పని పూర్తయిందని నిర్ధారించుకున్న తర్వాతే చెప్పండి."
  );
}

// Fix types: messages can be functions returning Pair | null; mine uses async — adjust runner to await
export type MessageFn = (s: SessionState) => Pair | null | Promise<Pair | null>;
