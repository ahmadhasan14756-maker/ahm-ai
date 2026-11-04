// Read an answer aloud: text → speech (Gemini TTS, free tier) → WAV audio.
import { getUser, getProfile, usageOf, getSettings } from "../../../lib/server";
import { voiceLimitMin, voiceUsedSec, addVoiceSec } from "../../../lib/voice";
import { gemini, keyCount } from "../../../lib/gemini";

import { allow, tooMany } from "../../../lib/ratelimit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const preferredRegion = "fra1";

const MODELS = ["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts", "gemini-3.1-flash-tts-preview"];

// Remove things that should not be spoken: code, links, markdown symbols.
function speakable(text) {
  return String(text || "")
    .replace(/⟦[^⟧]*⟧/g, " ")
    .replace(/[⟦⟧]/g, " ")
    .replace(/\u0000RESET\n?/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/[*_~>|#]+/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/[⁦-⁩‎‏​-‍﻿]/g, "")
    .replace(/[←-➿⬀-⯿]/g, "")
    .replace(/\u0000ERR:\w+/g, "")
    .replace(/\p{Extended_Pictographic}\uFE0F?/gu, "") // emojis are not read out
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim()
    .slice(0, 1500);
}

// The TTS sometimes leaves a trailing breath, click or burst of static after the speech ends (heard as "noise at the
// end"), and occasionally a click at the very start. We find where the real speech ends using short-window energy,
// cut everything after it (plus a small natural tail), and apply a fade-in and fade-out so nothing clicks.
function smoothPcm(pcm, rate = 24000) {
  if (!pcm || pcm.length < 4) return pcm;
  let n = Math.floor(pcm.length / 2); // 16-bit samples
  const win = Math.max(1, Math.floor(rate * 0.02)); // 20 ms windows
  const THRESH = 350; // RMS below this is silence / low static, not speech
  // Walk windows from the end and find the last one that is clearly speech.
  let lastSpeechEnd = n;
  for (let start = n - win; start >= 0; start -= win) {
    let sum = 0;
    for (let i = 0; i < win; i++) { const v = pcm.readInt16LE((start + i) * 2); sum += v * v; }
    if (Math.sqrt(sum / win) >= THRESH) { lastSpeechEnd = Math.min(n, start + win + Math.floor(rate * 0.06)); break; } // keep a 60 ms tail
  }
  if (lastSpeechEnd < n) n = lastSpeechEnd;
  const out = Buffer.from(pcm.subarray(0, n * 2));
  const fadeIn = Math.min(Math.floor(rate * 0.01), n);   // ~10 ms
  const fadeOut = Math.min(Math.floor(rate * 0.04), n);  // ~40 ms
  for (let i = 0; i < fadeIn; i++) {
    const g = i / fadeIn;
    out.writeInt16LE(Math.round(out.readInt16LE(i * 2) * g), i * 2);
  }
  for (let i = 0; i < fadeOut; i++) {
    const g = i / fadeOut;
    const idx = (n - 1 - i) * 2;
    out.writeInt16LE(Math.round(out.readInt16LE(idx) * g), idx);
  }
  return out;
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
  if (!(await allow("tts:" + user.id, 30, 60000))) return tooMany();
  const text = speakable(body?.text);
  if (!text) return Response.json({ error: "empty" }, { status: 400 });

  // Daily voice minutes of the user's plan.
  const [profile, settings] = await Promise.all([getProfile(user), getSettings()]);
  const usage = usageOf(profile, settings);
  const limitMin = voiceLimitMin(usage, settings);
  if (Number.isFinite(limitMin) && (await voiceUsedSec(user.id)) >= limitMin * 60) {
    return Response.json({ error: "voice_limit", minutes: limitMin, pro: usage.pro }, { status: 429 });
  }

  let lastErr;
  // every model is tried with each AI key (a busy key is skipped quickly)
  const tries = MODELS.flatMap((model) => Array.from({ length: keyCount() }, () => model));
  for (const model of tries) {
    try {
      const r = await gemini().models.generateContent({
        model,
        // NOTE: never prepend an English style instruction to the text — the TTS sometimes reads it out loud, so the
        // user hears English before the real answer. The voice (voiceName below) already sounds warm and natural.
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
        },
      });
      const part = r.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part) throw new Error("no audio");
      const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType || "")?.[1]) || 24000;
      const pcm = smoothPcm(Buffer.from(part.inlineData.data, "base64"), rate);
      const audio = wav(pcm, rate);
      await addVoiceSec(user.id, pcm.length / (rate * 2)); // count the seconds spoken
      return new Response(audio, { headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" } });
    } catch (e) {
      lastErr = e;
      console.error("tts", model, String(e?.message || e).slice(0, 200));
      if (!/429|RESOURCE_EXHAUSTED|quota/i.test(String(e?.message || ""))) continue;
    }
  }
  const busy = /429|RESOURCE_EXHAUSTED|quota/i.test(String(lastErr?.message || ""));
  return Response.json({ error: busy ? "busy" : "tts" }, { status: busy ? 503 : 502 });
}
