// AI presentation designer.
//  POST { action: "make", topic, text, pdf, lang, slides, keep }  → a full deck (AI writes, fixes and structures it)
//  POST { action: "revise", deck, ask, lang }                     → the same deck changed as the user asked
//  POST { action: "image", prompt }                               → one picture for a slide (free Cloudflare quota)
//  GET                                                            → how many presentations are left
// Free accounts: SLIDES_FREE (default 10) in total. Pro: SLIDES_PRO_DAILY (default 30) a day. Owner: no limit.
import { getUser, getProfile, usageOf, getSettings, isOwner } from "../../../lib/server";
import { jsonCall } from "../../../lib/gemini";
import { makeImage } from "../../../lib/imagegen";
import { quota } from "../../../lib/quota";
import { LANG, SCHEMA, RULES, cleanDeck } from "../../../lib/deckSchema";
import { allow, tooMany } from "../../../lib/ratelimit";
import { serverEnv } from "../../../lib/env";
import { createHmac } from "crypto";

// a long book is made part by part: one "book" call spends one presentation and returns a ticket the parts carry
const sign = (s) => createHmac("sha256", serverEnv("SUPABASE_SERVICE_ROLE_KEY") || "ahm-slides").update(s).digest("base64url").slice(0, 32);
const ticketFor = (uid, n, exp) => `${exp}.${sign(`book|${uid}|${n}|${exp}`)}`;
const ticketOk = (t, uid, n) => { const [exp] = String(t || "").split("."); return +exp > Date.now() && t === ticketFor(uid, n, exp); };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const preferredRegion = "fra1";

const LIMIT = quota("sl", { freeEnv: "SLIDES_FREE", freeDefault: 10, proEnv: "SLIDES_PRO_DAILY", proDefault: 30 });
const err = (error, status = 400, extra = {}) => Response.json({ error, ...extra }, { status });
const B64 = /^[A-Za-z0-9+/=]+$/;

async function ctx(req) {
  const user = await getUser(req);
  if (!user) return { fail: err("unauthorized", 401) };
  const [profile, settings] = await Promise.all([getProfile(user), getSettings()]);
  const usage = usageOf(profile, settings);
  if (isOwner(user)) usage.unlimited = true;
  return { user, usage };
}

export async function GET(req) {
  const c = await ctx(req);
  if (c.fail) return c.fail;
  return Response.json({ ...(await LIMIT.left(c.user.id, c.usage)), images: true });
}

