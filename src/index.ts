import { app } from "./app.js";
import { env, isLiveMode, liveReady } from "./config.js";

app.listen(env.PORT, () => {
  console.log(`ReadyLocal bot listening on http://localhost:${env.PORT}`);
  console.log(`Mode: ${env.WHATSAPP_MODE}${liveReady() ? " (credentials present)" : ""}`);
  if (!isLiveMode()) {
    console.log(`Simulator: http://localhost:${env.PORT}/simulate`);
  } else if (!liveReady()) {
    console.warn(
      "WHATSAPP_MODE=live but token/phone number id missing — live sends will fail until .env is filled."
    );
  }
});
