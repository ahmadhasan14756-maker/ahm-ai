// Language learning: placement test, daily lessons and pronunciation feedback.
import { jsonCall } from "../../../lib/gemini";
import { getUser, getProfile, usageOf, getSettings, blockedResponse, chargeUsage } from "../../../lib/server";

import { allow, tooMany } from "../../../lib/ratelimit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const preferredRegion = "fra1";

const NAME = {
  ckb: "Kurdish Sorani (always Arabic script)",
  ar: "Arabic (Modern Standard Arabic)",
  en: "English",
};
const LEVELS = ["A0", "A1", "A2", "B1", "B2", "C1"];

const placementPrompt = (target, native) => `Create a placement test for someone learning ${target}. Their own language is ${native}.
Return JSON {"questions":[{"q":"...","options":["...","...","...","..."],"answer":0,"level":"A1"}]}.
- Exactly 10 questions: 2 at A1, 2 at A2, 2 at B1, 2 at B2, 2 at C1, ordered from easy to hard.
- Mix vocabulary, grammar and short reading. Questions and options are written in ${target}. For the A1 questions add a short hint in ${native} in brackets.
- Exactly one correct option per question. Put the correct option at a different position each time ("answer" is its index 0–3).`;

const lessonPrompt = (target, native, level, day, previous) => `You are an excellent, warm ${target} teacher writing a daily lesson.
Learner: own language ${native}, CEFR level ${level}${level === "A0" ? " (complete beginner: start with letters, sounds and the simplest words)" : ""}. This is lesson day ${day}.
Earlier lesson titles (do not repeat these topics): ${previous.length ? previous.join(" | ") : "none"}.
Follow a sensible course order: greetings and introductions first, then everyday topics (numbers, family, food, time, shopping, directions, travel, work, health, feelings, opinions…). Grammar and vocabulary must match the level.
Return JSON:
{"title": short title in ${native},
 "goal": one sentence in ${native} saying what they will be able to do,
 "words": [8 items {"word": in ${target}, "say": pronunciation written in ${native} script, "meaning": in ${native}}],
 "phrases": [5 useful sentences {"text": in ${target}, "say": pronunciation in ${native} script, "meaning": in ${native}}],
 "dialogue": [4–6 lines {"who": "A" or "B", "text": in ${target}, "meaning": in ${native}}],
 "grammar": one short grammar or usage point explained in ${native}, with 2 examples (Markdown allowed, max 120 words),
 "quiz": [5 items {"q": question in ${native} about this lesson, "options": [4 short options], "answer": index 0–3}]}
When ${target} is Kurdish Sorani, write Kurdish only in Arabic script. Everything must be accurate and natural.`;

const speakPrompt = (target, native, level, sentence) => `You are a kind, precise pronunciation coach for ${target}.
The learner (own language ${native}, level ${level}) tried to say exactly this sentence: "${sentence}".
Listen to the audio carefully. Return JSON:
{"heard": what they actually said, written in ${target},
 "score": 0–100 for how close and clear it was (100 = perfect, 60+ = understandable),
 "feedback": 1–2 encouraging sentences in ${native}: what was good and the main thing to fix,
 "tip": one concrete pronunciation tip in ${native} (which sound, how to move the mouth/tongue)}.
If the audio is silent, noise or a different sentence, give a low score and say so kindly.`;

export async function POST(req) {
  try {
    const [user, body] = await Promise.all([getUser(req), req.json().catch(() => null)]);
    if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
    if (!allow("learn:" + user.id, 20, 60000)) return tooMany();
    if (!body) return Response.json({ error: "bad_request" }, { status: 400 });

    const target = NAME[body.target];
    const native = NAME[body.native] || NAME.ckb;
    const level = LEVELS.includes(body.level) ? body.level : "A1";
    if (!target) return Response.json({ error: "bad_request" }, { status: 400 });

    const profile = await getProfile(user);
    const usage = usageOf(profile, await getSettings());
    const blocked = await blockedResponse(profile, usage);
    if (blocked) return blocked;

    let out;
    if (body.action === "placement") {
      out = await jsonCall(placementPrompt(target, native), [{ text: "Write the test now." }]);
      const qs = (out.questions || []).filter((q) => q?.q && Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.answer));
      if (qs.length < 5) throw new Error("ai");
      out = { questions: qs.slice(0, 10) };
    } else if (body.action === "lesson") {
      const day = Math.max(1, Math.min(999, parseInt(body.day, 10) || 1));
      const previous = (Array.isArray(body.previous) ? body.previous : []).map((s) => String(s).slice(0, 60)).slice(-12);
      out = await jsonCall(lessonPrompt(target, native, level, day, previous), [{ text: `Write lesson day ${day}.` }], { maxTokens: 8000 });
      if (!out?.words?.length) throw new Error("ai");
    } else if (body.action === "speak") {
      const sentence = String(body.sentence || "").slice(0, 300);
      const audio = body.audio;
      if (!sentence || !audio?.data || !/^audio\//.test(audio.mimeType || "") || audio.data.length > 3_000_000) {
        return Response.json({ error: "bad_request" }, { status: 400 });
      }
      out = await jsonCall(speakPrompt(target, native, level, sentence), [
        { inlineData: { mimeType: audio.mimeType, data: audio.data } },
        { text: "Here is my attempt." },
      ], { maxTokens: 1500 });
      out.score = Math.max(0, Math.min(100, Math.round(Number(out.score) || 0)));
    } else {
      return Response.json({ error: "bad_request" }, { status: 400 });
    }

    await chargeUsage(profile, usage);

    return Response.json(out);
  } catch (e) {
    console.error("learn", e?.message);
    if (e?.message === "unsafe") return Response.json({ error: "unsafe" }, { status: 400 });
    const busy = e?.message === "busy";
    return Response.json({ error: busy ? "busy" : "ai" }, { status: busy ? 503 : 502 });
  }
}
