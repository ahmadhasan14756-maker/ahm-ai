// Image studio: turns the user's idea (any language) into a strong English prompt for the image generator.
import { GoogleGenAI } from "@google/genai";
import { serverEnv } from "../../../lib/env";
import { adminDb, getUser, getProfile, usageOf } from "../../../lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const preferredRegion = "fra1";

const MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];
let ai;
const gemini = () => (ai ||= new GoogleGenAI({ apiKey: serverEnv("GEMINI_API_KEY") }));

const STYLES = {
  photo: "ultra-realistic professional photograph, natural light, sharp focus, 35mm, high detail",
  art: "beautiful detailed digital illustration, rich colours, artstation quality",
  logo: "clean professional vector logo, flat design, simple shapes, centered on a plain background, no mockup, minimal text",
  "3d": "high-quality 3D render, soft studio lighting, octane render, detailed materials",
  poster: "professional graphic design poster, bold layout, striking composition, print quality",
};

const SYSTEM = `You write prompts for an image generator that only understands English.
The user describes an image in Kurdish Sorani, Arabic or English.
Return JSON: {"prompt": "...", "caption": "..."}
- "prompt": one detailed English prompt (40–90 words): subject, setting, composition, lighting, colours, mood, camera/style details. Keep every detail the user asked for. If the user wants words on the image, put them in quotes and keep them very short.
- "caption": one short friendly sentence in the user's language describing what you are drawing.
Never include violence, nudity or real private people. If the request is not allowed, make a safe, related image instead.`;

export async function POST(req) {
  try {
    const [user, body] = await Promise.all([getUser(req), req.json().catch(() => null)]);
    if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
    const idea = String(body?.prompt || "").trim().slice(0, 2000);
    if (!idea) return Response.json({ error: "bad_request" }, { status: 400 });
    const style = STYLES[body?.style] ? body.style : "photo";

    const profile = await getProfile(user);
    const usage = usageOf(profile);
    if (usage.used >= usage.limit) return Response.json({ error: "limit", ...usage }, { status: 429 });

    let out = null;
    let lastErr;
    for (const model of MODELS) {
      for (const thinking of [{ thinkingLevel: "minimal" }, null]) {
        try {
          const r = await gemini().models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: `Style: ${STYLES[style]}\nRequest: ${idea}` }] }],
            config: { systemInstruction: SYSTEM, responseMimeType: "application/json", ...(thinking ? { thinkingConfig: thinking } : {}) },
          });
          const j = JSON.parse(r.text || "{}");
          if (j.prompt) { out = j; break; }
        } catch (e) {
          lastErr = e;
          console.error("imagine", model, String(e?.message || e).slice(0, 200));
        }
      }
      if (out) break;
    }
    if (!out) {
      const busy = /429|RESOURCE_EXHAUSTED|quota/i.test(String(lastErr?.message || ""));
      return Response.json({ error: busy ? "busy" : "ai" }, { status: busy ? 503 : 502 });
    }

    await adminDb()
      .from("profiles")
      .update({ used: usage.used + 1, period_key: usage.periodKey, total_count: (profile.total_count || 0) + 1 })
      .eq("id", user.id);

    const prompt = `${String(out.prompt).slice(0, 900)}, ${STYLES[style]}`;
    return Response.json({ prompt, caption: String(out.caption || "").slice(0, 300) });
  } catch (e) {
    console.error("imagine route", e);
    return Response.json({ error: "server" }, { status: 500 });
  }
}
