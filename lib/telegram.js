import { createHash } from "crypto";
import { serverEnv } from "./env";

// Server only. Secret Telegram sends back with every update: TELEGRAM_WEBHOOK_SECRET if set,
// otherwise one derived from the bot token (so nothing extra has to be configured).
export function webhookSecret() {
  const set = serverEnv("TELEGRAM_WEBHOOK_SECRET").replace(/[^A-Za-z0-9_-]/g, "");
  if (set) return set;
  const token = serverEnv("TELEGRAM_BOT_TOKEN");
  if (!token) return "";
  return createHash("sha256").update("ahm-webhook:" + token).digest("hex").slice(0, 48);
}
