import { randomBytes } from "crypto";
import { serverEnv } from "../../../lib/env";
import { webhookSecret } from "../../../lib/telegram";
import { adminDb, isPaidActive, usageOf, getSettings, dropProfile } from "../../../lib/server";
import { cacheGet, cacheSet, cacheDel } from "../../../lib/redis";
import { planById, planByPrice } from "../../../lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = serverEnv("TELEGRAM_BOT_TOKEN");
// Owner's Telegram ID: from Vercel if it is a valid number, otherwise the owner's known ID.
const ADMIN = (serverEnv("ADMIN_TELEGRAM_ID").match(/\d{5,}/) || [])[0] || "7384823854";
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

// iPhone keyboards often turn "/stats" into "Stats/" or "/Stats" — accept all of them, and the buttons.
const ALIASES = { starts: "stats", stat: "stats", "ئامار": "stats", "📊": "stats", "👥": "users", "بەکارهێنەران": "users", "❓": "help", "یارمەتی": "help", miyd: "myid", "🎁": "give" };
function normCmd(text) {
  const t = (text || "").trim();
  const first = t.split(/\s+/)[0] || "";
  const looksCmd = first.startsWith("/") || first.endsWith("/");
  let word = first.replace(/\//g, "").toLowerCase();
  if (ALIASES[word]) return { cmd: "/" + ALIASES[word], rest: t.split(/\s+/).slice(1) };
  const button = Object.keys(ALIASES).find((k) => t.startsWith(k) && !/^[a-z]/.test(k));
  if (button) return { cmd: "/" + ALIASES[button], rest: [] };
  return looksCmd ? { cmd: "/" + word, rest: t.split(/\s+/).slice(1) } : null;
}

const ADMIN_KEYBOARD = {
  keyboard: [[{ text: "🎁 پێدانی Pro / بەخۆڕایی" }], [{ text: "📊 ئامار" }, { text: "👥 بەکارهێنەران" }], [{ text: "❓ یارمەتی" }]],
  resize_keyboard: true,
  is_persistent: true,
};

const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "-");

const PLAN_LINES = (st) => st.paid.map((p) => `• <b>${esc(p.name)}</b> — <b>$${p.price}</b> ← ${p.limit} پرسیار بۆ ${p.days} ڕۆژ`).join("\n");

const WELCOME = (st) => `سڵاو! 👋 بەخێربێیت بۆ <b>AHM AI</b>

⭐ <b>پلانەکانی Pro</b>
${PLAN_LINES(st)}

💳 ${esc(st.payment || process.env.PAYMENT_INFO || "ژمارەی FIB بەم زووانە دادەنرێت.")}

<b>چۆن Pro وەربگریت:</b>
١. پارەکە بە FIB بنێرە.
٢. وێنەی پسوولەکە (screenshot) لێرە بنێرە.
٣. ئەو ئیمەیڵە بنووسە کە لە ئەپەکەدا پێی تۆمار بوویت.

دوای پشتڕاستکردنەوە، هەژمارەکەت دەبێتە Pro و ئاگادارت دەکەینەوە. ✅`;

// Sent when the user tapped "Buy" on a specific plan in the app (t.me/bot?start=<planId>).
const CHOSEN = (st, p) => `سڵاو! 👋 تۆ پلانی <b>${esc(p.name)}</b>ت هەڵبژارد:

⭐ <b>$${p.price}</b> ← ${p.limit} پرسیار بۆ ${p.days} ڕۆژ

💳 ${esc(st.payment || process.env.PAYMENT_INFO || "ژمارەی FIB بەم زووانە دادەنرێت.")}

<b>هەنگاوەکان:</b>
١. <b>$${p.price}</b> بە FIB بنێرە.
٢. وێنەی پسوولەکە (screenshot) لێرە بنێرە.
٣. ئەو ئیمەیڵە بنووسە کە لە ئەپەکەدا پێی تۆمار بوویت.

دوای پشتڕاستکردنەوە، هەژمارەکەت دەبێتە ${esc(p.name)} و ئاگادارت دەکەینەوە. ✅`;

