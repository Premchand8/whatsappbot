import { randomUUID } from "crypto";
import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey().$defaultFn(() => randomUUID());
const createdAt = () => timestamp("created_at").notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date());

export const customers = pgTable("customers", {
  id: id(),
  waId: text("wa_id").notNull().unique(),
  lang: text("lang").notNull().default("en"),
  savedAddress: text("saved_address"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable("sessions", {
  id: id(),
  customerId: text("customer_id")
    .notNull()
    .unique()
    .references(() => customers.id, { onDelete: "cascade" }),
  currentNode: text("current_node").notNull().default("home"),
  lastNode: text("last_node").notNull().default("home"),
  draft: boolean("draft").notNull().default(false),
  bookingType: text("booking_type"),
  service: text("service"),
  serviceTe: text("service_te"),
  slot: text("slot"),
  slotTe: text("slot_te"),
  address: text("address"),
  draftJson: text("draft_json").notNull().default("{}"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const bookings = pgTable("bookings", {
  id: id(),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // instant | assisted | variable
  service: text("service").notNull(),
  serviceTe: text("service_te"),
  slot: text("slot"),
  slotTe: text("slot_te"),
  address: text("address"),
  amountPaise: integer("amount_paise").notNull().default(29900),
  bookStatus: text("book_status").notNull().default("—"),
  payStatus: text("pay_status").notNull().default("—"),
  asgStatus: text("asg_status").notNull().default("—"),
  refStatus: text("ref_status").notNull().default("—"),
  supStatus: text("sup_status").notNull().default("—"),
  professional: text("professional"),
  quoteJson: text("quote_json"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const payments = pgTable("payments", {
  id: id(),
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("mock"),
  status: text("status").notNull().default("created"), // created | pending | paid | failed
  externalId: text("external_id"),
  amountPaise: integer("amount_paise").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const otps = pgTable("otps", {
  id: id(),
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // start | complete
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: createdAt(),
});

export const supportCases = pgTable("support_cases", {
  id: id(),
  bookingId: text("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  customerWaId: text("customer_wa_id").notNull(),
  status: text("status").notNull().default("opened"), // opened | handed_off | closed
  note: text("note"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
