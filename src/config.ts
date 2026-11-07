import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const schema = z.object({
  WHATSAPP_MODE: z.enum(["simulate", "live"]).default("simulate"),
  PORT: z.coerce.number().default(3000),
  PUBLIC_BASE_URL: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().default("file:./dev.db"),
  WHATSAPP_TOKEN: z.string().optional().default(""),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(""),
  WHATSAPP_VERIFY_TOKEN: z.string().default("readylocal_verify"),
  WHATSAPP_APP_SECRET: z.string().optional().default(""),
  TEMPLATE_BOOKING_UPDATE: z.string().default("booking_update"),
  TEMPLATE_ASSIGNMENT: z.string().default("professional_assigned"),
  TEMPLATE_START_OTP: z.string().default("start_otp"),
  TEMPLATE_COMPLETION_OTP: z.string().default("completion_otp"),
  TEMPLATE_LANGUAGE: z.string().default("en"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export function isLiveMode(): boolean {
  return env.WHATSAPP_MODE === "live";
}

export function assertLiveCredentials(): void {
  if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error(
      "WHATSAPP_MODE=live requires WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID. " +
        "Set them in .env or switch WHATSAPP_MODE=simulate."
    );
  }
}

export function liveReady(): boolean {
  return Boolean(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
}
