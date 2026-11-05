// Free, up-to-date web search for "this year / latest / who won / now" questions.
// The results are fed INTO the prompt, so EVERY AI provider the app uses (Gemini, Gemma, Groq, OpenRouter) gives a
// current answer — not only Gemini's own Google grounding (which needs billing enabled on the key).
// Uses Tavily (free tier, no credit card). Set TAVILY_API_KEY in Vercel to switch it on; without it the app simply
// falls back to its previous behaviour.
import { serverEnv } from "./env";

export const hasWebSearch = () => !!serverEnv("TAVILY_API_KEY");

// Search the web. Returns [{ title, url, content }] (a short "Summary" first when available), or [] on any problem.
// Never throws, so a slow or failing search never breaks the answer.
export async function webSearch(query, { max = 5, timeoutMs = 7000 } = {}) {
  const key = serverEnv("TAVILY_API_KEY");
  const q = String(query || "").trim().slice(0, 400);
  if (!key || !q) return [];
  try {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query: q,
        max_results: Math.min(8, Math.max(1, max)),
        search_depth: "basic",
        include_answer: true,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) return [];
    const j = await r.json().catch(() => null);
    if (!j) return [];
    const out = [];
    if (j.answer) out.push({ title: "Summary", url: "", content: String(j.answer).slice(0, 1200) });
    for (const it of Array.isArray(j.results) ? j.results : []) {
      if (it && it.content) {
        out.push({
          title: String(it.title || "").slice(0, 160),
          url: String(it.url || ""),
          content: String(it.content).slice(0, 700),
        });
      }
    }
    return out.slice(0, max + 1);
  } catch {
    return [];
  }
}

// Turn search results into a block to append to the system prompt.
export function searchBlock(results, today) {
  if (!results || !results.length) return "";
  const lines = results
    .map((r, i) => `[${i + 1}] ${r.title ? r.title + " — " : ""}${r.content}${r.url ? "\n(" + r.url + ")" : ""}`)
    .join("\n\n");
  return `\n\nWEB SEARCH RESULTS (fetched just now${today ? " (" + today + ")" : ""} — these are current and reliable; base your answer on them and prefer them over your own training whenever they differ; give the up-to-date answer, not an older year's):\n${lines}\n`;
}
