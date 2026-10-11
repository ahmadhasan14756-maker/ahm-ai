import { serverEnv } from "../../../lib/env";
import { GoogleGenAI } from "@google/genai";
import { adminDb, getUser, getProfile, usageOf } from "../../../lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
// Run next to the database (Supabase is in Frankfurt) so each step is faster.
export const preferredRegion = "fra1";

let ai;
const gemini = () => (ai ||= new GoogleGenAI({ apiKey: serverEnv("GEMINI_API_KEY") }));

const LANG_NAME = { ckb: "Kurdish Sorani (Arabic script)", ar: "Arabic", en: "English" };

const SYSTEM_PROMPT = (lang) => `You are "AHM AI", a brilliant, warm and honest assistant made by the AHM team.

LANGUAGE
- Reply in the language of the user's latest message: Kurdish Sorani (always Arabic script), Arabic, or English.
- If the user writes Kurdish in Latin letters (e.g. "slaw chony"), understand it and reply in Kurdish Sorani with Arabic script.
- If the language is unclear, use ${LANG_NAME[lang] || LANG_NAME.ckb}.
- Write natural, fluent, correct Kurdish Sorani — not word-by-word translation.

HOW TO ANSWER
- Answer every reasonable question directly and completely. Start with the answer, then explain only as much as is useful.
- Match the length to the question: short questions get short answers; complex ones get structured answers with headings or lists.
- Think step by step for maths, logic and technical problems, and double-check results before answering.
- If something is uncertain, say so honestly. Never invent facts, numbers, sources or links.
- Be friendly and respectful, like a smart friend. No unnecessary apologies or filler.

CODE
- You are an expert programmer in every major language and framework.
- Write complete, working, clean code with sensible names and short comments where they help. Never leave "..." or TODO placeholders unless asked.
- Put code in fenced code blocks with a language tag (e.g. \`\`\`python).
- When fixing a bug: explain the cause in one or two sentences, then give the corrected code.
- For a large project, give the file structure first, then each file.

VOICE, FILES AND IMAGES
- If the user sends a voice message (audio), listen carefully, understand it in whatever language it is spoken (Kurdish Sorani, Arabic or English), and reply in that same language. Do not repeat the transcript unless asked.
- If the user sends a PDF, read it fully and answer about its content.
- When the user sends images, look at them carefully: describe them, read any text in them (including Kurdish and Arabic), explain screenshots, solve problems shown in photos, and find bugs in screenshots of code or errors.

PREDICTIONS
- You cannot see the future. For predictions (sports, prices, exchange rates, markets, elections) give a careful, reasoned analysis: the main factors, the most likely outcome, rough probabilities, and clearly say it can be wrong. Never present a guess as certain. Do not give personal financial or betting advice.

IDENTITY
- Your name is AHM AI. If asked which company or model is behind you, say you are AHM AI, developed by the AHM team, and that you cannot share technical details about the underlying technology. Never claim to be human.

SAFETY
- Refuse clearly harmful requests (weapons, hacking others, self-harm instructions, illegal drugs) briefly and kindly, and offer a safe alternative.`;

const FILE_PROMPT = `
The user attached a file. Read it fully. Explain the problems you find in the user's language.
Then give EVERY change as an edit block in exactly this format (inside a \`\`\`text code block):

<<<<<<< SEARCH
exact lines copied from the original file
=======
the fixed lines
>>>>>>> REPLACE

Rules: the SEARCH part must match the original file exactly (same spaces), include enough lines to be unique, keep each block small. Never rewrite the whole file.`;

const BUILD_PROMPT = `
You are in CODE WORKSPACE mode, like a senior developer working inside VS Code for the user.
The user's project files are given to you. You create, change and delete files directly in the project.

FILE FORMAT (very important)
- Write every new or changed file as ONE fenced block whose info string is file:PATH, with the COMPLETE file content:
\`\`\`file:src/app.py
...complete file...
\`\`\`
- To delete a file, write an empty block: \`\`\`delete:old/file.js\`\`\` (on its own lines).
- Use folders when it helps (src/, assets/, css/, js/ ...). Paths use forward slashes, no leading slash.
- Output ONLY files that change. Never output partial files, "..." or "rest of code unchanged".

WHAT TO BUILD
- Any language or stack the user asks for: websites (HTML/CSS/JS), Python, Node.js, PHP, Java, C#, Flutter, React, etc.
- If the user does not name a stack and wants a website or app, use plain HTML + CSS + JavaScript with index.html at the root, style.css and script.js linked by relative paths. This runs instantly in the live phone preview.
- Mobile-first, beautiful, professional design: clear colour palette, good spacing, readable fonts (Google Fonts allowed), smooth touch targets. Use dir="rtl" for Kurdish or Arabic content. Fully working, not a mock-up; use localStorage when useful.
- Libraries for web pages only from https://cdnjs.cloudflare.com or https://cdn.jsdelivr.net.
- ALWAYS create or update README.md written in the user's language with: what the project does, the file structure, and numbered beginner steps to run it on a Windows or Mac computer after downloading the ZIP (which program to install, which folder to open, which command to type, what they should see). For plain HTML projects, explain that double-clicking index.html opens it, and how to put it online for free.

ANSWER SHAPE
- First write 1–4 short sentences in the user's language: what you built or changed, and the next step.
- Then the file blocks. No other code blocks.`;