const ADMIN_HELP = `👑 <b>تۆ خاوەنی بۆتەکەیت.</b>
دوگمەکانی خوارەوە بەکاربهێنە، یان:

<b>فەرمانەکان:</b>
<code>/pro email 6</code> — چالاککردنی پلان (ژمارەکە نرخی پلانەکەیە: 3، 6 یان 12)
🎁 دوگمەی <b>پێدانی Pro / بەخۆڕایی</b> — ئیمەیڵ بنووسە، پاشان ژمارەی ڕۆژەکان، یان «بەخۆڕایی بۆ هەمیشە»
<code>/vip email</code> — بەخۆڕایی و بێ سنوور بۆ هەمیشە
<code>/remove email</code> — لابردنی Pro
<code>/check email</code> — بینینی دۆخی بەکارهێنەر
<code>/stats</code> — ئامارەکان
<code>/users</code> — دوایین ٢٠ بەکارهێنەر
<code>/resetpass email</code> — وشەی نهێنی نوێ بۆ بەکارهێنەر
<code>/unpublish id</code> — لابردنی ماڵپەڕێکی بڵاوکراوە`;

async function findByEmail(email) {
  const { data } = await adminDb().from("profiles").select("*").eq("email", email.toLowerCase()).maybeSingle();
  return data;
}

// Gives a user a new temporary password (when they forgot theirs) and returns a ready message for the owner to send them.
async function resetPassword(profileId) {
  const db = adminDb();
  const { data: p } = await db.from("profiles").select("id,email").eq("id", profileId).maybeSingle();
  if (!p) return null;
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(10);
  const pass = "Ahm-" + [...bytes].map((b) => abc[b % abc.length]).join("");
  const { error } = await db.auth.admin.updateUserById(p.id, { password: pass });
  if (error) { console.error("resetPassword", error.message); return null; }
  return { email: p.email, pass };
}
const resetText = (r) => `🔑 <b>وشەی نهێنی نوێ دروست کرا</b>
👤 ${esc(r.email)}
🔐 <code>${esc(r.pass)}</code>

ئەم نامەیە کۆپی بکە و بە ئیمەیڵ بینێرە بۆ بەکارهێنەرەکە:
<code>سڵاو! وشەی نهێنی نوێی AHM AI ـەکەت: ${esc(r.pass)}
بەم وشەیە بچۆ ژوورەوە، پاشان لە ڕێکخستنەکان دەتوانیت بیگۆڕیت.</code>`;

// ---- owner gives Pro / free access by hand: email → number of days (or "free for ever") ----
const GIVE_KEY = "tg:give:" + ADMIN; // what the owner is in the middle of (Redis, 15 minutes)
const FOREVER = "2099-12-31T00:00:00.000Z";
const mem = new Map(); // backup when Redis is not reachable
const getGive = async () => (await cacheGet(GIVE_KEY)) ?? ((mem.get(GIVE_KEY)?.until || 0) > Date.now() ? mem.get(GIVE_KEY).v : null);
const setGive = (v) => { mem.set(GIVE_KEY, { v, until: Date.now() + 900_000 }); return cacheSet(GIVE_KEY, v, 900); };
const endGive = () => { mem.delete(GIVE_KEY); return cacheDel(GIVE_KEY); };

async function giveAccess(profileId, days) {
  const st = await getSettings();
  const db = adminDb();
  const { data: p } = await db.from("profiles").select("*").eq("id", profileId).maybeSingle();
  if (!p) return null;
  const now = new Date();
  const forever = days === "forever";
  // Days → the biggest Pro plan for that many days. "forever" → VIP: free and without limits for ever.
  const top = [...st.paid].sort((a, b) => b.limit - a.limit)[0];
  const until = forever ? FOREVER : new Date(now.getTime() + Number(days) * 86400000).toISOString();
  const plan = forever || !top ? "vip" : top.id;
  await db.from("profiles").update({ plan, plan_until: until, used: 0, period_key: "paid:" + now.toISOString() }).eq("id", p.id);
  await dropProfile(p.id);
  const label = forever ? "♾️ بەخۆڕایی و بێ سنوور بۆ هەمیشە" : `⭐ ${esc(top?.name || "Pro")} بۆ ${Number(days)} ڕۆژ (تا ${fmtDate(until)})`;
  if (p.telegram_chat_id) await send(p.telegram_chat_id, `🎉 پیرۆزە! هەژمارەکەت (<b>${esc(p.email)}</b>) چالاک کرا:
${label}
ئەپەکە دابخە و بیکەرەوە.`).catch(() => {});
  return { p, label };
}

