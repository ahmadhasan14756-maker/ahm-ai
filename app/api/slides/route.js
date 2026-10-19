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
import { allow, tooMany } from "../../../lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const preferredRegion = "fra1";

const LIMIT = quota("sl", { freeEnv: "SLIDES_FREE", freeDefault: 10, proEnv: "SLIDES_PRO_DAILY", proDefault: 30 });
const LANG = { ckb: "Kurdish Sorani in Arabic script (correct Sorani spelling with ڕ ڵ ێ ۆ ە)", ar: "Modern Standard Arabic", en: "English" };
const LAYOUTS = ["title", "section", "agenda", "bullets", "cards", "two", "table", "process", "stats", "chart", "timeline", "quote", "image", "closing"];
const ICONS = "rocket shield chart trend users people target idea money clock globe heart star check book education leaf sun energy phone laptop cloud lock home building truck cart chat mail calendar settings search health handshake award location code water factory growth";
const err = (error, status = 400, extra = {}) => Response.json({ error, ...extra }, { status });
const B64 = /^[A-Za-z0-9+/=]+$/;

const SCHEMA = `Return JSON only:
{"title": "...", "subtitle": "...", "lang": "ckb|ar|en",
 "corrections": ["short note of each important spelling/grammar/wording fix you made (in the deck language)"],
 "slides": [ one object per slide, each with "layout" and only the fields that layout uses:
  {"layout":"title","kicker":"…","title":"…","subtitle":"…","image":"english picture idea or empty"}
  {"layout":"section","number":"01","title":"…","subtitle":"…"}
  {"layout":"agenda","title":"…","items":["…" ×3-6]}
  {"layout":"bullets","title":"…","text":"optional one-sentence intro","bullets":["…" ×3-6],"image":"optional english picture idea"}
  {"layout":"cards","title":"…","cards":[{"icon":"an icon name","title":"…","text":"one short sentence"} ×2-4]}
  {"layout":"two","title":"…","left":{"title":"…","bullets":["…"]},"right":{"title":"…","bullets":["…"]}}
  {"layout":"table","title":"…","columns":["…" ×2-4],"rows":[["…","…"] ×2-6],"text":"optional one-line note"}
  {"layout":"process","title":"…","flow":[{"icon":"an icon name","title":"2-4 words","text":"one short sentence"} ×3-5]}
  {"layout":"stats","title":"…","stats":[{"value":"42%","label":"…"} ×2-4],"text":"optional source/explanation"}
  {"layout":"chart","title":"…","chart":{"type":"bar|pie|line","labels":["…"],"values":[numbers],"unit":"% or empty"},"text":"the main takeaway","bullets":["optional ×0-3"]}
  {"layout":"timeline","title":"…","steps":[{"when":"…","what":"…"} ×3-6]}
  {"layout":"quote","quote":"…","author":"…"}
  {"layout":"closing","title":"…","subtitle":"…"}
  EVERY slide MUST have "notes": speaker notes — what the presenter says (2-4 natural sentences, same language). ]}`;

const RULES = (lang) => `You are a world-class presentation designer and editor.
- Write EVERYTHING the audience sees in ${lang}. Perfect spelling and grammar, natural professional wording — never word-by-word translation.
- Keep the original topic, all important facts and the intended meaning. Fix mistakes, remove repetition, make the wording clear and professional.
- PROFESSIONAL, SHORT SLIDES like a top consulting firm: one idea per slide; a title of max 6 words that states the message; bullets of max 8-10 words (key words, not full sentences); max 4-5 bullets; card/step texts of max ~12 words. Never paragraphs on a slide — every explanation goes in "notes".
- Choose the best layout for each slide and vary them (agenda right after the title slide for decks of 7+ slides, cards for 2-4 parallel ideas, two for pros/cons, table for comparing options/features/prices, process for how-it-works steps, timeline for dates/history, stats for key numbers, quote for a strong quote). Avoid more than two "bullets" slides in a row. First slide = "title", last = "closing". Use "section" only for long decks (12+ slides).
- NEVER invent numbers, statistics, dates or quotes. Use "stats"/"chart" only with numbers that are in the source or are well-established public facts; otherwise use another layout.
- "image": a short English idea for a photo/illustration, only for the title slide and at most 2 other slides where a picture really helps; otherwise leave it out. No text in pictures.
- "icon" is ALWAYS one of these names (never an emoji): ${ICONS}.`;

async function ctx(req) {
  const user = await getUser(req);
  if (!user) return { fail: err("unauthorized", 401) };
  const [profile, settings] = await Promise.all([getProfile(user), getSettings()]);
  const usage = usageOf(profile, settings);
  if (isOwner(user)) usage.unlimited = true;
  return { user, usage };
}

