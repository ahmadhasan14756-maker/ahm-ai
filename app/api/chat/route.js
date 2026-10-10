import { serverEnv } from "../../../lib/env";
import { GoogleGenAI } from "@google/genai";
import { adminDb, getUser, getProfile, usageOf } from "../../../lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
You are in WEBSITE / APP BUILDER mode. The user wants a working website or web app that is shown live inside a phone preview.
- Write every file as a fenced block whose info string is file:PATH, for example:
\`\`\`file:index.html
...complete file...
\`\`\`
- Use plain HTML, CSS and JavaScript only (no npm, no build step, no TypeScript, no JSX). Libraries only from https://cdnjs.cloudflare.com or https://cdn.jsdelivr.net if really needed.
- Always have index.html. Put styles in style.css and logic in script.js, linked with relative paths (<link rel="stylesheet" href="style.css">, <script src="script.js"></script>).
- Mobile-first: it must look great at 360–430px wide and also on desktop. Beautiful, modern, polished design: a clear colour palette, good spacing, readable fonts (Google Fonts allowed), smooth touch targets, subtle animations. Use dir="rtl" for Kurdish or Arabic content.
- Make it fully working, not a mock-up. Save data with localStorage when useful.
- When the project already has files, output ONLY the files that change, and always each file COMPLETE (never partial snippets, never "..." placeholders).
- Before the files write 1–3 short sentences in the user's language about what you built or changed. Do not add other code blocks.`;

const MAX_MESSAGES = 30;
const MAX_FILE_CHARS = 1_500_000;
const MAX_PROJECT_CHARS = 400_000;
const FALLBACK_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];

const errText = (e) => String(e?.message || e || "").slice(0, 400);
const isRateLimit = (e) => /429|RESOURCE_EXHAUSTED|quota/i.test(String(e?.status || "") + errText(e));
const isModelMissing = (e) => /404|NOT_FOUND|not found|not supported/i.test(String(e?.status || "") + errText(e));
const isBadConfig = (e) => /400|INVALID_ARGUMENT|thinking/i.test(String(e?.status || "") + errText(e));

// Start a stream; fall back to other models / plain config if needed. Returns { stream } or throws.
async function startStream(models, contents, config) {
  let lastErr;
  for (const model of models) {
    for (const cfg of [{ ...config, thinkingConfig: { thinkingLevel: "low" } }, config]) {
      try {
        return await gemini().models.generateContentStream({ model, contents, config: cfg });
      } catch (e) {
        lastErr = e;
        console.error("gemini", model, errText(e));
        if (isRateLimit(e)) throw e;
        if (isModelMissing(e)) break; // try next model
        if (!isBadConfig(e)) throw e; // unknown error: stop
      }
    }
  }
  throw lastErr;
}

export async function POST(req) {
  try {
    const user = await getUser(req);
    if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "bad_request" }, { status: 400 });
    }

    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .slice(-MAX_MESSAGES);
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
      if (last && project.length) {
        const files = project.map(([k, v]) => `\`\`\`file:${k}\n${v}\n\`\`\``).join("\n\n");
        text = `Current project files:\n\n${files}\n\nRequest: ${text}`;
      }
      return { role: m.role === "assistant" ? "model" : "user", parts: [{ text }] };
    });

    const preferred = usage.pro
      ? serverEnv("GEMINI_MODEL_PRO") || serverEnv("GEMINI_MODEL")
      : serverEnv("GEMINI_MODEL");
    const models = [...new Set([preferred, ...FALLBACK_MODELS].filter(Boolean))];
    const config = {
      systemInstruction: SYSTEM_PROMPT(lang) + (file ? FILE_PROMPT : "") + (build ? BUILD_PROMPT : ""),
      maxOutputTokens: file || build ? 32768 : 8192,
    };

    // Start the AI before answering, so a failure becomes a clear error (and is not counted).
    let stream;
    try {
      stream = await startStream(models, contents, config);
    } catch (e) {
      if (isRateLimit(e)) return Response.json({ error: "busy" }, { status: 503 });
      return Response.json({ error: "ai", detail: errText(e) }, { status: 502 });
    }

    const { error: upErr } = await adminDb()
      .from("profiles")
      .update({ used: usage.used + 1, period_key: usage.periodKey, total_count: (profile.total_count || 0) + 1 })
      .eq("id", user.id);
    if (upErr) console.error("usage update", upErr.message);

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
          }
        } catch (e) {
          console.error(e);
          controller.enqueue(encoder.encode(isRateLimit(e) ? "\n\n⚠️ busy" : "\n\n⚠️ error"));
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
