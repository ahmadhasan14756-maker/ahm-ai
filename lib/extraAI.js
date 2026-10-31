// More AI room for free: other AI services next to Gemini, used ONLY for writing code files of a build
// (Kurdish chat stays on Gemini, which writes Kurdish best). Each service has its own free limit, so every
// key added in Vercel adds room. Nothing here runs unless a key is set:
//   GROQ_API_KEYS, CEREBRAS_API_KEYS, OPENROUTER_API_KEYS, MISTRAL_API_KEYS, NVIDIA_API_KEYS, GITHUB_MODELS_API_KEYS,
//   CLOUDFLARE_API_KEYS (+ CLOUDFLARE_ACCOUNT_ID)   (one or more keys, any separator)
// Optional: <NAME>_MODEL (e.g. GROQ_MODEL) to choose the model yourself.
// They all speak the same "OpenAI-style" language, so one small client serves them all.
// Gemma (Google's open model) needs NO new key: it runs on the Gemini keys with its OWN free limit.
import { serverEnv } from "./env";
import { gemini, allKeys } from "./gemini";

const PROVIDERS = [
  { id: "groq", base: "https://api.groq.com/openai/v1", env: "GROQ", like: [/gpt-oss-120b/, /qwen.*coder/, /llama-3\.3-70b/, /llama.*70b/, /qwen/] },
  { id: "cerebras", base: "https://api.cerebras.ai/v1", env: "CEREBRAS", like: [/gpt-oss-120b/, /qwen.*coder/, /qwen-3.*235b/, /llama-3\.3-70b/, /llama/] },
  { id: "openrouter", base: "https://openrouter.ai/api/v1", env: "OPENROUTER", like: [/qwen.*coder.*:free/, /gpt-oss-120b:free/, /deepseek.*:free/, /llama-3\.3-70b.*:free/, /:free$/] },
  { id: "mistral", base: "https://api.mistral.ai/v1", env: "MISTRAL", like: [/^codestral-latest$/, /^mistral-medium-latest$/, /^mistral-small-latest$/, /codestral/, /mistral-small/] },
  { id: "nvidia", base: "https://integrate.api.nvidia.com/v1", env: "NVIDIA", like: [/gpt-oss-120b/, /qwen.*coder/, /llama-3\.3-70b/, /deepseek/, /llama.*70b/] },
  { id: "github", base: "https://models.github.ai/inference", env: "GITHUB_MODELS", fixed: "openai/gpt-4.1-mini" },
  { id: "cloudflare", base: () => `https://api.cloudflare.com/client/v4/accounts/${serverEnv("CLOUDFLARE_ACCOUNT_ID")}/ai/v1`, env: "CLOUDFLARE", fixed: "@cf/openai/gpt-oss-120b", needs: "CLOUDFLARE_ACCOUNT_ID" },
];
const baseOf = (p) => (typeof p.base === "function" ? p.base() : p.base);

const keysOf = (p) => [...new Set([serverEnv(p.env + "_API_KEY"), ...serverEnv(p.env + "_API_KEYS").split(/[^A-Za-z0-9_.\-]+/)].map((k) => (k || "").trim()).filter((k) => k.length > 15))];
const restUntil = new Map(); // "provider|key" → time: a full or broken key rests for a while
const modelCache = new Map(); // provider → chosen model (found once per server)
let turn = Math.floor(Math.random() * 1000);

// The services that have a key right now (and are not all resting).
export function extraProviders() {
  const now = Date.now();
  const list = PROVIDERS.filter((p) => (!p.needs || serverEnv(p.needs)) && keysOf(p).some((k) => !(restUntil.get(p.id + "|" + k) > now)));
  // Gemma: always there when Gemini keys exist (switch off with GEMMA=0), unless it is resting
  if (serverEnv("GEMMA") !== "0" && allKeys().length > 0 && !(restUntil.get("gemma|") > now)) list.push(GEMMA);
  return list;
}
export const extraCount = () => extraProviders().length;

