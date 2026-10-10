import { adminDb, today, isProActive } from "../../../lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN = String(process.env.ADMIN_TELEGRAM_ID || "");
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function tg(method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json().catch(() => ({}));
}
const send = (chat_id, text) => tg("sendMessage", { chat_id, text, parse_mode: "HTML", disable_web_page_preview: true });

const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "-");

const WELCOME = () => `سڵاو! 👋 بەخێربێیت بۆ <b>AHM AI</b>

⭐ <b>بەشداریی Pro</b>
${esc(process.env.PAYMENT_INFO || "نرخ و ژمارەی FIB بەم زووانە دادەنرێت.")}

<b>چۆن Pro وەربگریت:</b>
١. پارەکە بە FIB بنێرە.
٢. وێنەی پسوولەکە (screenshot) لێرە بنێرە.
٣. ئەو ئیمەیڵە بنووسە کە لە ئەپەکەدا پێی تۆمار بوویت.

دوای پشتڕاستکردنەوە، هەژمارەکەت دەبێتە Pro و ئاگادارت دەکەینەوە. ✅`;

const ADMIN_HELP = `<b>فەرمانەکانی بەڕێوەبەر:</b>
<code>/pro email 30</code> — Pro بۆ ٣٠ ڕۆژ
<code>/remove email</code> — لابردنی Pro
<code>/check email</code> — بینینی دۆخی بەکارهێنەر
<code>/stats</code> — ئامارەکان
<code>/users</code> — دوایین ٢٠ بەکارهێنەر`;

async function findByEmail(email) {
  const { data } = await adminDb().from("profiles").select("*").eq("email", email.toLowerCase()).maybeSingle();
  return data;
}

async function handleAdmin(chatId, text) {
  const [cmd, arg1, arg2] = text.trim().split(/\s+/);
  const db = adminDb();

  if (cmd === "/pro") {
    if (!arg1 || !EMAIL_RE.test(arg1)) return send(chatId, "بەم شێوەیە بنووسە: <code>/pro email 30</code>");
    const days = Math.max(1, Math.min(3650, parseInt(arg2 || "30", 10) || 30));
    const p = await findByEmail(arg1);
    if (!p) return send(chatId, `❌ ئەم ئیمەیڵە تۆمار نەکراوە: ${esc(arg1)}\nبەکارهێنەر دەبێت سەرەتا لە ئەپەکەدا خۆی تۆمار بکات.`);
    const base = isProActive(p) ? new Date(p.pro_until) : new Date();
    const until = new Date(base.getTime() + days * 86400000).toISOString();
    await db.from("profiles").update({ pro_until: until }).eq("id", p.id);
    await send(chatId, `✅ <b>${esc(p.email)}</b> بوو بە Pro تا <b>${fmtDate(until)}</b>`);
    if (p.telegram_chat_id) {
      await send(p.telegram_chat_id, `🎉 پیرۆزە! هەژمارەکەت (<b>${esc(p.email)}</b>) بوو بە <b>Pro</b> تا <b>${fmtDate(until)}</b>.\nئەپەکە دابخە و بیکەرەوە.`);
    }
    return;
  }

  if (cmd === "/remove") {
    const p = arg1 && (await findByEmail(arg1));
    if (!p) return send(chatId, "❌ نەدۆزرایەوە.");
    await db.from("profiles").update({ pro_until: null }).eq("id", p.id);
    return send(chatId, `✅ Pro لە <b>${esc(p.email)}</b> لابرا.`);
  }

  if (cmd === "/check") {
    const p = arg1 && (await findByEmail(arg1));
    if (!p) return send(chatId, "❌ نەدۆزرایەوە.");
    const used = p.daily_date === today() ? p.daily_count : 0;
    return send(
      chatId,
      `👤 <b>${esc(p.email)}</b>\nPro: ${isProActive(p) ? "✅ تا " + fmtDate(p.pro_until) : "❌"}\nئەمڕۆ: ${used} پرسیار\nکۆی گشتی: ${p.total_count} پرسیار\nتۆماربوون: ${fmtDate(p.created_at)}`
    );
  }

  if (cmd === "/stats") {
    const nowIso = new Date().toISOString();
    const [{ count: users }, { count: pros }, { data: todayRows }] = await Promise.all([
      db.from("profiles").select("*", { count: "exact", head: true }),
      db.from("profiles").select("*", { count: "exact", head: true }).gt("pro_until", nowIso),
      db.from("profiles").select("daily_count").eq("daily_date", today()),
    ]);
    const msgs = (todayRows || []).reduce((a, r) => a + (r.daily_count || 0), 0);
    return send(
      chatId,
      `📊 <b>ئامارەکان</b>\n👥 بەکارهێنەران: <b>${users ?? 0}</b>\n⭐ Pro: <b>${pros ?? 0}</b>\n💬 پرسیارەکانی ئەمڕۆ: <b>${msgs}</b>\n🟢 چالاک ئەمڕۆ: <b>${(todayRows || []).length}</b>`
    );
  }

  if (cmd === "/users") {
    const { data } = await db.from("profiles").select("email,pro_until,total_count").order("created_at", { ascending: false }).limit(20);
    const lines = (data || []).map((u) => `${isProActive(u) ? "⭐" : "▫️"} ${esc(u.email)} — ${u.total_count}`);
    return send(chatId, `<b>دوایین بەکارهێنەران:</b>\n${lines.join("\n") || "هیچ"}`);
  }

  return send(chatId, ADMIN_HELP);
}

