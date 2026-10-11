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

// The owner's Telegram chat (ADMIN_TELEGRAM_ID, or Ahmad's id).
export const adminChatId = () => (serverEnv("ADMIN_TELEGRAM_ID").match(/\d{5,}/) || [])[0] || "7384823854";

export const escHtml = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

// Sends a message to the owner in Telegram. Never throws.
export async function notifyOwner(text) {
  const token = serverEnv("TELEGRAM_BOT_TOKEN");
  if (!token) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: adminChatId(), text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    return res.ok;
  } catch (e) {
    console.error("notifyOwner", e?.message);
    return false;
  }
}