const DAYS_KEYBOARD = (id) => ({
  inline_keyboard: [
    [7, 30, 90].map((d) => ({ text: `${d} ڕۆژ`, callback_data: `g:${id}:${d}` })),
    [180, 365].map((d) => ({ text: `${d} ڕۆژ`, callback_data: `g:${id}:${d}` })),
    [{ text: "♾️ بەخۆڕایی بۆ هەمیشە", callback_data: `g:${id}:forever` }],
    [{ text: "❌ هەڵوەشاندنەوە", callback_data: "gx" }],
  ],
});

async function askDays(chatId, p) {
  await setGive({ s: "days", id: p.id });
  return tg("sendMessage", {
    chat_id: chatId, parse_mode: "HTML", reply_markup: DAYS_KEYBOARD(p.id),
    text: `👤 <b>${esc(p.email)}</b>

چەند ڕۆژ؟ دوگمەیەک دابگرە، یان <b>ژمارەی ڕۆژەکان</b> بنووسە (بۆ نموونە <code>45</code>).
یان «♾️ بەخۆڕایی بۆ هەمیشە» هەڵبژێرە.`,
  });
}

// Returns true when the message was part of the give flow.
async function giveFlow(chatId, text) {
  const state = await getGive();
  if (!state) return false;
  if (state.s === "email") {
    const email = text.match(EMAIL_RE)?.[0];
    if (!email) { await send(chatId, "📧 تکایە تەنها <b>ئیمەیڵەکە</b> بنووسە (یان /cancel)."); return true; }
    const p = await findByEmail(email);
    if (!p) { await send(chatId, `❌ ئەم ئیمەیڵە تۆمار نەکراوە: ${esc(email)}
ئیمەیڵێکی تر بنووسە، یان /cancel.`); return true; }
    await askDays(chatId, p);
    return true;
  }
  if (state.s === "days") {
    if (/^(♾️|بۆ هەمیشە|forever|free|بەخۆڕایی)/i.test(text)) { const r = await giveAccess(state.id, "forever"); await endGive(); await send(chatId, r ? `✅ <b>${esc(r.p.email)}</b> ← ${r.label}` : "❌ نەکرا."); return true; }
    const n = Number((text.match(/[0-9٠-٩۰-۹]+/)?.[0] || "").replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    if (!n || n < 1 || n > 3650) { await send(chatId, "🔢 ژمارەی ڕۆژەکان بنووسە (١ تا ٣٦٥٠)، یان دوگمەیەک دابگرە."); return true; }
    const r = await giveAccess(state.id, n);
    await endGive();
    await send(chatId, r ? `✅ <b>${esc(r.p.email)}</b> ← ${r.label}` : "❌ نەکرا.");
    return true;
  }
  return false;
}

async function handleAdmin(chatId, cmd, rest) {
  const [arg1, arg2, arg3] = rest;
  const db = adminDb();
  const st = await getSettings();
  const priceOf = (id) => (id === "vip" ? "♾️" : planById(st, id)?.price ?? "?");

  if (cmd === "/pro") {
    const plan = planByPrice(st, arg2) || planById(st, arg2);
    if (!arg1 || !EMAIL_RE.test(arg1) || !plan) {
      return send(chatId, `بەم شێوەیە بنووسە: <code>/pro email 5</code>\n(ژمارەکە نرخی پلانەکەیە: ${st.paid.map((x) => x.price).join(" یان ")})`);
    }
    const found = await findByEmail(arg1);
    if (!found) return send(chatId, `❌ ئەم ئیمەیڵە تۆمار نەکراوە: ${esc(arg1)}\nبەکارهێنەر دەبێت سەرەتا لە ئەپەکەدا خۆی تۆمار بکات.`);
    const r = await activate(found.id, plan.id);
    return send(chatId, `✅ <b>${esc(r.p.email)}</b> ← پلانی <b>$${plan.price}</b> (${plan.limit} پرسیار) تا <b>${fmtDate(r.until)}</b>`);
  }

  if (cmd === "/give") {
    if (arg1 && EMAIL_RE.test(arg1)) {
      const p = await findByEmail(arg1);
      if (!p) return send(chatId, `❌ ئەم ئیمەیڵە تۆمار نەکراوە: ${esc(arg1)}`);
      return askDays(chatId, p);
    }
    await setGive({ s: "email" });
    return send(chatId, "🎁 <b>پێدانی Pro / بەخۆڕایی</b>\n\n📧 ئیمەیڵی بەکارهێنەرەکە بنووسە:");
  }

  if (cmd === "/vip") {
    const p = arg1 && (await findByEmail(arg1));
    if (!p) return send(chatId, "بەم شێوەیە بنووسە: <code>/vip email</code>");
    const r = await giveAccess(p.id, "forever");
    return send(chatId, r ? `✅ <b>${esc(r.p.email)}</b> ← ${r.label}` : "❌ نەکرا.");
  }

  if (cmd === "/cancel") {
    await endGive();
    return tg("sendMessage", { chat_id: chatId, text: "❌ هەڵوەشێنرایەوە.", reply_markup: ADMIN_KEYBOARD });
  }

  if (cmd === "/remove") {
    const p = arg1 && (await findByEmail(arg1));
    if (!p) return send(chatId, "❌ نەدۆزرایەوە.");
    await db.from("profiles").update({ plan: "free", plan_until: null, used: 0, period_key: null }).eq("id", p.id);
    await dropProfile(p.id);
    return send(chatId, `✅ Pro لە <b>${esc(p.email)}</b> لابرا.`);
  }

  if (cmd === "/check") {
    const p = arg1 && (await findByEmail(arg1));
    if (!p) return send(chatId, "❌ نەدۆزرایەوە.");
    const u = usageOf(p, st);
    return send(
      chatId,
      `👤 <b>${esc(p.email)}</b>\nپلان: <b>${u.pro ? "$" + priceOf(u.plan) + " تا " + fmtDate(u.planUntil) : "بەخۆڕایی"}</b>\nئەم ${u.windowHours} کاتژمێرە: ${u.used} / ${u.limit}\nئەم هەفتەیە: ${u.weekUsed} / ${u.weekLimit}\n${u.locked ? "⏳ چاوەڕێ دەکات تا " + new Date(u.lockedUntil).toLocaleString("en-GB", { timeZone: "Asia/Baghdad" }) + "\n" : ""}کۆی گشتی: ${p.total_count} پرسیار\nتۆماربوون: ${fmtDate(p.created_at)}`
    );
  }

  if (cmd === "/stats") {
    const nowIso = new Date().toISOString();
    const [{ count: users }, { data: pros }, { data: all }] = await Promise.all([
      db.from("profiles").select("*", { count: "exact", head: true }),
      db.from("profiles").select("plan").gt("plan_until", nowIso).neq("plan", "free"),
      db.from("profiles").select("total_count"),
    ]);
    const byPlan = st.paid.map((pl) => `$${pl.price}: ${(pros || []).filter((r) => r.plan === pl.id).length}`).join(" · ");
    const income = (pros || []).reduce((a, r) => a + (planById(st, r.plan)?.price || 0), 0);
    const msgs = (all || []).reduce((a, r) => a + (r.total_count || 0), 0);
    return send(
      chatId,
      `📊 <b>ئامارەکان</b>\n👥 بەکارهێنەران: <b>${users ?? 0}</b>\n⭐ Pro چالاک: <b>${(pros || []).length}</b> (${byPlan})\n💵 داهاتی پلانە چالاکەکان: <b>$${income}</b>\n💬 کۆی پرسیارەکان: <b>${msgs}</b>`
    );
  }

  if (cmd === "/resetpass") {
    const p = arg1 && (await findByEmail(arg1));
    if (!p) return send(chatId, "بەم شێوەیە بنووسە: <code>/resetpass email</code>");
    const r = await resetPassword(p.id);
    return send(chatId, r ? resetText(r) : "❌ نەکرا. دووبارە هەوڵ بدەرەوە.");
  }

  if (cmd === "/unpublish") {
    const id = String(arg1 || "").replace(/^.*\/s\//, "").replace(/[^a-z0-9]/gi, "");
    if (!id) return send(chatId, "بەم شێوەیە بنووسە: <code>/unpublish id</code>");
    const { data, error } = await db.from("sites").delete().eq("id", id).select("id");
    return send(chatId, !error && data?.length ? `✅ ماڵپەڕی <b>${esc(id)}</b> لابرا.` : "❌ نەدۆزرایەوە.");
  }

  if (cmd === "/users") {
    const { data } = await db.from("profiles").select("email,plan,plan_until,total_count").order("created_at", { ascending: false }).limit(20);
    const lines = (data || []).map((u) => `${isPaidActive(u) ? "⭐$" + priceOf(u.plan) : "▫️"} ${esc(u.email)} — ${u.total_count}`);
    return send(chatId, `<b>دوایین بەکارهێنەران:</b>\n${lines.join("\n") || "هیچ"}`);
  }

  return tg("sendMessage", { chat_id: chatId, text: ADMIN_HELP, parse_mode: "HTML", reply_markup: ADMIN_KEYBOARD });
}

// Owner taps a button under a Pro request → activate the plan, no typing needed.
async function activate(profileId, planKey) {
  const st = await getSettings();
  const plan = planById(st, planKey) || planByPrice(st, planKey);
  const db = adminDb();
  const { data: p } = await db.from("profiles").select("*").eq("id", profileId).maybeSingle();
  if (!p || !plan) return null;
  const now = new Date();
  const until = new Date(now.getTime() + plan.days * 86400000).toISOString();
  await db.from("profiles").update({ plan: plan.id, plan_until: until, used: 0, period_key: "paid:" + now.toISOString() }).eq("id", p.id);
  await dropProfile(p.id);
  if (p.telegram_chat_id) {
    await send(p.telegram_chat_id, `🎉 پیرۆزە! هەژمارەکەت (<b>${esc(p.email)}</b>) بوو بە <b>Pro</b>\n${plan.limit} پرسیار تا <b>${fmtDate(until)}</b>.\nئەپەکە دابخە و بیکەرەوە.`);
  }
  return { p, plan, until };
}

export async function POST(req) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret()) {
    return new Response("forbidden", { status: 403 });
  }
  const update = await req.json().catch(() => null);

  // ---- button taps (owner activating a plan) ----
  const cb = update?.callback_query;
  if (cb) {
    try {
      const isAdmin = ADMIN && String(cb.from?.id) === ADMIN;
      const [kind, id, price] = String(cb.data || "").split(":");
      if (!isAdmin) {
        await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "⛔" });
      } else if (kind === "p") {
        const r = await activate(id, price);
        await tg("answerCallbackQuery", { callback_query_id: cb.id, text: r ? "✅" : "❌" });
        if (r && cb.message) {
          await tg("editMessageText", {
            chat_id: cb.message.chat.id, message_id: cb.message.message_id, parse_mode: "HTML",
            text: `✅ چالاک کرا: <b>${esc(r.p.email)}</b>\nپلانی <b>$${r.plan.price}</b> (${r.plan.limit} پرسیار) تا <b>${fmtDate(r.until)}</b>`,
          });
        }
      } else if (kind === "g") {
        const r = await giveAccess(id, price === "forever" ? "forever" : Number(price));
        await endGive();
        await tg("answerCallbackQuery", { callback_query_id: cb.id, text: r ? "✅" : "❌" });
        if (cb.message) await tg("editMessageText", { chat_id: cb.message.chat.id, message_id: cb.message.message_id, parse_mode: "HTML", text: r ? `✅ <b>${esc(r.p.email)}</b> ← ${r.label}` : "❌ نەکرا." });
      } else if (kind === "gx") {
        await endGive();
        await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "❌" });
        if (cb.message) await tg("editMessageText", { chat_id: cb.message.chat.id, message_id: cb.message.message_id, text: "❌ هەڵوەشێنرایەوە." });
      } else if (kind === "rp") {
        const r = await resetPassword(id);
        await tg("answerCallbackQuery", { callback_query_id: cb.id, text: r ? "✅" : "❌" });
        if (r && cb.message) await tg("editMessageText", { chat_id: cb.message.chat.id, message_id: cb.message.message_id, parse_mode: "HTML", text: resetText(r) });
      } else if (kind === "x" && cb.message) {
        await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "❌" });
        await tg("editMessageText", { chat_id: cb.message.chat.id, message_id: cb.message.message_id, text: "❌ ڕەتکرایەوە." });
        if (id && /^-?\d+$/.test(id)) await send(id, "❌ ببورە، پارەدانەکەت پشتڕاست نەکرایەوە. ئەگەر هەڵەیەک هەیە، پەیوەندیمان پێوە بکە.");
      }
    } catch (e) {
      console.error(e);
    }
    return Response.json({ ok: true });
  }

  const msg = update?.message;
  if (!msg) return Response.json({ ok: true });

  const chatId = msg.chat.id;
  const fromId = String(msg.from?.id || "");
  const isAdmin = !!ADMIN && fromId === ADMIN;
  const text = (msg.text || msg.caption || "").trim();
  const who = msg.from?.username ? "@" + msg.from.username : esc(msg.from?.first_name || "بەکارهێنەر");
  const c = msg.text ? normCmd(text) : null;

  try {
    if (c?.cmd === "/myid") {
      await send(chatId, `ID ی تۆ: <code>${fromId}</code>` + (isAdmin ? "\n👑 تۆ خاوەنی بۆتەکەیت." : ""));
      return Response.json({ ok: true });
    }

    if (c?.cmd === "/start" && c.rest?.[0]) {
      const st = await getSettings();
      const plan = planById(st, c.rest[0]);
      if (plan) {
        await send(chatId, CHOSEN(st, plan));
        if (!isAdmin) {
          const who = msg.from?.username ? "@" + msg.from.username : esc(msg.from?.first_name || String(fromId));
          await send(ADMIN, `🛒 ${who} پلانی <b>${esc(plan.name)}</b> ($${plan.price}) هەڵبژارد.`).catch(() => {});
        }
        return Response.json({ ok: true });
      }
    }

    if (c?.cmd === "/start" || c?.cmd === "/help") {
      if (isAdmin) {
        await send(chatId, WELCOME(await getSettings()));
        await handleAdmin(chatId, "/help", []);
      } else {
        await send(chatId, WELCOME(await getSettings()));
      }
      return Response.json({ ok: true });
    }

    if (c && isAdmin) {
      if (c.cmd !== "/give") await endGive(); // any other command ends the give flow
      await handleAdmin(chatId, c.cmd, c.rest);
      return Response.json({ ok: true });
    }
    if (isAdmin && text && !msg.photo && !msg.document && (await giveFlow(chatId, text))) return Response.json({ ok: true });

    if (c && !isAdmin && ["/stats", "/users", "/pro", "/remove", "/check"].includes(c.cmd)) {
      await send(chatId, `⛔ ئەم فەرمانە تەنها بۆ خاوەنی بۆتەکەیە.\nID ی تۆ: <code>${fromId}</code>`);
      return Response.json({ ok: true });
    }

    // A buyer sent a receipt photo/file → forward it to the owner
    if (msg.photo || msg.document) {
      if (ADMIN) {
        await tg("forwardMessage", { chat_id: ADMIN, from_chat_id: chatId, message_id: msg.message_id });
        await send(ADMIN, `🧾 پسوولەیەک لە ${who} (<code>${chatId}</code>)`);
      }
      if (!text.match(EMAIL_RE)) await send(chatId, "✅ وێنەکە گەیشت. ئێستا ئەو <b>ئیمەیڵە</b> بنووسە کە لە ئەپەکەدا پێی تۆمار بوویت.");
    }

    // A buyer sent their email → link it and send the owner one-tap buttons
    const email = text.match(EMAIL_RE)?.[0]?.toLowerCase();
    if (email) {
      const p = await findByEmail(email);
      if (!p) {
        await send(chatId, `❌ ئەم ئیمەیڵە لە ئەپەکەدا تۆمار نەکراوە: <b>${esc(email)}</b>\nسەرەتا لە ئەپەکەدا بەم ئیمەیڵە خۆت تۆمار بکە، پاشان دووبارە بینێرە.`);
      } else {
        await adminDb().from("profiles").update({ telegram_chat_id: chatId }).eq("id", p.id);
        await dropProfile(p.id);
        await send(chatId, "✅ وەرگیرا! دوای پشتڕاستکردنەوەی پارەدانەکە، هەژمارەکەت دەبێتە Pro و ئاگادارت دەکەینەوە.");
        if (ADMIN) {
          await tg("sendMessage", {
            chat_id: ADMIN,
            parse_mode: "HTML",
            text: `💰 <b>داواکاری Pro</b> لە ${who}\nئیمەیڵ: <b>${esc(email)}</b>\n\nبەپێی ئەو پارەیەی هاتووە، دوگمەیەک دابگرە:`,
            reply_markup: {
              inline_keyboard: [
                (await getSettings()).paid.map((pl) => ({ text: `✅ $${pl.price}`, callback_data: `p:${p.id}:${pl.id}` })),
                [{ text: "❌ ڕەتکردنەوە", callback_data: `x:${chatId}` }],
              ],
            },
          });
        }
      }
    } else if (!msg.photo && !msg.document && text) {
      await send(chatId, "بۆ وەرگرتنی Pro، وێنەی پسوولە و ئیمەیڵەکەت بنێرە. بۆ زانیاری زیاتر /start بنووسە.");
    }
  } catch (e) {
    console.error(e);
  }
  return Response.json({ ok: true });
}
