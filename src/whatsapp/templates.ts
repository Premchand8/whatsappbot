import { env } from "../config.js";

export type TemplateKey =
  | "booking_update"
  | "assignment"
  | "start_otp"
  | "completion_otp";

const map: Record<TemplateKey, () => string> = {
  booking_update: () => env.TEMPLATE_BOOKING_UPDATE,
  assignment: () => env.TEMPLATE_ASSIGNMENT,
  start_otp: () => env.TEMPLATE_START_OTP,
  completion_otp: () => env.TEMPLATE_COMPLETION_OTP,
};

export function templateName(key: TemplateKey): string {
  return map[key]();
}

export function buildTemplatePayload(
  key: TemplateKey,
  bodyParams: string[]
): {
  name: string;
  language: { code: string };
  components?: Array<{
    type: string;
    parameters: Array<{ type: string; text: string }>;
  }>;
} {
  return {
    name: templateName(key),
    language: { code: env.TEMPLATE_LANGUAGE || "en" },
    components:
      bodyParams.length === 0
        ? undefined
        : [
            {
              type: "body",
              parameters: bodyParams.map((text) => ({ type: "text", text })),
            },
          ],
  };
}