const MAX_MESSAGES = 30;
const MAX_FILE_CHARS = 1_500_000;
const MAX_PROJECT_CHARS = 600_000;
const MAX_ATTACH_CHARS = 4_200_000; // Vercel accepts ~4.5 MB per request
const FALLBACK_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];
const ATTACH_TYPES = /^(image\/(jpeg|png|webp|heic|heif|gif)|application\/pdf|audio\/(webm|mp4|mpeg|ogg|wav|aac|x-m4a|m4a))$/;

const errText = (e) => String(e?.message || e || "").slice(0, 400);
const errCode = (e) => String(e?.status || e?.code || "") + " " + errText(e);
const isRateLimit = (e) => /429|RESOURCE_EXHAUSTED|quota/i.test(errCode(e));
const isModelMissing = (e) => /404|NOT_FOUND|not found|not supported/i.test(errCode(e));
const isBadConfig = (e) => /400|INVALID_ARGUMENT|thinking|tool/i.test(errCode(e));
const isTransient = (e) => /500|502|503|504|UNAVAILABLE|INTERNAL|overloaded|timeout|timed out|ECONNRESET|fetch failed|socket|network/i.test(errCode(e));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Remember which "thinking" setting each model accepts, so later questions skip failed tries.
const THINKING = [{ thinkingLevel: "minimal" }, { thinkingLevel: "low" }, null];
const thinkingOk = new Map();

/*
  Streams the answer as text pieces. Tries hard before giving up:
  - busy / quota  → next model (each model has its own free quota)
  - temporary error → wait a moment and try the same model again (2×), then the next model
  - unsupported setting → simpler setting
  - an error before any text was sent → start again quietly
*/
async function* answer(models, contents, baseConfig, useSearch) {
  let lastErr = null;
  let sentAny = false;
  for (const model of models) {
    let level = thinkingOk.get(model) ?? 0;
    let search = useSearch;
    let transientTries = 0;
    while (level < THINKING.length) {
      const config = { ...baseConfig };
      if (THINKING[level]) config.thinkingConfig = THINKING[level];
      if (search) config.tools = [{ googleSearch: {} }];
      try {
        const stream = await gemini().models.generateContentStream({ model, contents, config });
        thinkingOk.set(model, level);
        const sources = new Map();
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) { sentAny = true; yield text; }
          const g = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          for (const c of g) if (c.web?.uri) sources.set(c.web.uri, c.web.title || c.web.uri);
        }
        if (sentAny && sources.size) {
          yield "\n\n---\n" + [...sources].slice(0, 6).map(([u, t], i) => `${i + 1}. [${t.replace(/[\[\]]/g, "")}](${u})`).join("\n");
        }
        if (sentAny) return;
        lastErr = new Error("empty answer");
        break; // empty: try the next model
      } catch (e) {
        lastErr = e;
        console.error("gemini", model, level, errText(e));
        if (sentAny) { yield isRateLimit(e) ? "\n\n\u0000ERR:busy" : "\n\n\u0000ERR:ai"; return; }
        if (isRateLimit(e) || isModelMissing(e)) break;
        if (isTransient(e) && transientTries < 2) { transientTries++; await sleep(700 * transientTries); continue; }
        if (search && isBadConfig(e)) { search = false; continue; }
        if (isBadConfig(e)) { level++; continue; }
        break;
      }
    }
  }
  yield isRateLimit(lastErr) ? "\u0000ERR:busy" : "\u0000ERR:ai";
}

