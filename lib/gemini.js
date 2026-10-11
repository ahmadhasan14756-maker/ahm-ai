// Shared helper: ask Gemini for JSON, with model fallback and retries.
import { GoogleGenAI } from "@google/genai";
import { serverEnv } from "./env";
import { SAFETY_RULES, GEMINI_SAFETY } from "./safety";

let ai;
export const gemini = () => (ai ||= new GoogleGenAI({ apiKey: serverEnv("GEMINI_API_KEY") }));

const MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];
const THINKING = [{ thinkingLevel: "minimal" }, { thinkingLevel: "low" }, null];
const code = (e) => String(e?.status || "") + " " + String(e?.message || e || "");

export async function jsonCall(system, parts, { maxTokens = 6000 } = {}) {
  let lastErr;
  for (const model of MODELS) {
    for (const thinking of THINKING) {
      try {
        const r = await gemini().models.generateContent({
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
        if (/429|RESOURCE_EXHAUSTED|quota|404|NOT_FOUND/i.test(code(e))) break; // next model
      }
    }
  }
  const err = new Error(/429|RESOURCE_EXHAUSTED|quota/i.test(code(lastErr)) ? "busy" : "ai");
  throw err;
}
