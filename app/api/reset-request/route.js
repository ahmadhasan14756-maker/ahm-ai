// "Forgot password" when the reset e-mail can't be sent: the owner gets a Telegram message with a button that makes a new password.
import { adminDb } from "../../../lib/server";
import { serverEnv } from "../../../lib/env";
import { adminChatId, escHtml } from "../../../lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const recent = new Map(); // one request per e-mail every 10 minutes (per server instance)

export async function POST(req) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase().slice(0, 200);
  if (!EMAIL_RE.test(email)) return Response.json({ error: "bad_request" }, { status: 400 });
  if (Date.now() - (recent.get(email) || 0) < 10 * 60 * 1000) return Response.json({ ok: true }); // already sent
  recent.set(email, Date.now());

  const { data: p } = await adminDb().from("profiles").select("id,email").eq("email", email).maybeSingle();
  const token = serverEnv("TELEGRAM_BOT_TOKEN");
  if (token) {
    const text = p
      ? `🔐 <b>داواکاری وشەی نهێنی</b>\n👤 ${escHtml(p.email)}\nبەکارهێنەر وشەی نهێنییەکەی بیرچووە. ئەگەر دەتەوێت، دوگمەکە دابگرە بۆ دروستکردنی وشەیەکی نوێ.`
      : `🔐 داواکاری وشەی نهێنی بۆ ${escHtml(email)} — ئەم ئیمەیڵە تۆمار نەکراوە.`;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: adminChatId(), text, parse_mode: "HTML",
        ...(p ? { reply_markup: { inline_keyboard: [[{ text: "🔑 وشەی نهێنی نوێ دروست بکە", callback_data: `rp:${p.id}` }]] } } : {}),
      }),
    }).catch(() => {});
  }
  return Response.json({ ok: true }); // same answer either way (doesn't reveal who is registered)
}
