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

async function serper(q, max, timeoutMs) {
  const key = serverEnv("SERPER_API_KEY");
  if (!key) return [];
  const r = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q, num: Math.min(10, max + 2) }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) return [];
  const j = await r.json().catch(() => null);
  if (!j) return [];
  const out = [];
  const flat = (o) => clip(JSON.stringify(o).replace(/["{}\[\]]/g, " ").replace(/\b(title|link|date|snippet|thumbnail|imageUrl|source)\b/gi, " "), 1200);
  // Google's live boxes carry the up-to-the-minute answer (scores, prices, "last/next match") — capture them first.
  if (j.answerBox) {
    const ab = j.answerBox;
    const t = ab.answer || ab.snippet || ab.title;
    out.push({ title: "Answer", url: ab.link || "", content: clip(typeof t === "string" ? t : flat(ab), 1200) });
  }
  if (j.sports_results || j.sportsResults) out.push({ title: "Sports result (live)", url: "", content: flat(j.sports_results || j.sportsResults) });
  if (j.knowledgeGraph?.description || j.knowledgeGraph?.attributes) {
    const kg = j.knowledgeGraph;
    out.push({ title: clip(kg.title, 160), url: "", content: clip((kg.description || "") + " " + (kg.attributes ? flat(kg.attributes) : ""), 900) });
  }
  for (const it of (Array.isArray(j.topStories) ? j.topStories : []).slice(0, 3)) {
    if (it?.title) out.push({ title: clip(it.title, 160), url: String(it.link || ""), content: clip((it.title || "") + " " + (it.date || ""), 400) });
  }
  for (const it of Array.isArray(j.organic) ? j.organic : []) {
    if (it?.snippet) out.push({ title: clip(it.title, 160), url: String(it.link || ""), content: clip((it.snippet || "") + (it.date ? " (" + it.date + ")" : ""), 700) });
  }
  return out;
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

// Search the web. Returns [{ title, url, content }] or [] on any problem. Never throws.
export async function webSearch(query, { max = 5, timeoutMs = 7000 } = {}) {
  const q = clip(query, 400);
  if (!q) return [];
  for (const provider of [serper, tavily, brave, duck]) {
    try {
      const res = await provider(q, max, timeoutMs);
      if (res && res.length) return res.slice(0, max + 1);
    } catch {
      /* try the next provider */
    }
  }
  return [];
}

// Turn search results into a block to append to the system prompt.
export function searchBlock(results, today) {
  if (!results || !results.length) return "";
  const lines = results
    .map((r, i) => `[${i + 1}] ${r.title ? r.title + " — " : ""}${r.content}${r.url ? "\n(" + r.url + ")" : ""}`)
    .join("\n\n");
  return `\n\nWEB SEARCH RESULTS — fetched live from the web just now${today ? " (" + today + ")" : ""}. These are the CURRENT truth. For any "this year / latest / who won / current" question you MUST answer from these results only. They override your training completely: if your memory says one name/number and these results say another, the results are right and your memory is out of date — never give an older year's winner, holder or figure when the results show a newer one. Read them carefully, find the answer for the year asked about, and state it directly. If the question has SEVERAL parts, answer EVERY part from these results (each part's answer is somewhere in them). Only if the results genuinely do not contain a part's answer may you say you couldn't find that one. Do not mention "search results" or links in your reply — just give the answers naturally.\n${lines}\n`;
}
