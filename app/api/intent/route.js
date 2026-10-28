// Works out what the user wants from their first message: a normal answer, a website/app/code project, or an image.
import { getUser } from "../../../lib/server";
import { quickGuess } from "../../../lib/intent";
import { gemini } from "../../../lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;
export const preferredRegion = "fra1";

const MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash"];

const SYSTEM = `Classify the user's message (Kurdish Sorani, Arabic or English, maybe Kurdish in Latin letters). Return JSON {"mode": "..."}.
- "build": they want you to CREATE or CHANGE a whole website, web app, mobile app, game, program or multi-file code project for them.
- "image": they want you to CREATE or EDIT a picture: draw, generate, design a logo, poster, wallpaper, illustration, photo, or edit / merge photos.
- "construct": house/building design ideas, floor plans, room layouts, construction materials or building cost estimates, construction terms.
- "chat": everything else — making an Excel, PowerPoint, Word or PDF file, questions, explanations, advice, translation, writing text, predictions, explaining or fixing a small piece of code, short code snippets.
When unsure, answer "chat".`;

export async function POST(req) {
  const [user, body] = await Promise.all([getUser(req), req.json().catch(() => null)]);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const text = String(body?.text || "").slice(0, 1500);
  if (!text.trim()) return Response.json({ mode: "chat" });

  const guess = quickGuess(text);
  if (guess) return Response.json({ mode: guess, quick: true });

  for (const model of MODELS) {
    for (const thinking of [{ thinkingLevel: "minimal" }, null]) {
      try {
        const r = await gemini().models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text }] }],
          config: { systemInstruction: SYSTEM, responseMimeType: "application/json", maxOutputTokens: 40, ...(thinking ? { thinkingConfig: thinking } : {}) },
        });
        const mode = JSON.parse(r.text || "{}").mode;
        if (["chat", "build", "image", "construct"].includes(mode)) return Response.json({ mode });
      } catch (e) {
        console.error("intent", model, String(e?.message || e).slice(0, 160));
      }
    }
  }
  return Response.json({ mode: "chat" });
}
