import express from "express";
import cors from "cors";
import { env, isLiveMode, liveReady } from "./config.js";
import { simulateRouter } from "./simulate/routes.js";
import { handleWebhook, verifySignature, verifyWebhook } from "./whatsapp/webhook.js";

export const app = express();

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    mode: env.WHATSAPP_MODE,
    liveReady: liveReady(),
  });
});

app.get("/webhook/whatsapp", verifyWebhook);
app.post("/webhook/whatsapp", verifySignature, (req, res) => {
  void handleWebhook(req, res);
});

app.use("/simulate", simulateRouter);
app.get("/", (_req, res) => {
  if (isLiveMode()) {
    res.json({
      service: "ReadyLocal WhatsApp Booking Bot",
      mode: "live",
      webhook: "/webhook/whatsapp",
      health: "/health",
    });
  } else {
    res.redirect("/simulate");
  }
});

