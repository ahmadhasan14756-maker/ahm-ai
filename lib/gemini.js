// Shared helper: ask Gemini for JSON, with model fallback and retries.
import { GoogleGenAI } from "@google/genai";
import { serverEnv } from "./env";
import { SAFETY_RULES, GEMINI_SAFETY } from "./safety";

// Several free AI keys can be added (GEMINI_API_KEYS="key1,key2,…" in Vercel). Requests are spread over them,
// and when one key is busy (429) the next one is tried — more users before anyone sees "busy".
const clients = new Map();
let turn = 0;
export function allKeys() {
  return [...new Set([serverEnv("GEMINI_API_KEY"), ...serverEnv("GEMINI_API_KEYS").split(/[^A-Za-z0-9_.\-]+/)].map((k) => (k || "").trim()).filter((k) => k && k.length > 20))];
  // keys are split by ANY other sign (comma, Arabic comma «،» from a phone keyboard, space, new line…)
}
// A key Google says is wrong (401 "API key not valid", deleted, blocked) is skipped for 30 minutes,
// so one bad key never makes answers fail — the other keys keep working.
const badUntil = new Map();
export const isKeyError = (e) => /API key not valid|API_KEY_INVALID|API key expired|UNAUTHENTICATED|\b401\b|API_KEY_SERVICE_BLOCKED|has been suspended/i.test(String(e?.status || "") + " " + String(e?.message || e || ""));
export function markBadKey(client) { if (client?.__key) badUntil.set(client.__key, Date.now() + 30 * 60_000); }
export function keyList() {
  const all = allKeys(), now = Date.now();
  const good = all.filter((k) => !(badUntil.get(k) > now));
  return good.length ? good : all;
}
export const keyCount = () => Math.max(1, keyList().length);
export function gemini() {
  const keys = keyList();
  const key = keys.length ? keys[turn++ % keys.length] : serverEnv("GEMINI_API_KEY");
  if (!clients.has(key)) { const c = new GoogleGenAI({ apiKey: key }); c.__key = key; clients.set(key, c); }
  return clients.get(key);
}

const MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];
const THINKING = [{ thinkingLevel: "medium" }, { thinkingLevel: "low" }, { thinkingLevel: "minimal" }, null];
const LEVEL = { medium: 0, low: 1, minimal: 2 };
const code = (e) => String(e?.status || "") + " " + String(e?.message || e || "");

export async function jsonCall(system, parts, { maxTokens = 6000, think = "minimal" } = {}) {
  let lastErr;
  let busyTries = 0, keyFails = 0, ai = null;
  for (const model of MODELS) {
    for (const thinking of THINKING.slice(LEVEL[think] ?? 2)) {
      try {
        ai = gemini();
        const r = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts }],
          config: {
            systemInstruction: system + "\n" + SAFETY_RULES + "\nIf the request breaks these rules, return {\"blocked\": true} and nothing else.",
            safetySettings: GEMINI_SAFETY,
            responseMimeType: "application/json",
            maxOutputTokens: maxTokens,
            ...(thinking ? { thinkingConfig: thinking } : {}),
          },
        });
        if (/SAFETY|PROHIBITED|BLOCKLIST/i.test(String(r.promptFeedback?.blockReason || r.candidates?.[0]?.finishReason || ""))) throw new Error("unsafe");
        const txt = String(r.text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
        const out = JSON.parse(txt);
        if (out?.blocked) throw new Error("unsafe");
        return out;
      } catch (e) {
        if (e?.message === "unsafe") throw e;
        lastErr = e;
        console.error("jsonCall", model, code(e).slice(0, 200));
        if (isKeyError(e) && keyFails++ < 3) { markBadKey(ai); continue; } // a wrong key: the next key
        if (/429|RESOURCE_EXHAUSTED|quota/i.test(code(e)) && (busyTries = (busyTries || 0) + 1) < keyCount()) continue; // another key
        if (/429|RESOURCE_EXHAUSTED|quota|404|NOT_FOUND/i.test(code(e))) break; // next model
      }
    }
  }
  const err = new Error(/429|RESOURCE_EXHAUSTED|quota/i.test(code(lastErr)) ? "busy" : "ai");
  throw err;
}
