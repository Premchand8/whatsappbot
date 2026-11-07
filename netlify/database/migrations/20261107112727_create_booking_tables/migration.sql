CREATE TABLE "bookings" (
	"id" text PRIMARY KEY,
	"customer_id" text NOT NULL,
	"type" text NOT NULL,
	"service" text NOT NULL,
	"service_te" text,
	"slot" text,
	"slot_te" text,
	"address" text,
	"amount_paise" integer DEFAULT 29900 NOT NULL,
	"book_status" text DEFAULT '—' NOT NULL,
	"pay_status" text DEFAULT '—' NOT NULL,
	"asg_status" text DEFAULT '—' NOT NULL,
	"ref_status" text DEFAULT '—' NOT NULL,
	"sup_status" text DEFAULT '—' NOT NULL,
	"professional" text,
	"quote_json" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY,
	"wa_id" text NOT NULL UNIQUE,
	"lang" text DEFAULT 'en' NOT NULL,
	"saved_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otps" (
	"id" text PRIMARY KEY,
	"booking_id" text NOT NULL,
	"kind" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY,
	"booking_id" text NOT NULL,
	"provider" text DEFAULT 'mock' NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"external_id" text,
	"amount_paise" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY,
	"customer_id" text NOT NULL UNIQUE,
	"current_node" text DEFAULT 'home' NOT NULL,
	"last_node" text DEFAULT 'home' NOT NULL,
	"draft" boolean DEFAULT false NOT NULL,
	"booking_type" text,
	"service" text,
	"service_te" text,
	"slot" text,
	"slot_te" text,
	"address" text,
	"draft_json" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_cases" (
	"id" text PRIMARY KEY,
	"booking_id" text,
	"customer_wa_id" text NOT NULL,
	"status" text DEFAULT 'opened' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "otps" ADD CONSTRAINT "otps_booking_id_bookings_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_booking_id_bookings_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL;