// Free, up-to-date web search for "this year / latest / who won / now" questions.
// The results are fed INTO the prompt, so EVERY AI provider the app uses (Gemini, Gemma, Groq, OpenRouter) gives a
// current answer — not only Gemini's own Google grounding (which needs billing enabled on the key).
//
// It tries providers in order of quality and uses the first one that is configured:
//   1. Serper  (serper.dev)  — set SERPER_API_KEY   (2,500 free searches, reliable)
//   2. Tavily  (tavily.com)  — set TAVILY_API_KEY   (1,000 free/month, no card)
//   3. Brave   (brave.com)   — set BRAVE_API_KEY    (2,000 free/month)
//   4. DuckDuckGo            — no key at all, a best-effort fallback so search still works with zero setup.
// Any provider that errors or is blocked is skipped; the next one is tried. Nothing here ever throws.
import { serverEnv } from "./env";

// The app can always try a search (DuckDuckGo needs no key); a key just makes it more reliable.
export const hasWebSearch = () => true;

const UA = "Mozilla/5.0 (compatible; AHM-AI/1.0)";
const clip = (s, n) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);
const stripTags = (s) => String(s || "").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");

// ---- providers: each returns [{title,url,content}] or [] ----

// How old a result is, from Google's date text ("3 hours ago", "2 days ago", "Nov 12, 2026"). Unknown → Infinity.
export function ageMs(d) {
  if (!d) return Infinity;
  const s = String(d).toLowerCase();
  const m = s.match(/(\d+)\s*(min|minute|hour|hr|day|week|month|year)s?\s*ago/);
  if (m) {
    const unit = { min: 6e4, minute: 6e4, hour: 36e5, hr: 36e5, day: 864e5, week: 6048e5, month: 2592e6, year: 31536e6 }[m[2]];
    return Number(m[1]) * unit;
  }
  const t = Date.parse(d);
  return Number.isNaN(t) ? Infinity : Math.max(0, Date.now() - t);
}

// Google News for the same query, limited to the last month: dated, recent articles from many outlets, so the
// newest version of a fact can be found and cross-checked. Used only for "fresh" (time-sensitive) questions.
async function serperNews(q, key, timeoutMs) {
  const r = await fetch("https://google.serper.dev/news", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q, num: 8, tbs: "qdr:m" }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) return [];
  const j = await r.json().catch(() => null);
  return (Array.isArray(j?.news) ? j.news : [])
    .filter((it) => it?.title)
    .map((it) => ({
      title: clip(it.title, 160),
      url: String(it.link || ""),
      source: clip(it.source, 60),
      date: clip(it.date, 40),
      content: clip(it.snippet || it.title, 450),
    }));
}

async function serper(q, max, timeoutMs, fresh) {
  const key = serverEnv("SERPER_API_KEY");
  if (!key) return [];
  // web search and (for fresh questions) recent news run at the same time, so adding news costs no extra wait
  const newsP = fresh ? serperNews(q, key, timeoutMs).catch(() => []) : Promise.resolve([]);
  const r = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q, num: Math.min(10, max + 2) }),
    signal: AbortSignal.timeout(timeoutMs),
  }).catch(() => null);
  const j = r && r.ok ? await r.json().catch(() => null) : null;
  const news = await newsP;
  if (!j) return news;
  const out = [];
  const flat = (o) => clip(JSON.stringify(o).replace(/["{}\[\]]/g, " ").replace(/\b(title|link|date|snippet|thumbnail|imageUrl|source)\b/gi, " "), 1200);
  // Google's live boxes carry the up-to-the-minute answer (scores, prices, "last/next match") — capture them first.
  if (j.answerBox) {
    const ab = j.answerBox;
    const t = ab.answer || ab.snippet || ab.title;
    out.push({ title: "Google answer box (live)", live: true, url: ab.link || "", content: clip(typeof t === "string" ? t : flat(ab), 900) });
  }
  if (j.sports_results || j.sportsResults) out.push({ title: "Google sports box (live)", live: true, url: "", content: flat(j.sports_results || j.sportsResults) });
  if (j.knowledgeGraph?.description || j.knowledgeGraph?.attributes) {
    const kg = j.knowledgeGraph;
    out.push({ title: clip(kg.title, 160), live: true, url: "", content: clip((kg.description || "") + " " + (kg.attributes ? flat(kg.attributes) : ""), 700) });
  }
  for (const it of (Array.isArray(j.topStories) ? j.topStories : []).slice(0, 3)) {
    if (it?.title) out.push({ title: clip(it.title, 160), url: String(it.link || ""), source: clip(it.source, 60), date: clip(it.date, 40), content: clip(it.title, 300) });
  }
  for (const it of Array.isArray(j.organic) ? j.organic : []) {
    if (it?.snippet) out.push({ title: clip(it.title, 160), url: String(it.link || ""), date: clip(it.date, 40), content: clip(it.snippet, 450) });
  }
  return [...out, ...news];
}

async function tavily(q, max, timeoutMs) {
  const key = serverEnv("TAVILY_API_KEY");
  if (!key) return [];
  const r = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: key, query: q, max_results: Math.min(8, max + 1), search_depth: "basic", include_answer: true }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) return [];
  const j = await r.json().catch(() => null);
  if (!j) return [];
  const out = [];
  if (j.answer) out.push({ title: "Summary", url: "", content: clip(j.answer, 1200) });
  for (const it of Array.isArray(j.results) ? j.results : []) {
    if (it?.content) out.push({ title: clip(it.title, 160), url: String(it.url || ""), content: clip(it.content, 700) });
  }
  return out;
}

async function brave(q, max, timeoutMs) {
  const key = serverEnv("BRAVE_API_KEY");
  if (!key) return [];
  const r = await fetch("https://api.search.brave.com/res/v1/web/search?q=" + encodeURIComponent(q) + "&count=" + Math.min(10, max + 2), {
    headers: { "X-Subscription-Token": key, Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) return [];
  const j = await r.json().catch(() => null);
  const results = j?.web?.results;
  if (!Array.isArray(results)) return [];
  return results.filter((it) => it?.description).map((it) => ({ title: clip(it.title, 160), url: String(it.url || ""), content: clip(stripTags(it.description), 700) }));
}

// No key needed. Best-effort: DuckDuckGo's lightweight HTML endpoint, parsed for result links + snippets.
async function duck(q, max, timeoutMs) {
  const r = await fetch("https://lite.duckduckgo.com/lite/?q=" + encodeURIComponent(q), {
    headers: { "User-Agent": UA, "Accept-Language": "en,ckb,ar" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) return [];
  const html = await r.text();
  const out = [];
  const linkRe = /<a[^>]+class="result-link"[^>]*>([\s\S]*?)<\/a>/gi;
  const snipRe = /<td[^>]+class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;
  const titles = [], snips = [];
  let m;
  while ((m = linkRe.exec(html)) && titles.length < max + 2) titles.push(clip(stripTags(m[1]), 160));
  while ((m = snipRe.exec(html)) && snips.length < max + 2) snips.push(clip(stripTags(m[1]), 700));
  for (let i = 0; i < Math.min(titles.length, max + 2); i++) {
    const content = snips[i] || "";
    if (content) out.push({ title: titles[i] || "", url: "", content });
  }
  return out;
}

// Short-lived cache on the warm server: the same question asked again (by anyone) is answered instantly and doesn't
// spend another search. Fresh (time-sensitive) lookups expire sooner so news/prices/scores stay current.
const CACHE = new Map();
const TTL_FRESH = 5 * 60 * 1000;
const TTL_NORMAL = 30 * 60 * 1000;

// Search the web. Returns [{ title, url, content, date?, source?, live? }] or [] on any problem. Never throws.
// fresh=true also pulls last-month Google News (dated articles) so the newest version of a fact can be found.
export async function webSearch(query, { max = 5, timeoutMs = 7000, fresh = false } = {}) {
  const q = clip(query, 400);
  if (!q) return [];
  const ck = (fresh ? "F|" : "N|") + q.toLowerCase();
  const hit = CACHE.get(ck);
  if (hit && Date.now() - hit.t < (fresh ? TTL_FRESH : TTL_NORMAL)) return hit.v;
  for (const provider of [serper, tavily, brave, duck]) {
    try {
      const res = await provider(q, max, timeoutMs, fresh);
      if (res && res.length) {
        const v = res.slice(0, max + 8);
        CACHE.set(ck, { t: Date.now(), v });
        if (CACHE.size > 400) CACHE.delete(CACHE.keys().next().value); // drop the oldest entry
        return v;
      }
    } catch {
      /* try the next provider */
    }
  }
  return [];
}

// Order results for the model: Google's live boxes first, then dated items newest-first, then undated ones.
// De-duplicates by link/text and keeps the block small, because a shorter prompt is a faster answer.
export function rankResults(results, limit = 16) {
  const seen = new Set();
  const uniq = [];
  for (const r of results || []) {
    const key = (r.url || r.content || "").slice(0, 90);
    if (key && !seen.has(key)) { seen.add(key); uniq.push(r); }
  }
  const live = uniq.filter((r) => r.live);
  const rest = uniq.filter((r) => !r.live).map((r, i) => ({ r, i, a: ageMs(r.date) }));
  rest.sort((x, y) => (x.a === y.a ? x.i - y.i : x.a - y.a));
  return [...live, ...rest.map((x) => x.r)].slice(0, limit);
}

// Turn search results into the block that is put in front of the user's question.
export function searchBlock(results, today) {
  if (!results || !results.length) return "";
  const lines = results
    .map((r, i) => {
      const meta = [r.source, r.date].filter(Boolean).join(", ");
      return `[${i + 1}] ${r.title ? r.title : ""}${meta ? " (" + meta + ")" : ""}${r.live ? " [LIVE]" : ""}\n${r.content}`;
    })
    .join("\n\n");
  return `\n\nWEB SEARCH RESULTS — fetched live just now${today ? " (today is " + today + ")" : ""}, sorted: live Google boxes first, then newest first.
HOW TO ANSWER (think carefully before writing):
1. LATEST: these results override your training completely. For anything that changes over time (people in office, prices, scores, versions, records, news), the answer is the NEWEST dated information here — never an older year's winner, holder, figure or model when a newer one appears.
2. VERIFIED: state a fact as certain only when it comes from a [LIVE] Google box, or at least two independent results agree on it, or an official source says it. If the newest results disagree with each other, give the newest well-supported one and say briefly that it isn't fully confirmed yet. Never invent a number, name or date that is not in the results.
3. DATE: for fast-changing facts, mention in a few words how recent the information is (e.g. "as of 14 November 2026").
4. Answer EVERY part of the question. If a part's answer is truly not in the results, say plainly you couldn't confirm that part.
5. Do not mention "search results", numbers in brackets or links — just answer naturally, clearly and directly.
${lines}
`;
}