async function pickModel(p, key) {
  const fixed = serverEnv(p.env + "_MODEL") || p.fixed;
  if (fixed) return fixed;
  if (modelCache.has(p.id)) return modelCache.get(p.id);
  // the service's own list of models: the best coding model that exists today is chosen (names change over time)
  const r = await fetch(baseOf(p) + "/models", { headers: { Authorization: "Bearer " + key }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw Object.assign(new Error(p.id + " models " + r.status), { status: r.status });
  const j = await r.json();
  const ids = (j.data || j.models || []).map((m) => m.id || m.name).filter(Boolean);
  let pick = null;
  for (const re of p.like) { pick = ids.find((id) => re.test(id)); if (pick) break; }
  if (!pick) throw new Error(p.id + ": no coding model");
  modelCache.set(p.id, pick);
  return pick;
}

// Gemini-style request → OpenAI-style request (text only; pictures stay with Gemini).
function toMessages(system, contents) {
  const msgs = [{ role: "system", content: String(system || "") }];
  for (const c of contents || []) {
    const text = (c.parts || []).map((x) => x.text || "").join("\n").trim();
    if (text) msgs.push({ role: c.role === "model" ? "assistant" : "user", content: text });
  }
  return msgs;
}

// Gemma on the Gemini keys: the newest large Gemma model that exists today is chosen once per server.
const GEMMA = { id: "gemma" };
let gemmaModel = null;
async function gemmaWrite({ system, contents, maxTokens, timeoutMs }) {
  const ai = gemini();
  if (!gemmaModel) {
    const names = [];
    try { const pager = await ai.models.list({ config: { pageSize: 200 } }); for await (const m of pager) names.push(String(m.name || "").replace(/^models\//, "")); } catch {}
    const score = (n) => { const m = /gemma-(\d+(?:\.\d+)?)[a-z-]*?-(\d+)b/i.exec(n); return m ? Number(m[1]) * 1000 + Number(m[2]) : -1; };
    gemmaModel = names.filter((n) => /^gemma-.*-it$/i.test(n)).sort((a, b) => score(b) - score(a))[0] || "gemma-3-27b-it";
  }
  // Gemma takes no separate system text: it goes in front of the request
  const text = String(system || "") + "\n\n" + (contents || []).map((c) => (c.parts || []).map((x) => x.text || "").join("\n")).join("\n\n");
  let tm;
  const r = await Promise.race([
    ai.models.generateContent({ model: gemmaModel, contents: [{ role: "user", parts: [{ text }] }], config: { maxOutputTokens: Math.min(maxTokens, 8192) } }),
    new Promise((_, no) => { tm = setTimeout(() => no(new Error("gemma timeout")), timeoutMs); }),
  ]).finally(() => clearTimeout(tm));
  const out = String(r.text || "");
  if (out.trim().length < 5) throw new Error("gemma empty");
  return { text: out, provider: "gemma", model: gemmaModel };
}

// Writes one answer with the next free service. → text, or throws (the caller then uses Gemini instead).
export async function extraWrite({ system, contents, maxTokens = 16000, timeoutMs = 150_000, avoid = [], prefer = "" }) {
  const list = extraProviders().filter((p) => !avoid.includes(p.id));
  if (!list.length) throw new Error("no extra AI");
  const p = list.find((x) => x.id === prefer) || list[turn++ % list.length];
  if (p === GEMMA) {
    try { return await gemmaWrite({ system, contents, maxTokens, timeoutMs }); }
    catch (e) {
      const full = /429|RESOURCE_EXHAUSTED|quota/i.test(String(e?.status || "") + String(e?.message || ""));
      if (full || /404|NOT_FOUND/.test(String(e?.message || ""))) { restUntil.set("gemma|", Date.now() + 60_000); if (!full) gemmaModel = null; }
      e.provider = "gemma"; throw e;
    }
  }
  const now = Date.now();
  const keys = keysOf(p).filter((k) => !(restUntil.get(p.id + "|" + k) > now));
  const key = keys[turn % keys.length];
  try {
    const model = await pickModel(p, key);
    const r = await fetch(baseOf(p) + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key, ...(p.id === "openrouter" ? { "X-Title": "AHM AI" } : {}) },
      body: JSON.stringify({ model, messages: toMessages(system, contents), max_tokens: maxTokens, temperature: 0.4, stream: false }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) {
      const why = (await r.text().catch(() => "")).slice(0, 160);
      // full (429) → rest a minute; wrong key (401/403) → rest 30 minutes; model gone (404) → choose again next time
      restUntil.set(p.id + "|" + key, Date.now() + (r.status === 429 ? 60_000 : r.status === 401 || r.status === 403 ? 30 * 60_000 : 20_000));
      if (r.status === 404 || r.status === 400) modelCache.delete(p.id);
      throw Object.assign(new Error(`${p.id} ${r.status} ${why}`), { status: r.status, provider: p.id });
    }
    const j = await r.json();
    const text = String(j.choices?.[0]?.message?.content || "").replace(/<think>[\s\S]*?<\/think>\s*/g, ""); // some models show their thinking first
    if (text.trim().length < 5) throw Object.assign(new Error(p.id + " empty"), { provider: p.id });
    return { text, provider: p.id, model };
  } catch (e) {
    if (!e.provider) { restUntil.set(p.id + "|" + key, Date.now() + 20_000); e.provider = p.id; }
    throw e;
  }
}