export async function POST(req) {
  try {
    const c = await ctx(req);
    if (c.fail) return c.fail;
    const { user, usage } = c;
    const body = await req.json().catch(() => null);
    if (!body) return err("bad_request");

    if (body.action === "book") {
      const n = Math.round(Number(body.parts));
      if (!(n >= 2 && n <= 60)) return err("bad_request");
      if (!(await allow("sl-make:" + user.id, 4, 60000))) return tooMany();
      const left = await LIMIT.left(user.id, usage);
      if (left.left !== null && left.left <= 0) return err("limit", 402, left);
      await LIMIT.spend(user.id, usage);
      return Response.json({ ticket: ticketFor(user.id, n, Date.now() + 40 * 60000), left: left.left === null ? null : left.left - 1 });
    }

    if (body.action === "make") {
      const b = body.book;
      const book = b && Number.isInteger(b.i) && Number.isInteger(b.n) && b.n >= 2 && b.n <= 60 && b.i >= 0 && b.i < b.n ? b : null;
      let left = { left: null };
      if (book) {
        if (!ticketOk(book.ticket, user.id, book.n)) return err("ticket", 403);
        if (!(await allow("sl-book:" + user.id, 40, 60000))) return tooMany();
      } else {
        if (!(await allow("sl-make:" + user.id, 4, 60000))) return tooMany();
        left = await LIMIT.left(user.id, usage);
        if (left.left !== null && left.left <= 0) return err("limit", 402, left);
      }
      const topic = String(body.topic || "").slice(0, 3000), text = String(body.text || "").slice(0, 60000);
      const pdf = typeof body.pdf === "string" && body.pdf.length < 4_500_000 && B64.test(body.pdf) ? body.pdf : null;
      // photos of pages / notes / a whiteboard (up to 8 JPEGs, all together under the 4.5 MB request limit)
      const images = Array.isArray(body.images) ? body.images.filter((x) => typeof x === "string" && x.length < 1_600_000 && B64.test(x)).slice(0, 8) : [];
      if (images.reduce((a, x) => a + x.length, 0) > 4_300_000) return err("too_big");
      const exact = body.exact === true; // keep the user's own words, only lay them out as slides
      if (!topic.trim() && !text.trim() && !pdf && !images.length) return err("empty");
      const lang = LANG[body.lang] ? body.lang : null; // null = the language of the source
      const n = Number(body.slides) > 0 ? Math.min(25, Math.round(Number(body.slides))) : null;
      const per = Number(body.perPart) > 0 ? Math.min(30, Math.max(3, Math.round(Number(body.perPart)))) : null;
      const count = book ? [
        `This source is PART ${book.i + 1} of ${book.n} of one long book / document. Make slides ONLY for this part, covering all of its main ideas in their order, so that all parts together present the whole book. These part rules override the general first/last slide rules:`,
        book.i === 0 ? `- Start with ONE "title" slide for the whole book (use the book's real title if you can see it, else a fitting one). No agenda slide.` : `- No "title" slide and no "agenda" slide.`,
        `- After that, begin with a "section" slide naming this part's chapter or main topic. Add another "section" slide whenever a new chapter starts inside this part.`,
        book.i === book.n - 1 ? `- End with a "closing" slide.` : `- No "closing" slide.`,
        per ? `- Make about ${per} slides for this part.` : exact ? "- Make as many slides as this part needs (max 25)." : "- Make 8-14 slides for this part (more if it is dense).",
        exact ? `- In "notes" of each slide put the original passage that slide comes from, word for word (max ~1200 characters).` : "",
      ].filter(Boolean).join("\n")
        : body.keep && body.count ? `Keep exactly ${Math.min(30, Number(body.count))} slides, one for each original slide, in the same order.` : n ? `Make exactly ${n} slides.` : "Choose the best number of slides (usually 7-12).";
      const langLine = lang && !exact ? LANG[lang] : "the same language as the source (Kurdish Sorani in Arabic script if the source is Kurdish)";
      const parts = [];
      if (pdf) parts.push({ inlineData: { mimeType: "application/pdf", data: pdf } });
      for (const im of images) parts.push({ inlineData: { mimeType: "image/jpeg", data: im } });
      const how = exact ? "convert it into slides AS IT IS: keep the original words, numbers and order exactly — do not rewrite, summarise, translate or add new content; only split it into slides, give each slide a short title taken from the text, and choose fitting layouts (charts only from numbers that are in the source)"
        : "redesign and improve it";
      parts.push({ text: [
        text ? `EXISTING PRESENTATION / DOCUMENT (${how}):\n${text}` : pdf ? `EXISTING PRESENTATION / DOCUMENT: the attached PDF (${how}).` : images.length ? `SOURCE: the ${images.length} attached picture(s) — photos of pages, notes, a whiteboard, slides or a document. Read every word in them carefully (Kurdish, Arabic or English) and ${how}.` : "",
        topic ? `${text || pdf || images.length ? "Extra wishes from the user" : "TOPIC (create a complete presentation about it)"}: ${topic}` : "",
        count,
        `Write the deck in ${langLine}; set "lang" to that language's code.`,
      ].filter(Boolean).join("\n\n") });
      const out = await jsonCall(RULES(lang ? LANG[lang] : "the deck language") + "\n" + SCHEMA, parts, { maxTokens: book ? 24000 : 16000, think: "low" });
      const deck = cleanDeck(out);
      if (!deck) return err("ai", 502);
      if (lang) deck.lang = lang;
      if (book) return Response.json({ deck });
      await LIMIT.spend(user.id, usage);
      return Response.json({ deck, left: left.left === null ? null : left.left - 1 });
    }

    if (body.action === "revise") {
      if (!(await allow("sl-rev:" + user.id, 10, 10 * 60000))) return tooMany();
      const deck = cleanDeck(body.deck);
      const ask = String(body.ask || "").slice(0, 1200);
      if (!deck || !ask.trim()) return err("bad_request");
      const out = await jsonCall(RULES(LANG[deck.lang]) + "\n" + SCHEMA, [{ text: `CURRENT DECK (JSON):\n${JSON.stringify(deck)}\n\nCHANGE REQUESTED BY THE USER: ${ask}\n\nApply the change and return the whole updated deck. Keep everything the user did not ask to change.` }], { maxTokens: 16000, think: "low" });
      const next = cleanDeck(out);
      if (!next) return err("ai", 502);
      next.lang = deck.lang;
      return Response.json({ deck: next });
    }

    if (body.action === "image") {
      if (!(await allow("sl-img:" + user.id, 8, 60000))) return tooMany();
      // slide pictures use the shared free picture service: a daily cap per account
      if (!usage.unlimited && !(await allow("sl-imgd:" + user.id, usage.pro ? 60 : 9, 86400000))) return err("limit", 402);
      const idea = String(body.prompt || "").replace(/[\u0000-\u001f<>]/g, " ").slice(0, 300).trim();
      if (!idea) return err("bad_request");
      const pic = await makeImage({ prompt: `${idea}. Professional presentation image, clean composition, soft natural light, high quality, photorealistic or elegant modern illustration. No text, no letters, no words, no watermark, no logo.`, width: 1280, height: 768, seed: Math.floor(Math.random() * 1e9) });
      return new Response(Buffer.from(pic.data, "base64"), { headers: { "Content-Type": pic.mime, "Cache-Control": "no-store" } });
    }
    return err("bad_request");
  } catch (e) {
    const m = String(e?.message || "");
    if (["daily_full", "cf_off", "cf_key", "unsafe", "busy", "cf_failed", "ai"].includes(m)) return err(m, m === "unsafe" ? 400 : 503);
    console.error("slides", m.slice(0, 300));
    return err("server", 500);
  }
}
