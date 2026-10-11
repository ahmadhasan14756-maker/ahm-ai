import { serverEnv } from "../../../../lib/env";
import { webhookSecret } from "../../../../lib/telegram";
// Open https://YOUR-SITE/api/telegram/setup once to connect the bot to this app.
// Safe to open many times: it can only point the bot at this same site.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const text = (s, status = 200) => new Response(s, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export async function GET(req) {
  const url = new URL(req.url);
  const token = serverEnv("TELEGRAM_BOT_TOKEN");
  if (!token) return text("❌ TELEGRAM_BOT_TOKEN لە Vercel دانەنراوە.", 500);
  if (!/^\d+:[\w-]{30,}$/.test(token)) return text("❌ TELEGRAM_BOT_TOKEN هەڵەیە. دەبێت وەک 123456:ABC... بێت (هەمووی کۆپی بکە).", 500);

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: `${url.origin}/api/telegram`, secret_token: webhookSecret(), allowed_updates: ["message", "callback_query"] }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) return text("❌ هەڵە لە تەلەگرامەوە: " + (data.description || "نەزانراو"), 502);

  await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commands: [
      { command: "start", description: "دەستپێکردن و نرخەکان" },
      { command: "myid", description: "ID ی تەلەگرامەکەت" },
      { command: "stats", description: "ئامار (تەنها خاوەن)" },
      { command: "users", description: "بەکارهێنەران (تەنها خاوەن)" },
    ] }),
  }).catch(() => {});

  const admin = (serverEnv("ADMIN_TELEGRAM_ID").match(/\d{5,}/) || [])[0] || "7384823854";
  const adminNote = /^\d+$/.test(admin) ? "✅ ID ی خاوەن دانراوە." : "⚠️ ADMIN_TELEGRAM_ID دانەنراوە یان هەڵەیە (دەبێت تەنها ژمارە بێت).";
  return text("✅ بۆتەکە بەسترایەوە! ئێستا لە تەلەگرام /start بنێرە.\n" + adminNote);
}
