import { serverEnv } from "../../../lib/env";
import { getUser, getProfile, usageOf, getSettings, blockedResponse, chargeUsage } from "../../../lib/server";
import { SAFETY_RULES, GEMINI_SAFETY, GEMINI_SAFETY_RELAXED, REFUSAL, isSafetyStop } from "../../../lib/safety";
import { gemini, keyCount } from "../../../lib/gemini";

import { allow, tooMany } from "../../../lib/ratelimit";
import { waitUntil } from "@vercel/functions";
import { saveJob, validJobId } from "../../../lib/jobs";
import { waitTurn, doneTurn, priorityScore } from "../../../lib/queue";
import { randomUUID } from "crypto";
import { sendPush } from "../../../lib/push";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Big projects take more than a minute to write: allow up to 5 minutes (the answer keeps streaming the whole time).
export const maxDuration = 300;
// Run next to the database (Supabase is in Frankfurt) so each step is faster.
export const preferredRegion = "fra1";


const LANG_NAME = { ckb: "Kurdish Sorani (Arabic script)", ar: "Arabic", en: "English" };

const SYSTEM_PROMPT = (lang) => `You are "AHM AI", a brilliant, warm and honest assistant made by the AHM team.

LANGUAGE
- Reply in the language of the user's latest message: Kurdish Sorani (always Arabic script), Arabic, or English.
- Many users write Kurdish quickly in Latin letters, phonetically, with typos and no spaces or punctuation (e.g. "slaw chony" = سڵاو چۆنی، "esa chbkm" = ئێستا چی بکەم، "tynagashtm" = تێنەگەیشتم). Work out what they MEAN from the words and the conversation, and answer that. Never comment on their spelling.
- Always reply in clean, correct Kurdish Sorani in Arabic script (ڕ ڵ ێ ۆ ە used correctly), with clear short sentences and no spelling mistakes — even when the user wrote in Latin letters or made mistakes.
- If a message can mean two different things, choose the most likely meaning and start with one short line saying what you understood (e.g. «تێگەیشتم کە دەتەوێت …»).
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

VOICE
- If the user sends a voice message (audio), listen carefully, understand it in whatever language it is spoken (Kurdish Sorani, Arabic or English, including local dialects like Badini, Hawleri, Slemani), and reply in that same language.
- When you write down what the user said, write it as clean, correctly spelled text that keeps their exact meaning (fix false starts like "um" and repeated words).

PREDICTIONS
- You cannot see the future. For predictions (sports, prices, exchange rates, markets, elections) give a careful, reasoned analysis: the main factors, the most likely outcome, rough probabilities, and clearly say it can be wrong. Never present a guess as certain. Do not give personal financial or betting advice.

NOT AVAILABLE IN AHM AI
- AHM AI does not create general pictures, logos, posters or illustrations in this chat. If someone asks, say kindly in one sentence that this is not available, then offer a useful alternative: describe the idea in words, or build it as a simple web page (HTML/CSS) in the "Websites & apps" section.
- Presentations: the "🎞️ Presentations (PowerPoint)" tool on the start screen turns a topic or an uploaded PowerPoint / PDF / Word file into a designed, editable PowerPoint and a PDF. If someone wants slides or a presentation file, tell them to open it there (you can still help write the content here).
- Construction & Design Studio (start screen → "Construction & design"): redesigns a photo of a real room, house or garden (interior, exterior, 10 styles incl. Kurdish), lets the user place real 3D furniture into their room photo and make a 360° view, and "🏡 House design from your plan" turns a floor plan into pictures of the outside and every room. If someone wants design pictures of their room or house, tell them to open it there.
- Users CAN send PDF files with the 📎 button: read them fully and help (summarise, explain, translate, answer questions about them).

PHOTOS
- Users CAN send photos from their gallery or camera. Look at them carefully and help: describe them, read and translate any text in them, solve homework or maths step by step, explain errors in screenshots, identify things, give advice.
- In the code workspace, a photo of a design or screenshot means: recreate that design as working code, as closely as possible.
- Photos follow the STRICT CONTENT RULES too: if a photo contains nudity or sexual content, do not describe it; refuse in one kind sentence.

IDENTITY
- Your name is AHM AI. If asked which company or model is behind you, say you are AHM AI, developed by the AHM team, and that you cannot share technical details about the underlying technology. Never claim to be human.

${SAFETY_RULES}`;

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
- Files shown as "[image file — keep as is …]" are real images the user uploaded: use them by their path (e.g. <img src="images/logo.png">), never output or rewrite them.

