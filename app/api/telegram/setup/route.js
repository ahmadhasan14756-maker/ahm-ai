// Open https://YOUR-SITE/api/telegram/setup?key=YOUR_TELEGRAM_WEBHOOK_SECRET once to connect the bot.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const url = new URL(req.url);
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || url.searchParams.get("key") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("❌ کلیلەکە هەڵەیە", { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: `${url.origin}/api/telegram`,
      secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ["message"],
    }),
  });
  const data = await res.json().catch(() => ({}));
  const ok = data.ok ? "✅ بۆتەکە بەسترایەوە! ئێستا لە تەلەگرام /start بنێرە." : "❌ هەڵە: " + (data.description || "نەزانراو");
  return new Response(ok, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