export async function POST(req) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 403 });
  }
  const update = await req.json().catch(() => null);
  const msg = update?.message;
  if (!msg) return Response.json({ ok: true });

  const chatId = msg.chat.id;
  const fromId = String(msg.from?.id || "");
  const text = (msg.text || msg.caption || "").trim();
  const who = msg.from?.username ? "@" + msg.from.username : esc(msg.from?.first_name || "بەکارهێنەر");

  try {
    if (text === "/myid") return send(chatId, `ID ی تۆ: <code>${fromId}</code>`).then(() => Response.json({ ok: true }));

    if (ADMIN && fromId === ADMIN && text.startsWith("/") && text !== "/start") {
      await handleAdmin(chatId, text);
      return Response.json({ ok: true });
    }

    if (text === "/start" || text === "/help") {
      await send(chatId, fromId === ADMIN ? WELCOME() + "\n\n" + ADMIN_HELP : WELCOME());
      return Response.json({ ok: true });
    }

    // A buyer sent a receipt photo/file → forward it to the owner
    if (msg.photo || msg.document) {
      if (ADMIN) {
        await tg("forwardMessage", { chat_id: ADMIN, from_chat_id: chatId, message_id: msg.message_id });
        await send(ADMIN, `🧾 پسوولەیەک لە ${who} (<code>${chatId}</code>)`);
      }
      const email = text.match(EMAIL_RE)?.[0];
      if (!email) await send(chatId, "✅ وێنەکە گەیشت. ئێستا ئەو <b>ئیمەیڵە</b> بنووسە کە لە ئەپەکەدا پێی تۆمار بوویت.");
    }

    // A buyer sent their email → link it and tell the owner
    const email = text.match(EMAIL_RE)?.[0]?.toLowerCase();
    if (email) {
      const p = await findByEmail(email);
      if (!p) {
        await send(chatId, `❌ ئەم ئیمەیڵە لە ئەپەکەدا تۆمار نەکراوە: <b>${esc(email)}</b>\nسەرەتا لە ئەپەکەدا بەم ئیمەیڵە خۆت تۆمار بکە، پاشان دووبارە بینێرە.`);
      } else {
        await adminDb().from("profiles").update({ telegram_chat_id: chatId }).eq("id", p.id);
        await send(chatId, "✅ وەرگیرا! دوای پشتڕاستکردنەوەی پارەدانەکە، هەژمارەکەت دەبێتە Pro و ئاگادارت دەکەینەوە.");
        if (ADMIN) {
          await send(ADMIN, `💰 داواکاری Pro لە ${who}\nئیمەیڵ: <b>${esc(email)}</b>\n\nبۆ چالاککردن ئەمە کۆپی بکە و بینێرە:\n<code>/pro ${esc(email)} 30</code>`);
        }
      }
    } else if (!msg.photo && !msg.document && text && !text.startsWith("/")) {
      await send(chatId, "بۆ وەرگرتنی Pro، وێنەی پسوولە و ئیمەیڵەکەت بنێرە. بۆ زانیاری زیاتر /start بنووسە.");
    }
  } catch (e) {
    console.error(e);
  }
  return Response.json({ ok: true });
}
