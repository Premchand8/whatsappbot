import { assertLiveCredentials, env, isLiveMode, liveReady } from "../config.js";
import type { OutgoingMessage } from "../engine/types.js";
import { buildTemplatePayload, type TemplateKey } from "./templates.js";

const GRAPH = "https://graph.facebook.com/v21.0";

async function graphPost(path: string, body: unknown) {
  assertLiveCredentials();
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(data.error?.message || `WhatsApp API error ${res.status}`);
  }
  return data;
}

export async function sendText(to: string, text: string) {
  return graphPost(`${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { preview_url: false, body: text },
  });
}

export async function sendButtons(
  to: string,
  body: string,
  buttons: Array<{ id: string; title: string }>
) {
  const limited = buttons.slice(0, 3).map((b) => ({
    type: "reply",
    reply: { id: b.id, title: b.title.slice(0, 20) },
  }));
  return graphPost(`${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body.slice(0, 1024) },
      action: { buttons: limited },
    },
  });
}

export async function sendList(
  to: string,
  body: string,
  buttonLabel: string,
  rows: Array<{ id: string; title: string; description?: string }>
) {
  return graphPost(`${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: body.slice(0, 1024) },
      action: {
        button: buttonLabel.slice(0, 20),
        sections: [
          {
            title: "Options",
            rows: rows.slice(0, 10).map((r) => ({
              id: r.id,
              title: r.title.slice(0, 24),
              description: r.description?.slice(0, 72),
            })),
          },
        ],
      },
    },
  });
}

export async function sendTemplate(to: string, key: TemplateKey, params: string[] = []) {
  return graphPost(`${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: buildTemplatePayload(key, params),
  });
}

/** Deliver engine messages via Cloud API. Falls back safely if not live-ready. */
export async function deliver(to: string, messages: OutgoingMessage[]): Promise<void> {
  if (!isLiveMode() || !liveReady()) {
    console.warn("[whatsapp] deliver skipped — not in live mode or missing credentials");
    return;
  }
  for (const m of messages) {
    if (m.kind === "text" || m.kind === "tag") {
      await sendText(to, m.text);
    } else if (m.kind === "buttons") {
      if (m.buttons.length <= 3) {
        await sendButtons(to, m.body, m.buttons);
      } else {
        // Put choices in body + list for >3 options
        await sendList(
          to,
          m.body,
          "Choose",
          m.buttons.map((b) => ({ id: b.id, title: b.title }))
        );
      }
    }
  }
}