// Keep only known, sensible fields.
function cleanDeck(d) {
  const s = (v, n = 300) => String(v ?? "").slice(0, n);
  const arr = (a, n, f) => (Array.isArray(a) ? a.slice(0, n).map(f) : undefined);
  const slides = (Array.isArray(d?.slides) ? d.slides : []).slice(0, 30).map((x) => ({
    layout: LAYOUTS.includes(x?.layout) ? x.layout : "bullets",
    title: s(x.title, 160), subtitle: s(x.subtitle, 260), kicker: s(x.kicker, 80), number: s(x.number, 4), text: s(x.text, 300),
    bullets: arr(x.bullets, 6, (b) => s(b, 220)), image: s(x.image, 300),
    cards: arr(x.cards, 4, (c) => ({ icon: s(c?.icon, 16), title: s(c?.title, 90), text: s(c?.text, 260) })),
    items: arr(x.items, 7, (b) => s(b, 120)),
    columns: arr(x.columns, 4, (b) => s(b, 40)),
    rows: arr(x.rows, 6, (r) => (Array.isArray(r) ? r.slice(0, 4).map((c) => s(c, 90)) : [])),
    flow: arr(x.flow, 5, (t) => ({ icon: s(t?.icon, 16), title: s(t?.title, 60), text: s(t?.text, 200) })),
    left: x.left ? { title: s(x.left.title, 90), bullets: arr(x.left.bullets, 5, (b) => s(b, 200)) } : undefined,
    right: x.right ? { title: s(x.right.title, 90), bullets: arr(x.right.bullets, 5, (b) => s(b, 200)) } : undefined,
    stats: arr(x.stats, 4, (t) => ({ value: s(t?.value, 16), label: s(t?.label, 100) })),
    chart: x.chart ? { type: ["bar", "pie", "line"].includes(x.chart.type) ? x.chart.type : "bar", labels: arr(x.chart.labels, 8, (l) => s(l, 40)) || [], values: arr(x.chart.values, 8, (v) => Number(v) || 0) || [], unit: s(x.chart.unit, 12) } : undefined,
    steps: arr(x.steps, 6, (t) => ({ when: s(t?.when, 40), what: s(t?.what, 140) })),
    quote: s(x.quote, 320), author: s(x.author, 80), notes: s(x.notes, 1500),
  }));
  if (!slides.length) return null;
  return { title: s(d.title, 160), subtitle: s(d.subtitle, 260), lang: ["ckb", "ar", "en"].includes(d.lang) ? d.lang : "ckb", corrections: (Array.isArray(d.corrections) ? d.corrections : []).slice(0, 8).map((c) => s(c, 200)), slides };
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

    if (body.action === "make") {
      if (!(await allow("sl-make:" + user.id, 4, 60000))) return tooMany();
      const left = await LIMIT.left(user.id, usage);
      if (left.left !== null && left.left <= 0) return err("limit", 402, left);
      const topic = String(body.topic || "").slice(0, 3000), text = String(body.text || "").slice(0, 60000);
      const pdf = typeof body.pdf === "string" && body.pdf.length < 4_500_000 && B64.test(body.pdf) ? body.pdf : null;
      if (!topic.trim() && !text.trim() && !pdf) return err("empty");
      const lang = LANG[body.lang] ? body.lang : null; // null = the language of the source
      const n = Number(body.slides) > 0 ? Math.min(25, Math.round(Number(body.slides))) : null;
      const count = body.keep && body.count ? `Keep exactly ${Math.min(30, Number(body.count))} slides, one for each original slide, in the same order.` : n ? `Make exactly ${n} slides.` : "Choose the best number of slides (usually 7-12).";
      const langLine = lang ? LANG[lang] : "the same language as the source (Kurdish Sorani in Arabic script if the source is Kurdish)";
      const parts = [];
      if (pdf) parts.push({ inlineData: { mimeType: "application/pdf", data: pdf } });
      parts.push({ text: [
        text ? `EXISTING PRESENTATION / DOCUMENT (redesign and improve it):\n${text}` : pdf ? "EXISTING PRESENTATION / DOCUMENT: the attached PDF (redesign and improve it)." : "",
        topic ? `${text || pdf ? "Extra wishes from the user" : "TOPIC (create a complete presentation about it)"}: ${topic}` : "",
        count,
        `Write the deck in ${langLine}; set "lang" to that language's code.`,
      ].filter(Boolean).join("\n\n") });
      const out = await jsonCall(RULES(lang ? LANG[lang] : "the deck language") + "\n" + SCHEMA, parts, { maxTokens: 16000, think: "low" });
      const deck = cleanDeck(out);
      if (!deck) return err("ai", 502);
      if (lang) deck.lang = lang;
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
