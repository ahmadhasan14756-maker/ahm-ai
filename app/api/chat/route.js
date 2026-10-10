import { GoogleGenAI } from "@google/genai";
import { adminDb, getUser, getProfile, usageOf, today } from "../../../lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `You are "AHM AI", a smart assistant built by the AHM team.
- Always reply in the user's language: Kurdish Sorani (Arabic script), Arabic, or English. If the user writes Kurdish in Latin letters, reply in Kurdish Sorani with Arabic script.
- You are excellent at answering questions, writing code, and finding and fixing bugs. Be clear, correct and helpful.
- Put code in fenced code blocks with a language tag (e.g. \`\`\`python).
- Your name is AHM AI. If asked which company or model is behind you, say you are AHM AI, developed by the AHM team, and that you cannot share technical details about the underlying technology. Never claim to be a human.
- You cannot see the future. For predictions (sports, prices, markets) give a reasoned analysis and clearly say it may be wrong.`;

const FILE_PROMPT = `
The user attached a file. Read it fully. Explain the problems you find in the user's language.
Then give EVERY change as an edit block in exactly this format (inside a \`\`\`text code block):

<<<<<<< SEARCH
exact lines copied from the original file
=======
the fixed lines
>>>>>>> REPLACE

Rules: the SEARCH part must match the original file exactly (same spaces), include enough lines to be unique, keep each block small. Never rewrite the whole file.`;

const MAX_MESSAGES = 30;
const MAX_FILE_CHARS = 1_500_000;

export async function POST(req) {
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

  const file = body.file && typeof body.file.content === "string" ? body.file : null;

  // ---- usage limits ----
  const profile = await getProfile(user);
  const usage = usageOf(profile);
  if (file && !usage.pro) return Response.json({ error: "pro_only" }, { status: 403 });
  if (file && file.content.length > MAX_FILE_CHARS) return Response.json({ error: "file_too_big" }, { status: 413 });
  if (usage.used >= usage.limit) return Response.json({ error: "limit", ...usage }, { status: 429 });

  await adminDb()
    .from("profiles")
    .update({ daily_count: usage.used + 1, daily_date: today(), total_count: (profile.total_count || 0) + 1 })
    .eq("id", user.id);

  // ---- build the conversation for Gemini ----
  const contents = messages.map((m, i) => {
    let text = m.content.slice(0, 30000);
    if (file && i === messages.length - 1) {
      text = `File name: ${String(file.name || "file").slice(0, 200)}\n\`\`\`\n${file.content}\n\`\`\`\n\n${text}`;
    }
    return { role: m.role === "assistant" ? "model" : "user", parts: [{ text }] };
  });

  const model = usage.pro
    ? process.env.GEMINI_MODEL_PRO || process.env.GEMINI_MODEL || "gemini-3.8-flash"
    : process.env.GEMINI_MODEL || "gemini-3.8-flash";

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = await ai.models.generateContentStream({
          model,
          contents,
          config: {
            systemInstruction: SYSTEM_PROMPT + (file ? FILE_PROMPT : ""),
            maxOutputTokens: file ? 16384 : 8192,
          },
        });
        for await (const chunk of stream) {
          if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
        }
      } catch (e) {
        console.error(e);
        const busy = String(e?.status || e?.message || "").includes("429");
        controller.enqueue(
          encoder.encode(
            busy
              ? "\n\n⚠️ ئێستا داواکاری زۆرە. تکایە چەند خولەکێکی تر هەوڵ بدەرەوە."
              : "\n\n⚠️ هەڵەیەک ڕوویدا، تکایە دووبارە هەوڵ بدەرەوە."
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