UPLOADED PROJECTS (the user brought a ZIP)
- When the request says a ZIP was uploaded: first understand the whole project. If the structure is messy (files in odd places, missing index.html for a website, missing README.md, broken links between files), fix it with file blocks.
- Then explain in the user's language, short and clear: what the project is, what already works, what is missing or broken, and give 3 numbered next steps you can do for them. Ask which one to start with.

SPEED
- Write compact, clean code: no long comment blocks, no repeated code, short README. Start writing files straight away.

COMPLETE, NOT A DEMO (very important)
- Build EVERYTHING in the agreed plan: every page / screen / section listed must exist as a real file with real content and working code. Every link, menu item and button must work. No "coming soon", no empty pages, no lorem ipsum, no fake buttons.
- Use a clean folder structure (css/, js/, assets/ …) and keep files consistent with each other (same class names, same data keys, every linked file exists).
- If the project is too big for one answer, build the core fully working first, list what is left in the summary, and continue when the user asks.

WHAT TO BUILD
- Any language or stack the user asks for: websites (HTML/CSS/JS), Python, Node.js, PHP, Java, C#, Flutter, React, etc.
- If the user does not name a stack and wants a website or app, use plain HTML + CSS + JavaScript. This runs instantly in the live phone and computer preview.
- ALWAYS SPLIT THE PROJECT INTO SEPARATE FILES — never put the whole project inside index.html. Minimum: index.html, css/style.css, js/app.js and README.md, plus one file per extra page, screen or module. Link them with relative paths (href="css/style.css", src="js/app.js").
- JavaScript: use normal <script src="js/…"> files loaded in order (no ES modules / import-export unless the user asks for a framework); share code through window or global functions. This runs everywhere, also in the iPhone preview.
- Moving between pages: use normal links (<a href="about.html">) or in-page #hash routes. Never use location.href / window.location / window.open for the project's own pages (the live preview supports links and #hash only).
- RESPONSIVE FOR PHONE AND COMPUTER: the user previews every site on iPhone, Android AND a 1280px computer screen. Build a real desktop layout at ≥1024px — not a stretched phone column: e.g. a fixed sidebar or top navigation, multi-column grids, cards side by side, dashboards with stat cards, charts and tables, wider containers (max-width 1200–1400px). On phones the same page collapses to one column with a hamburger/bottom navigation. Use CSS grid/flex and @media (min-width: 768px / 1024px) queries.
- NAVIGATION THAT ALWAYS WORKS: move between pages only with normal links (<a href="patients.html">) to pages you actually create, or show/hide sections of one page (data-page buttons, #hash). Every page a link points to MUST exist in the files. Never redirect with location.href / window.location for normal navigation; every <form> handler calls e.preventDefault(). A login/logout may use a link or show/hide — never an endless redirect.
- EVERY PHONE: it must look right on every iPhone (from the small iPhone 5 / SE at 320px wide up to the Pro Max at 440px) and every Android phone (360–412px, foldables, tablets): no sideways scrolling, nothing cut off, text and buttons sized with clamp()/rem, images max-width:100%, use env(safe-area-inset-*) padding so the notch / Dynamic Island / home bar never cover content, and use 100dvh instead of 100vh.
- Mobile-first, beautiful, professional design: clear colour palette, good spacing, readable fonts (Google Fonts allowed), smooth touch targets. Use dir="rtl" for Kurdish or Arabic content. Fully working, not a mock-up; use localStorage when useful.
- Libraries for web pages only from https://cdnjs.cloudflare.com or https://cdn.jsdelivr.net.
- ALWAYS create or update README.md written in the user's language with: what the project does, the file structure, and numbered beginner steps to run it on a Windows or Mac computer after downloading the ZIP (which program to install, which folder to open, which command to type, what they should see). For plain HTML projects, explain that double-clicking index.html opens it, and how to put it online for free.

ANSWER SHAPE
- First write 1–4 short sentences in the user's language: what you built or changed, and the next step.
- Then the file blocks.
- At the very end add ONE block with the info string "suggest" holding exactly 3 lines, each starting with "- ": short, concrete next improvements the user could ask for (in the user's language, e.g. "- بەشی پەیوەندی بە فۆڕمی ناردن زیاد بکە"). No other code blocks.`;

// What kind of project the user chose in the builder.
const KIND_PROMPT = {
  website: `
PROJECT TYPE: WEBSITE — a public website (landing / business / portfolio / shop pages): beautiful hero, sections, navigation, gallery, contact, footer; fast and SEO-friendly (title, meta description); plain HTML + CSS + JS unless the user asked for another stack.
FILES: index.html + one .html file for every page in the plan (e.g. about.html, services.html, contact.html), the same header/footer on every page, css/style.css, js/main.js, assets/ for SVG logos and icons drawn in code, README.md.`,
  app: `
PROJECT TYPE: APP — it must look and feel like a real phone app: app bar on top, bottom tab navigation (3–5 tabs), screens that switch without page reloads, big touch targets, smooth transitions, data saved in localStorage, works offline as an installable web app (add manifest.json with name, colours and icons, and a small service worker). On a computer show it centred like a phone or as a responsive layout.
FILES: index.html (the app shell), css/app.css, js/app.js (router: screens switch with #hash), js/screens/<name>.js — one file per screen, js/storage.js (all saving), manifest.json, sw.js, icons/icon.svg, README.md.`,
  system: `
PROJECT TYPE: SYSTEM — a management system / dashboard (e.g. shop, school, clinic, stock, accounting): a login screen (demo user shown on screen), a sidebar menu, a dashboard with stat cards and a chart, data tables with search, add / edit / delete forms, simple user roles (admin / staff) and printable reports. Save all data in localStorage (one clear data layer in js/data.js so it can be moved to a real database later). Explain in README.md how to connect a real database later.
FILES: index.html (login + app shell, pages switch with #hash routes), css/style.css, js/data.js (all data + saving), js/auth.js (login, roles), js/app.js (router, sidebar), js/pages/<module>.js — one file per module in the plan (e.g. products.js, sales.js, reports.js, users.js), README.md.`,
};

const PLAN_PROMPT = (kind) => `
PLANNING STEP (do not build yet)
The user wants a ${kind === "app" ? "phone app" : kind === "system" ? "management system / dashboard" : "website"}. Do NOT write any files and do not use file blocks now.
Reply in the user's language with a clear, friendly plan they can approve:
## 🎯 a 1–2 sentence summary of what will be built
## 📄 the ${kind === "app" ? "screens" : "pages"} — each with a short list of what is on it
## ⚙️ the main features
## 🎨 the design: colours, style, fonts${kind === "system" ? "\n## 👥 the users / roles and what data is saved" : ""}
Keep it short and easy to scan (max ~220 words). Fill in smart defaults for anything the user did not say.
End with one line telling them to tap "✅ Build it" or write what to change.
Then add ONE block with the info string "suggest" holding exactly 3 lines starting with "- ": extra features that would make it better (in the user's language).`;

const CONSTRUCT_PROMPT = `

CONSTRUCTION STUDIO MODE (you are now an experienced architect + civil engineer + quantity surveyor who knows building in Kurdistan and Iraq)
Help with: house and building design ideas (exterior and interior), preliminary room layouts, construction terms, and preliminary material and cost estimates.
- Ask for missing key facts briefly when needed (land size, floors, rooms, budget, city), but if the user gave enough, answer directly.
- DESIGN IDEAS: give 2–3 clear concepts (style, layout idea, facade materials and colours, light and ventilation, climate tips for hot summers / cold winters). Use headings and short bullets.
- ROOM LAYOUTS: describe the layout with a room table (room, size in m, area m²), then draw a simple top-view floor-plan sketch as ONE fenced code block with the language "svg":
  \`\`\`svg
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H"> … </svg>
  \`\`\`
  Rules for the sketch: scale 1 m = 40 units; white background; outer walls thick dark lines (stroke-width 6), inner walls stroke-width 3; each room a rectangle with its name (in the user's language, direction="rtl" for Kurdish/Arabic, font-family "'Noto Kufi Arabic','Vazirmatn',sans-serif") and its size (e.g. "4×5 m") in the centre; show the main door as a gap with an arc, and a north arrow and a scale bar. Make sure everything fits inside the viewBox. No <script>, <image> or links.
- COST & MATERIALS: always show a table of quantities (concrete m³, cement bags, sand m³, gravel m³, steel tons, blocks/bricks count, plaster, tiles…) with the rule of thumb used for each line, then a cost table using the user's local prices. If the user gave no prices, use clearly labelled example price ranges and say they must be checked locally. Show the total range and cost per m².
- TERMS: explain in simple words, with the English term in brackets.
- ALWAYS end with one short line in the user's language: this is a preliminary estimate/idea only — not a certified plan, structural calculation or permit; a licensed engineer must review before building.`;

const MAX_MESSAGES = 30;
const MAX_FILE_CHARS = 1_500_000;
const MAX_PROJECT_CHARS = 600_000;
const MAX_ATTACH_CHARS = 4_200_000; // Vercel accepts ~4.5 MB per request
const FALLBACK_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];
const ATTACH_TYPES = /^(audio\/(webm|mp4|mpeg|ogg|wav|aac|x-m4a|m4a)|image\/(jpeg|png|webp)|application\/pdf)$/; // voice messages, photos and PDFs

const errText = (e) => String(e?.message || e || "").slice(0, 400);
const errCode = (e) => String(e?.status || e?.code || "") + " " + errText(e);
const isRateLimit = (e) => /429|RESOURCE_EXHAUSTED|quota/i.test(errCode(e));
const isModelMissing = (e) => /404|NOT_FOUND|not found|not supported/i.test(errCode(e));
const isBadConfig = (e) => /400|INVALID_ARGUMENT|thinking|tool/i.test(errCode(e));
const isTransient = (e) => /500|502|503|504|UNAVAILABLE|INTERNAL|overloaded|timeout|timed out|ECONNRESET|fetch failed|socket|network/i.test(errCode(e));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Remember which "thinking" setting each model accepts, so later questions skip failed tries.
// Deeper thinking = smarter answers. Code projects think the most, voice the least (it must be fast).
const THINKING = [{ thinkingLevel: "medium" }, { thinkingLevel: "low" }, { thinkingLevel: "minimal" }, null];
// Building starts with "low" thinking: the medium level made people wait a long time before the first word.
const START = { build: 1, file: 0, construct: 1, chat: 1, voice: 2 };
const thinkingOk = new Map();
const searchOff = new Set(); // models where Google search is not allowed

/*
  Streams the answer as text pieces. Tries hard before giving up:
  - busy / quota  → next model (each model has its own free quota)
  - temporary error → wait a moment and try the same model again (2×), then the next model
  - unsupported setting → simpler setting
  - an error before any text was sent → start again quietly
*/
async function* answer(models, contents, baseConfig, useSearch, refusal = REFUSAL.ckb, start = 1) {
  let lastErr = null;
  let sentAny = false;
  // Google's filter often stops normal Kurdish answers by mistake. The first time, start again quietly
  // with the next model and a softer filter ("\u0000RESET" tells the app to clear what it showed).
  let safetyRetry = false;
  const refuseOrRetry = function* () {
    if (safetyRetry) { yield (sentAny ? "\n\n" : "") + refusal; return true; }
    safetyRetry = true;
    if (sentAny) yield "\u0000RESET\n";
    sentAny = false;
    return false;
  };
  for (const model of models) {
    let level = Math.max(start, thinkingOk.get(model + ":" + start) ?? start);
    let search = useSearch && !searchOff.has(model);
    let transientTries = 0;
    let keyTries = 0;
    while (level < THINKING.length) {
      const config = { ...baseConfig, ...(safetyRetry ? { safetySettings: GEMINI_SAFETY_RELAXED } : {}) };
      if (THINKING[level]) config.thinkingConfig = THINKING[level];
      if (search) config.tools = [{ googleSearch: {} }];
      try {
        const t0 = Date.now();
        const stream = await gemini().models.generateContentStream({ model, contents, config });
        thinkingOk.set(model + ":" + start, level);
        const sources = new Map();
        let stopped = false;
        for await (const chunk of stream) {
          if (isSafetyStop(chunk)) stopped = true;
          const text = chunk.text;
          if (text) { if (!sentAny) console.log("first words", model, level, Date.now() - t0, "ms"); sentAny = true; yield text; }
          const g = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          for (const c of g) if (c.web?.uri) sources.set(c.web.uri, c.web.title || c.web.uri);
        }
        if (sentAny && sources.size) {
          yield "\n\n---\n" + [...sources].slice(0, 6).map(([u, t], i) => `${i + 1}. [${t.replace(/[\[\]]/g, "")}](${u})`).join("\n");
        }
        if (stopped) { if (yield* refuseOrRetry()) return; break; } // blocked by the content filter: try once more
        if (sentAny) return;
        lastErr = new Error("empty answer");
        break; // empty: try the next model
      } catch (e) {
        lastErr = e;
        console.error("gemini", model, level, errText(e));
        if (/SAFETY|PROHIBITED_CONTENT|BLOCKLIST/i.test(errText(e))) { if (yield* refuseOrRetry()) return; break; }
        if (sentAny) { yield isRateLimit(e) ? "\n\n\u0000ERR:busy" : "\n\n\u0000ERR:ai"; return; }
        if (search && (isBadConfig(e) || isRateLimit(e))) { search = false; searchOff.add(model); continue; }
        if (isRateLimit(e) && keyTries < keyCount() - 1) { keyTries++; continue; } // same model, another key
        if (isRateLimit(e) || isModelMissing(e)) break;
        if (isTransient(e) && transientTries < 2) { transientTries++; await sleep(700 * transientTries); continue; }
        if (isBadConfig(e)) { level++; continue; }
        break;
      }
    }
  }
  if (safetyRetry && !sentAny) { yield refusal; return; }
  yield isRateLimit(lastErr) ? "\u0000ERR:busy" : "\u0000ERR:ai";
}

export async function POST(req) {
  try {
    const [user, body] = await Promise.all([getUser(req), req.json().catch(() => null)]);
    if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
    if (!(await allow("chat:" + user.id, 20, 60000))) return tooMany();
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
    const buildKind = ["website", "app", "system"].includes(body.buildKind) ? body.buildKind : "website";
    const planOnly = build && body.planOnly === true;
    const construct = body.mode === "construct";
    const file = !build && body.file && typeof body.file.content === "string" ? body.file : null;
    const project =
      build && body.project && typeof body.project === "object"
        ? Object.entries(body.project).filter(([k, v]) => typeof k === "string" && typeof v === "string")
            // images from an uploaded ZIP stay in the app; the AI only sees that they exist
            .map(([k, v]) => (v.startsWith("data:") ? [k, `[image file — keep as is, refer to it by its path "${k}"]`] : [k, v]))
        : [];

    let total = 0;
    const attachments = (Array.isArray(body.images) ? body.images : [])
      .filter((a) => a && ATTACH_TYPES.test(a.mimeType) && typeof a.data === "string")
      .filter((a) => (total += a.data.length) < MAX_ATTACH_CHARS)
      .slice(0, 6);

    // ---- usage limits ----
    const profile = await getProfile(user);
    const usage = usageOf(profile, await getSettings());
    if (file && !usage.pro) return Response.json({ error: "pro_only" }, { status: 403 });
    if (file && file.content.length > MAX_FILE_CHARS) return Response.json({ error: "file_too_big" }, { status: 413 });
    if (project.reduce((n, [, v]) => n + v.length, 0) > MAX_PROJECT_CHARS) return Response.json({ error: "file_too_big" }, { status: 413 });
    const blocked = await blockedResponse(profile, usage);
    if (blocked) return blocked;

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

    // Like Claude's plans: Pro (and the owner) get the smartest model; free users get the fast, light model
    // (it has its own free quota, so more people can be answered at the same time). Change in Vercel:
    // GEMINI_MODEL_PRO, GEMINI_MODEL (Pro fallback), GEMINI_MODEL_FREE.
    const proUser = usage.pro || usage.unlimited;
    // The big "pro" model is slow to start, so it is used only where depth matters most (code projects, files).
    // Everyday chat, construction and voice use the fast model, so the answer starts in a few seconds.
    // Only fixing an uploaded file uses the slow big model. Building uses the fast model (it writes code well and
    // starts in a few seconds instead of a long wait).
    const deep = !!file;
    const preferred = proUser
      ? (deep ? [serverEnv("GEMINI_MODEL_PRO"), serverEnv("GEMINI_MODEL")] : [serverEnv("GEMINI_MODEL_FAST") || "gemini-3.8-flash"])
      : [serverEnv("GEMINI_MODEL_FREE") || "gemini-3.5-flash-lite"];
    const models = [...new Set([...preferred, ...(proUser ? FALLBACK_MODELS : [...FALLBACK_MODELS].reverse())].filter(Boolean))];
    const TUTOR_LANG = { ckb: "Kurdish Sorani (Arabic script)", ar: "Arabic", en: "English" };
    const tutor = body.tutor && TUTOR_LANG[body.tutor.target] ? body.tutor : null;
    const TUTOR_PROMPT = tutor ? `

LANGUAGE TEACHER MODE (this overrides the LANGUAGE rules above)
- You are a warm, patient ${TUTOR_LANG[tutor.target]} conversation teacher. The learner's level is ${String(tutor.level).slice(0, 3)} (CEFR) and their own language is ${LANG_NAME[lang] || LANG_NAME.ckb}.
- Reply mainly in ${TUTOR_LANG[tutor.target]}, using words and grammar that fit their level. Keep each reply short: 2–5 sentences, then ask ONE simple question to keep the conversation going.
- If the learner's last message has mistakes, add a short section starting with "✏️" in their own language: show the corrected sentence and explain the mistake in one line. If there were no mistakes, praise them briefly.
- For beginners (A0/A1) add the meaning in their own language in brackets after difficult sentences.
- If they ask for help or a translation, give it, then continue the conversation.` : "";
    const NOTE_PROMPT = body.voiceNote && !body.voice ? `

VOICE MESSAGE
- The user's latest message is a voice recording. Start your reply with ONE line exactly like this: ⟦what the user said, written word for word in the language they spoke⟧ (Kurdish always in Arabic script). Nothing else on that line.
- Then, on the next line, answer them normally in that same language (Markdown is fine).` : "";
    const VOICE_PROMPT = body.voice ? `

VOICE CONVERSATION MODE (most important rules)
- The user is TALKING to you and will only HEAR your answer (they may not be able to read).
- First line: exactly ⟦what the user said, transcribed word for word in the language they spoke⟧ — nothing else on that line.
- Then your spoken reply: natural, warm, conversational, short (1–4 sentences, longer only if they asked for an explanation). No Markdown, no lists, no symbols, no emojis, no links, no code — only words that sound good when read aloud. Write numbers so they can be spoken.
- Reply in the language the user spoke${tutor ? ", except in language teacher mode: speak mainly in the language being learned, keep it simple for their level, and give corrections in one short spoken sentence (\"Good! You can also say: ...\")" : ""}.` : "";
    const baseConfig = {
      systemInstruction: SYSTEM_PROMPT(lang) + (file ? FILE_PROMPT : "") + (build ? (planOnly ? KIND_PROMPT[buildKind] + PLAN_PROMPT(buildKind) : BUILD_PROMPT + KIND_PROMPT[buildKind]) : "") + (construct ? CONSTRUCT_PROMPT : "") + TUTOR_PROMPT + NOTE_PROMPT + VOICE_PROMPT,
      maxOutputTokens: (file || build) && !planOnly ? 32768 : 8192,
      safetySettings: GEMINI_SAFETY,
    };
    // Web search costs money on Google's side: switch it on in Vercel with ENABLE_SEARCH=1 (Pro users only).
    // The plan step looks things up on Google (free daily amount on the free AI key); it switches off by itself if not allowed.
    const useSearch = (!build && usage.pro && serverEnv("ENABLE_SEARCH") === "1") || (planOnly && serverEnv("PLAN_SEARCH") !== "0");

    const encoder = new TextEncoder();
    let counted = false;
    const countUsage = async () => {
      if (counted) return;
      counted = true;
      await chargeUsage(profile, usage);
    };

    // The answer keeps being made even if the phone disconnects (user left the app);
    // the full text is saved as a "job" so the app can show it when the user comes back.
    const jobId = validJobId(body.jobId);
    const lastText = String(messages[messages.length - 1].content || "");
    const kind = body.voice ? "voice" : build && !planOnly ? "build" : file ? "file" : construct ? "construct" : "chat";
    // Short everyday questions think the least, so the first words appear fast.
    const startLevel = kind === "chat" && lastText.length < 300 && !attachments.length ? 2 : START[kind];
    let ctrl = null;
    let open = true;
    let left = false; // the user left the app before the answer was finished → send a notification
    const send = (txt) => { if (!open || !ctrl) return; try { ctrl.enqueue(encoder.encode(txt)); } catch { open = false; left = true; } };
    const work = (async () => {
      let full = "";
      // Saved in the background (don't make the user wait for the database).
      const started = jobId ? saveJob(user.id, jobId, "running") : null;
      // Wait in the fair line (Pro first). The app shows "you are number N".
      const ticket = jobId || randomUUID();
      await waitTurn(ticket, priorityScore({ pro: usage.pro || usage.unlimited, voice: !!body.voice, short: !build && !file && lastText.length < 300 }),
        { onPlace: (n) => send(`\u0000Q:${n}\n`) });
      try {
        for await (const piece of answer(models, contents, baseConfig, useSearch, REFUSAL[lang], startLevel)) {
          if (!piece.includes("\u0000ERR:")) countUsage(); // only count questions that got an answer
          full += piece;
          send(piece);
        }
      } catch (e) {
        console.error(e);
        full += "\u0000ERR:ai";
        send("\u0000ERR:ai");
      } finally {
        doneTurn(ticket);
        if (open && ctrl) { try { ctrl.close(); } catch {} }
        open = false;
      }
      if (started) await started;
      if (jobId) await saveJob(user.id, jobId, "done", full);
      if (left) {
        const done = { ckb: ["✅ AHM AI — تەواو بوو", build ? "پرۆژەکەت ئامادەیە. بۆ بینین دایبگرە." : "وەڵامەکەت ئامادەیە. بۆ بینین دایبگرە."],
          ar: ["✅ AHM AI — انتهى", build ? "مشروعك جاهز. اضغط لعرضه." : "ردّك جاهز. اضغط لعرضه."],
          en: ["✅ AHM AI — done", build ? "Your project is ready. Tap to see it." : "Your answer is ready. Tap to see it."] }[lang];
        await sendPush(user.id, { title: done[0], body: done[1], url: "/", tag: jobId || "ahm" });
      }
    })();
    waitUntil(work);
    const readable = new ReadableStream({
      start(controller) { ctrl = controller; },
      cancel() { open = false; left = true; }, // the phone left: keep working, stop sending
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" },
    });
  } catch (e) {
    console.error("chat route", e);
    return Response.json({ error: "server", detail: errText(e) }, { status: 500 });
  }
}