export async function POST(req) {
  try {
    const [user, body] = await Promise.all([getUser(req), req.json().catch(() => null)]);
    if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
    if (!body) return Response.json({ error: "bad_request" }, { status: 400 });

    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .slice(-MAX_MESSAGES);
    while (messages.length && messages[0].role === "assistant") messages.shift(); // Gemini wants the user to speak first
    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return Response.json({ error: "bad_request" }, { status: 400 });
    }

    const lang = ["ckb", "ar", "en"].includes(body.lang) ? body.lang : "ckb";
    const build = body.mode === "build";
    const file = !build && body.file && typeof body.file.content === "string" ? body.file : null;
    const project =
      build && body.project && typeof body.project === "object"
        ? Object.entries(body.project).filter(([k, v]) => typeof k === "string" && typeof v === "string")
        : [];

    let total = 0;
    const attachments = (Array.isArray(body.images) ? body.images : [])
      .filter((a) => a && ATTACH_TYPES.test(a.mimeType) && typeof a.data === "string")
      .filter((a) => (total += a.data.length) < MAX_ATTACH_CHARS)
      .slice(0, 6);

    // ---- usage limits ----
    const profile = await getProfile(user);
    const usage = usageOf(profile);
    if (file && !usage.pro) return Response.json({ error: "pro_only" }, { status: 403 });
    if (file && file.content.length > MAX_FILE_CHARS) return Response.json({ error: "file_too_big" }, { status: 413 });
    if (project.reduce((n, [, v]) => n + v.length, 0) > MAX_PROJECT_CHARS) return Response.json({ error: "file_too_big" }, { status: 413 });
    if (usage.used >= usage.limit) return Response.json({ error: "limit", ...usage }, { status: 429 });

    // ---- build the conversation ----
    const contents = messages.map((m, i) => {
      let text = m.content.slice(0, 30000);
      const last = i === messages.length - 1;
      if (last && file) {
        text = `File name: ${String(file.name || "file").slice(0, 200)}\n\`\`\`\n${file.content}\n\`\`\`\n\n${text}`;
      }
      if (last && build) {
        const files = project.length ? project.map(([k, v]) => `\`\`\`file:${k}\n${v}\n\`\`\``).join("\n\n") : "(empty project)";
        text = `Current project files:\n\n${files}\n\nRequest: ${text}`;
      }
      const parts = [{ text }];
      if (last && attachments.length) parts.unshift(...attachments.map((a) => ({ inlineData: { mimeType: a.mimeType, data: a.data } })));
      return { role: m.role === "assistant" ? "model" : "user", parts };
    });

    const preferred = usage.pro ? serverEnv("GEMINI_MODEL_PRO") || serverEnv("GEMINI_MODEL") : serverEnv("GEMINI_MODEL");
    const models = [...new Set([preferred, ...FALLBACK_MODELS].filter(Boolean))];
    const TUTOR_LANG = { ckb: "Kurdish Sorani (Arabic script)", ar: "Arabic", en: "English" };
    const tutor = body.tutor && TUTOR_LANG[body.tutor.target] ? body.tutor : null;
    const TUTOR_PROMPT = tutor ? `

LANGUAGE TEACHER MODE (this overrides the LANGUAGE rules above)
- You are a warm, patient ${TUTOR_LANG[tutor.target]} conversation teacher. The learner's level is ${String(tutor.level).slice(0, 3)} (CEFR) and their own language is ${LANG_NAME[lang] || LANG_NAME.ckb}.
- Reply mainly in ${TUTOR_LANG[tutor.target]}, using words and grammar that fit their level. Keep each reply short: 2–5 sentences, then ask ONE simple question to keep the conversation going.
- If the learner's last message has mistakes, add a short section starting with "✏️" in their own language: show the corrected sentence and explain the mistake in one line. If there were no mistakes, praise them briefly.
- For beginners (A0/A1) add the meaning in their own language in brackets after difficult sentences.
- If they ask for help or a translation, give it, then continue the conversation.` : "";
    const baseConfig = {
      systemInstruction: SYSTEM_PROMPT(lang) + (file ? FILE_PROMPT : "") + (build ? BUILD_PROMPT : "") + TUTOR_PROMPT,
      maxOutputTokens: file || build ? 32768 : 8192,
    };
    // Web search costs money on Google's side: switch it on in Vercel with ENABLE_SEARCH=1 (Pro users only).
    const useSearch = !build && usage.pro && serverEnv("ENABLE_SEARCH") === "1";

    const encoder = new TextEncoder();
    let counted = false;
    const countUsage = async () => {
      if (counted) return;
      counted = true;
      const { error } = await adminDb()
        .from("profiles")
        .update({ used: usage.used + 1, period_key: usage.periodKey, total_count: (profile.total_count || 0) + 1 })
        .eq("id", user.id);
      if (error) console.error("usage update", error.message);
    };

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const piece of answer(models, contents, baseConfig, useSearch)) {
            if (!piece.includes("\u0000ERR:")) countUsage(); // only count questions that got an answer
            controller.enqueue(encoder.encode(piece));
          }
        } catch (e) {
          console.error(e);
          controller.enqueue(encoder.encode("\u0000ERR:ai"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" },
    });
  } catch (e) {
    console.error("chat route", e);
    return Response.json({ error: "server", detail: errText(e) }, { status: 500 });
  }
}
