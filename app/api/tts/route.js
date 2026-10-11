// Read an answer aloud: text → speech (Gemini TTS, free tier) → WAV audio.
import { GoogleGenAI } from "@google/genai";
import { serverEnv } from "../../../lib/env";
import { getUser } from "../../../lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const preferredRegion = "fra1";

const MODELS = ["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts", "gemini-3.1-flash-tts-preview"];
let ai;
const gemini = () => (ai ||= new GoogleGenAI({ apiKey: serverEnv("GEMINI_API_KEY") }));

// Remove things that should not be spoken: code, links, markdown symbols.
function speakable(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/[*_~>|#]+/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\u0000ERR:\w+/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim()
    .slice(0, 1500);
}

// Gemini returns raw 16-bit PCM; browsers need a WAV header in front of it.
function wav(pcm, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

export async function POST(req) {
  const [user, body] = await Promise.all([getUser(req), req.json().catch(() => null)]);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const text = speakable(body?.text);
  if (!text) return Response.json({ error: "empty" }, { status: 400 });

  let lastErr;
  for (const model of MODELS) {
    try {
      const r = await gemini().models.generateContent({
        model,
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
        },
      });
      const part = r.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part) throw new Error("no audio");
      const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType || "")?.[1]) || 24000;
      const audio = wav(Buffer.from(part.inlineData.data, "base64"), rate);
      return new Response(audio, { headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" } });
    } catch (e) {
      lastErr = e;
      console.error("tts", model, String(e?.message || e).slice(0, 200));
    }
  }
  const busy = /429|RESOURCE_EXHAUSTED|quota/i.test(String(lastErr?.message || ""));
  return Response.json({ error: busy ? "busy" : "tts" }, { status: busy ? 503 : 502 });
}
