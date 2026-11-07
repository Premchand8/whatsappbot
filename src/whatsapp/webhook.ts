import { createHmac, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { env, isLiveMode } from "../config.js";
import { handleInbound } from "../engine/runner.js";
import { deliver } from "./client.js";
import type { WaWebhookPayload } from "./types.js";

export function verifyWebhook(req: Request, res: Response) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
}

export function verifySignature(req: Request, res: Response, next: NextFunction) {
  if (!isLiveMode() || !env.WHATSAPP_APP_SECRET) {
    next();
    return;
  }
  const signature = req.get("x-hub-signature-256");
  if (!signature || !req.body) {
    res.sendStatus(401);
    return;
  }
  const raw = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!raw) {
    // If raw body unavailable, skip strict check in non-prod
    next();
    return;
  }
  const expected =
    "sha256=" + createHmac("sha256", env.WHATSAPP_APP_SECRET).update(raw).digest("hex");
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      res.sendStatus(401);
      return;
    }
  } catch {
    res.sendStatus(401);
    return;
  }
  next();
}

export async function handleWebhook(req: Request, res: Response) {
  res.sendStatus(200); // ack immediately
  const payload = req.body as WaWebhookPayload;
  if (payload.object !== "whatsapp_business_account") return;

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const messages = change.value?.messages || [];
      for (const msg of messages) {
        const from = msg.from;
        let buttonId: string | undefined;
        let text: string | undefined;
        if (msg.type === "interactive") {
          buttonId =
            msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id;
          text = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title;
        } else if (msg.type === "button") {
          buttonId = msg.button?.payload;
          text = msg.button?.text;
        } else if (msg.type === "text") {
          text = msg.text?.body;
        } else {
          text = "Hi";
        }
        try {
          const result = await handleInbound(from, { text, buttonId });
          await deliver(from, result.messages);
        } catch (err) {
          console.error("[webhook] handler error", err);
        }
      }
    }
  }
}
