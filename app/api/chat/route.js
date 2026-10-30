import { serverEnv } from "../../../lib/env";
import { getUser, getProfile, usageOf, getSettings, blockedResponse, chargeUsage } from "../../../lib/server";
import { SAFETY_RULES, GEMINI_SAFETY, GEMINI_SAFETY_RELAXED, REFUSAL, isSafetyStop } from "../../../lib/safety";
import { gemini, keyCount, jsonCall, isKeyError, markBadKey } from "../../../lib/gemini";
import { OFFICE_WORDS, officeTurn, lastFile, stripFiles } from "../../../lib/officeServer";

import { allow, tooMany } from "../../../lib/ratelimit";
import { waitUntil } from "@vercel/functions";
import { saveJob, readJob, validJobId } from "../../../lib/jobs";
import { notifyOwner, escHtml } from "../../../lib/telegram";
import { matchBlueprints, blueprintText } from "../../../lib/blueprints";
import { waitTurn, doneTurn, priorityScore } from "../../../lib/queue";
import { redis, hasRedis } from "../../../lib/redis";
import { randomUUID, createHmac, timingSafeEqual } from "crypto";
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
- When the reply is in Kurdish, always write clean, correct Kurdish Sorani in Arabic script — even when the user wrote in Latin letters or made mistakes.
- CLEAR, BEAUTIFUL LANGUAGE that everyone understands:
  • Kurdish: the standard written Central Kurdish (Sorani) of Sulaymaniyah and Erbil; correct letters (ک not ك, ی not ي, ە for the vowel and ه for the consonant, ڕ ڵ ێ ۆ); Kurdish punctuation (، ؛ ؟); a common Kurdish word instead of an Arabic, Persian or English one whenever one exists (e.g. «بەکارهێنەر» not «مستخدم», «ئامێر» not «جهاز»); short sentences with a natural Kurdish word order — never word-by-word translation; no Arabic vowel marks (َ ِ ُ); Kurdish digits ٠١٢٣٤٥٦٧٨٩ (never Persian ۰۱۲۳); re-read every word once for spelling before you finish.
  • Arabic: clear, simple Modern Standard Arabic (not a dialect unless the user writes in one), correct hamza and ة/ه, short sentences.
  • English: plain, friendly everyday English.
- If a message can mean two different things, choose the most likely meaning and start with one short line saying what you understood (e.g. «تێگەیشتم کە دەتەوێت …»).
- If the language is unclear, use ${LANG_NAME[lang] || LANG_NAME.ckb}.
- Write natural, fluent, correct Kurdish Sorani — not word-by-word translation.

HOW TO ANSWER (clear answers everyone understands)
- FIRST LINE = THE ANSWER. Begin with one short sentence that answers the question directly (in **bold** when it is a fact, number or yes/no). Then explain only as much as helps.
- ANSWER ONLY WHAT WAS ASKED. Do not add other topics, extra tips, history, warnings or "you may also like" unless the user asked or it is truly needed for safety. One question → one focused answer.
- SIMPLE WORDS: write like a good teacher explaining to a beginner: everyday words, short sentences (max ~20 words), one idea per sentence. Explain a needed technical term in a few simple words the first time.
- DON'T MIX LANGUAGES: write the whole answer in ONE language. In Kurdish or Arabic answers, put a needed English word only in brackets after the Kurdish/Arabic word, e.g. «بیرگە (RAM)». Never switch language in the middle of a sentence, and never let a stray English word (any, the, and, so…) slip into a Kurdish or Arabic sentence — re-read each sentence before you finish.
- LENGTH FITS THE QUESTION: a greeting or simple question → 1–3 sentences, no headings. A "how to" → short numbered steps (one action per step). A big topic → 2–4 short headings (##) with 2–4 bullet points each. Never long walls of text; paragraphs of max 3 sentences.
- CLEAN LAYOUT: use lists only for 3+ items; tables only to compare things; no decorative symbols or emojis everywhere (at most one small emoji per heading, none in short answers); never repeat the question back.
- END CLEANLY: no summary that repeats the answer, no "I hope this helps", and ask a follow-up question only if you really need information to help further.
- DO THE TASK: when the user asks you to do something (write, fix, design, improve, translate, calculate), do it completely and carefully right away — don't ask "which part?" or "what exactly?" when a smart person could make a good choice. Pick the best reasonable interpretation, do it, and at most mention your choice in one short line. Ask a question only when it is truly impossible to continue without the answer.
- Be precise: follow every detail the user gave (names, colours, numbers, language, order). Before you answer, check your work against the request once.
- Think step by step for maths, logic and technical problems, and double-check results before answering (show the steps briefly).
- If something is uncertain, say so honestly in one sentence. Never invent facts, numbers, sources or links.
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
- You cannot see the future. For predictions (sports, prices, exchange rates, markets, elections) give a careful, reasoned analysis: the main factors, the most likely outcome, rough probabilities, and clearly say it can be wrong. Never present a guess as certain. Do not give personal financial or betting advice (general money-saving and budgeting tips are fine).
- You have no live fixtures, scores, injuries or news unless search results are given to you. If the user didn't name the match (opponent, date), say so in one short line and ask, or predict for the opponent they most likely mean only if it is clearly known; never invent a fixture, injury or recent result.
- For a prediction with clear possible outcomes (a match, will a price go up or down, an election…), give a SHORT analysis (the 3–5 key factors) and then ONE block with the info string "predict" holding JSON: {"title":"…","outcomes":[{"label":"…","pct":45},…],"score":"2-1 (only for matches, else leave out)","confidence":"low|medium|high","factors":["short factor",…]} — outcomes add up to 100, labels in the user's language. The app shows it as a card with bars; don't repeat the percentages in the text.

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

ACT, DON'T ASK (very important)
- NEVER ask the user which file, page or part to change, and never ask them to name files. YOU decide which files must be created or changed, and you do all of them in this answer.
- Vague requests are normal — act on them: "make the design more beautiful / better / modern" → redesign the WHOLE project consistently (the shared CSS and every page or screen, layout, colours, fonts, spacing, cards, buttons, icons, animations) while keeping all content and features working. "Fix it" → find the bugs yourself and fix them. "Add X" → add it everywhere it belongs (menu links, pages, data, styles).
- If something is missing to finish the request (a page, a script, a style, data), create it without being asked.

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
- SCREENSHOT / DESIGN PICTURE → CODE: if the user sent a picture of a website, app or design (now or earlier in this chat), recreate it as faithfully as you can: the same layout and order of sections, the same colours (estimate exact hex values), fonts (closest Google Font), sizes, spacing, corner radius, shadows, icons and texts. Then make it responsive and fully working. Only change things the user asked to change.
- SELF-CHECK BEFORE YOU FINISH: go through every file you wrote and make sure every page a link goes to, every CSS/JS/JSON file a page or script loads, and every file the plan promised is in your answer (or already in the project). If one is missing, write it now — never leave a link or a <script src> pointing at a file that doesn't exist.
- NAVIGATION THAT ALWAYS WORKS: move between pages only with normal links (<a href="patients.html">) to pages you actually create, or show/hide sections of one page (data-page buttons, #hash). Every page a link points to MUST exist in the files. Never redirect with location.href / window.location for normal navigation; every <form> handler calls e.preventDefault(). A login/logout may use a link or show/hide — never an endless redirect.
- EVERY PHONE: it must look right on every iPhone (from the small iPhone 5 / SE at 320px wide up to the Pro Max at 440px) and every Android phone (360–412px, foldables, tablets): no sideways scrolling, nothing cut off, text and buttons sized with clamp()/rem, images max-width:100%, use env(safe-area-inset-*) padding so the notch / Dynamic Island / home bar never cover content, and use 100dvh instead of 100vh.
- PREMIUM DESIGN (it must look like a top 2026 product, not a template):
  • Design tokens first, in :root of the shared CSS: a harmonious palette (one strong brand colour + 1 accent + neutral greys, chosen for the topic), --radius (12–20px), a spacing scale, soft layered shadows, and both light and dark colours (prefers-color-scheme) unless the user chose one.
  • Typography: Kurdish/Arabic → "Vazirmatn" or "Noto Kufi Arabic" from Google Fonts; Latin → "Inter" or "Plus Jakarta Sans". Clear hierarchy: big bold headings (clamp()), comfortable body 16–17px, line-height 1.6–1.8.
  • Modern layout: generous white space, max-width containers, CSS grid, a striking hero (gradient / image / illustration in SVG), cards with soft shadow and hover lift, sticky glassy header (backdrop-filter), a polished footer.
  • Real icons: inline SVG icons (Lucide/Heroicons style, 1.75–2px strokes) — never emojis as icons in the UI.
  • Real photos, never emojis as pictures: every food, product, room, place or person card gets a real photo. Use https://loremflickr.com/800/600/<english-keywords>?lock=<1-999> (e.g. https://loremflickr.com/800/600/kebab,food?lock=12 — a different lock per card, keywords that match the item) or Unsplash photos you are sure exist (https://images.unsplash.com/photo-…?w=1200&q=80). Every <img>: alt text, loading="lazy", width/height or aspect-ratio, object-fit:cover, and onerror="this.style.visibility='hidden'" over a soft gradient background so a missing photo never looks broken.
  • Interactions: hover, focus-visible and active states on every button/link, smooth transitions (150–250ms), subtle entrance animations (respect prefers-reduced-motion), toasts for actions, skeleton/loading states, friendly empty states.
  • Forms and tables: labelled inputs with clear focus rings, inline validation messages, zebra/hover rows, search and filters, badges for status.
  • Real content in the user's language (no lorem ipsum): realistic names, prices, texts for the topic. Use dir="rtl" for Kurdish or Arabic.
  • Accessible: colour contrast ≥ 4.5:1, alt texts, buttons are <button>, keyboard usable.
- CLEAN CODE: small reusable functions, no duplicated code, clear names, no console errors, no unused files. Fully working, not a mock-up.
- Libraries for web pages only from https://cdnjs.cloudflare.com or https://cdn.jsdelivr.net.
- ALWAYS create or update README.md written in the user's language with: what the project does, the file structure, and numbered beginner steps to run it on a Windows or Mac computer after downloading the ZIP (which program to install, which folder to open, which command to type, what they should see). For plain HTML projects, explain that double-clicking index.html opens it, and how to put it online for free.

ANSWER SHAPE (short and clear — the app already shows every file as a card)
- First, in the user's language, at most 3 short lines, exactly this shape:
  ✅ one sentence: what you built or changed (in plain words, no technical terms)
  ▶️ one sentence: how to see or try it (e.g. "look at the preview on the left and press …")
  ⚠️ only if needed, one sentence: something the user must do or know
- No long explanations, no list of the files, no code outside file blocks, no technical words like "DOM", "event listener", "localStorage" in the text (say "saved on the phone" etc.).
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
PHONES: on screens under 900px the sidebar is hidden and opens from a ☰ button in a top bar (sliding over the page with a dark backdrop, closing after a choice); the page content always uses the full width. Tables scroll sideways inside their card or turn into stacked cards; forms are one column.
NEVER EMPTY: right after login the dashboard shows real content — stat cards, a chart and recent items from realistic sample data (seeded once into js/data.js storage on first run); every list shows a friendly empty state with an "add" button when it has no data. Each module renders inside the same main area; a module that fails shows a short error message there instead of a blank page.
FILES: index.html (login + app shell, pages switch with #hash routes), css/style.css, js/data.js (all data + saving), js/auth.js (login, roles), js/app.js (router, sidebar), js/pages/<module>.js — one file per module in the plan (e.g. products.js, sales.js, reports.js, users.js), README.md.`,
};

// ---- Building a new project ONE FILE AFTER ANOTHER (like a developer) ----
// 1) the AI lists the files, 2) each file is written in its own step with all earlier files in view,
// so big projects come out complete and consistent. The app shows "file 3 / 8 — js/app.js".
// If the 5-minute server limit gets close, a signed "continue" note is sent and the app continues by itself.
const FILELIST_PROMPT = (kind, lang) => `You are a senior developer planning the files of a ${kind === "app" ? "phone app" : kind === "system" ? "management system" : "website"} that the user agreed on in this conversation (the plan is in the conversation).
${KIND_PROMPT[kind]}
Return JSON only: {"intro": "1-2 short, simple, natural sentences in ${LANG_NAME[lang] || LANG_NAME.ckb} (everyday words, perfect spelling): what you are building now, file by file", "files": [{"path": "index.html", "about": "what this file contains, in English, max 25 words"}], "contract": "…"}
"contract" = the SHARED NAMES every file must use exactly (the files are written separately, so this is what keeps them working together), in English, max ~1500 characters:
- each global object and its functions with arguments and what they return, e.g. "window.Auth = { login(user, pass) → bool, logout(), isLoggedIn() → bool, currentUser() → {name, role} }", "window.Store = { all(col) → array, save(col, item), remove(col, id) }"
- localStorage keys and the shape of saved records, e.g. "products: [{id, name, price, stock, category}]"
- element ids / CSS classes several files rely on (e.g. "#app", ".card", ".btn-primary", ".sidebar")
- the <script> order on every page, shared files first and the page's own script last (e.g. "js/data.js → js/auth.js → js/ui.js → page script")
- the ROUTES (apps and systems): every #hash route name, the file that registers it and how, e.g. "#home dashboard.js, #add add-expense.js, #list expenses.js — each screen file does window.Screens['add'] = { title, render(root) }"; every menu / tab / nav button uses exactly these names
Rules: 4 to 18 files. Follow the FILES list of the project type above and the pages/screens/modules of the plan — every page/screen/module gets its own file. Order: files others depend on first (styles, data/storage, auth, router/app), then the pages / screens / modules, README.md last. Paths: forward slashes, no leading slash. Only text files (HTML, CSS, JS, JSON, MD, SVG) — no photos.`;
// A broad change to an existing project ("make the design more beautiful", "improve everything"): the AI first
// decides which files to change, then rewrites them one by one — the user never has to name files.
const BROAD_CHANGE = /(جوان|دیزاین|ستایل|ڕەنگ|هەموو|گشت|سەرلەنوێ|باشتر|نوێی بکەرەوە|مۆدێرن|تەواوی|تصميم|جميل|أجمل|كل |بالكامل|حدّث|طوّر|design|beautiful|prettier|redesign|modern|style|all |every|whole|improve|better|revamp|polish)/i;
const CHANGE_PROMPT = (lang) => `You are a senior developer. The user wants a change to their existing project (files below). Decide yourself EXACTLY which files must be changed or created to do it completely and well — the user will not name files.
Return JSON only: {"intro": "1-2 short friendly sentences in ${LANG_NAME[lang] || LANG_NAME.ckb}: what you WILL change now (future tense, e.g. «ئێستا … چاک دەکەم»; never say it is already done — the files are written after this)", "files": [{"path": "css/style.css", "about": "precisely what to change in this file, in English, max 35 words", "note": "the same change in 4-10 simple words in ${LANG_NAME[lang] || LANG_NAME.ckb}, for the user"}]}
Rules: list every file that needs work (shared CSS first, then shared scripts, then pages/screens), new files too; 1 to 15 files; never js/ahm-db.js; don't list files that need no change. For a fix ("this button does nothing", "X doesn't open") include every file involved (the screen, the router/app file, the HTML that loads the scripts).
If the user is only asking a question or chatting (no change to make), return "files": [].`;
const STEP_RULES = `
ONE-FILE STEP MODE (overrides "ANSWER SHAPE" above)
- You are writing the project ONE FILE AT A TIME. You get the full file list and every file already written.
- Write ONLY the file you are asked for, as exactly one \`\`\`file:PATH block with its COMPLETE content. No sentences before or after it.
- Keep it 100% consistent with the files already written, the file list and the SHARED CONTRACT: the same class names, ids, function names, global variables, data keys and links. Link only to files in the list.
- Shared code lives on window objects exactly as named in the contract (window.Auth, window.Store…); define each one once, in its own file, and never rename it.
- In every HTML page load the scripts in the contract's order: shared files first, the page's own script LAST.
- Write compact, clean code: short comments only where needed, no repeated blocks, no huge inline data (8–15 sample records are enough); aim for under ~350 lines per file.
- Every menu, tab and nav button must open its screen: use only the route names from the contract, and a screen file must register itself exactly as the contract says (a button that does nothing is a bug).
- Never call a function or read an id/key that is not in the contract or in the files already written. Start page code after DOMContentLoaded and check that a shared object exists before using it, so a page never goes blank.
- KURDISH TEXT in the app (when its language is Sorani): short, clear, everyday Sorani with correct spelling (ڕ ڵ ێ ۆ ە), a space between separate words, Kurdish digits only where the plan asks. Use these common words: Home سەرەکی · Dashboard داشبۆرد · Add زیادکردن · Save پاشەکەوتکردن · Cancel پاشگەزبوونەوە · Edit دەستکاری · Delete سڕینەوە · Search گەڕان · Filter فلتەر · Settings ڕێکخستنەکان · Reports ڕاپۆرتەکان · Total کۆی گشتی · Recent … دوایین … · See all هەمووی ببینە · Back گەڕانەوە · Login چوونەژوورەوە · Logout چوونەدەرەوە · Username ناوی بەکارهێنەر · Password وشەی نهێنی · Date بەروار · Amount بڕ · Price نرخ · Category جۆر · Notes تێبینی · Print چاپکردن · No data yet هێشتا هیچ زانیارییەک نییە · Saved ✓ پاشەکەوت کرا · Are you sure? دڵنیایت؟ · IQD د.ع.`;
const STEP_SECRET = () => serverEnv("PUSH_SECRET") || serverEnv("SUPABASE_SERVICE_ROLE_KEY") || "ahm-dev";
const signStep = (data) => { const b = Buffer.from(JSON.stringify(data)).toString("base64url"); return b + "." + createHmac("sha256", "ahm-step:" + STEP_SECRET()).update(b).digest("base64url"); };
function readStep(tok, uid) {
  try {
    const [b, sig] = String(tok || "").split(".");
    const want = createHmac("sha256", "ahm-step:" + STEP_SECRET()).update(b).digest("base64url");
    if (!sig || sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
    const d = JSON.parse(Buffer.from(b, "base64url").toString());
    return d.u === uid && d.e > Date.now() && Array.isArray(d.f) && d.f.length ? d : null;
  } catch { return null; }
}
const cleanList = (files) => (Array.isArray(files) ? files : [])
  .map((f) => ({ path: String(f?.path || "").trim().replace(/^\.?\/+/, "").replace(/\\/g, "/").slice(0, 120), about: String(f?.about || "").slice(0, 200), ...(f?.note ? { note: String(f.note).replace(/\u0000/g, "").slice(0, 120) } : {}) }))
  .filter((f) => f.path && !f.path.includes("..") && /\.(html?|css|m?js|json|md|svg|txt|webmanifest|py|php|java|cs|ts|tsx|jsx|dart|xml|yml|yaml|sql)$/i.test(f.path))
  .filter((f, i, a) => a.findIndex((x) => x.path === f.path) === i && f.path !== "js/ahm-db.js")
  .slice(0, 18);
// The app only understands ```file:PATH blocks: if the AI wrote the file another way (```js …, or no fence), fix it.
function asFileBlock(out, path) {
  const text = String(out || "").replace(/\u0000[^\n]*\n?/g, "");
  if (blockOf(text, path) != null) return text.trim();
  const sug = /```suggest[\s\S]*?```/.exec(text)?.[0] || "";
  const rest = sug ? text.replace(sug, "") : text;
  const fenced = /```[^\n]*\n([\s\S]*?)```/.exec(rest);
  const body = (fenced ? fenced[1] : rest.replace(/^```[^\n]*\n?|```\s*$/g, "")).replace(/\s+$/, "");
  return "```file:" + path + "\n" + body + "\n```" + (sug ? "\n" + sug : "");
}
const blockOf = (text, path) => {
  const m = new RegExp("```file:" + path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[ \\t]*\\n([\\s\\S]*?)\\n```").exec(text);
  return m ? m[1] : null;
};

// The project has a cloud database (js/ahm-db.js → window.AHM.db): data is shared by every phone and computer.
const CLOUD_PROMPT = `
CLOUD DATABASE (this project has one — use it for ALL the app's data)
- The file js/ahm-db.js already exists. NEVER write, change or delete it. Load it first on every page: <script src="js/ahm-db.js"></script> before your own scripts.
- Save every record (patients, products, sales, users, appointments …) with the async API — NOT localStorage (localStorage only for small UI settings like theme):
  const rows = await AHM.db.list("patients");            // array of objects, each with an "id"
  const saved = await AHM.db.save("patients", {name, phone}); // returns the object with its new "id"; pass an object WITH id to update it
  await AHM.db.remove("patients", id);
  const ok = await AHM.db.login(password);               // the login screen: true if the password is right (the owner sets it in AHM AI; until then any password works)
  AHM.db.logout();
- Keep one data layer (js/data.js) that wraps AHM.db for the rest of the app. Every call is async: show a small loading state, catch errors and show a friendly message in the user's language (e.g. "no internet"), and refresh the lists after saving. If an error has code "login_needed", show the login screen.
- Data is live for everyone: add a "🔄" refresh button on tables. Demo data: only if the collection is empty, save a few example records once.`;

const PLAN_PROMPT = (kind, blueprint = "") => `
PLANNING STEP (do not build yet)
The user wants a ${kind === "app" ? "phone app" : kind === "system" ? "management system / dashboard" : "website"}. Do NOT write any files and do not use file blocks now.
Reply in the user's language with a clear, friendly plan they can approve:
## 🎯 a 1–2 sentence summary of what will be built
## 📄 the ${kind === "app" ? "screens" : "pages"} — each with a short list of what is on it
## ⚙️ the main features
## 🎨 the design: colours, style, fonts${kind === "system" ? "\n## 👥 the users / roles and what data is saved" : ""}
Keep it short and easy to scan (max ~220 words). Fill in smart defaults for anything the user did not say.
MAKE IT AS COMPLETE AS A PROFESSIONAL TEMPLATE, even when the request is one short line ("a system for a pharmacy"):
- 5–6 main parts that this kind of business really needs (never more than 7 in the first build — it is faster and comes out cleaner; more ideas go into the "suggest" block and can be added later).
${kind === "system" ? "- User roles with demo logins that will be shown on the login screen (e.g. admin / admin123 and a staff role / 1234).\n" : ""}- Realistic sample data for the field; money in Iraqi dinar (IQD) unless the user says otherwise; all labels in the user's language.
- Search and filters on lists, and a printable receipt / invoice / report where the field needs one.
- What the user asked always comes first; the field blueprint below only fills the gaps.${blueprint ? `\nFIELD BLUEPRINT (what a good ${kind === "app" ? "app" : kind === "system" ? "system" : "website"} for this field contains):\n${blueprint}` : ""}
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

// Small spelling slips the AI sometimes makes in Kurdish: Persian digits (۲۵ → ٢٥), Arabic vowel marks on Kurdish words
// (مێشکَت → مێشکت) and a doubled «ە» (بنووسەەوە → بنووسەوە). Only in pieces that are Kurdish (Kurdish-only letters).
const KU_ONLY = /[ڕڵێۆەڤگچپژ]/;
function tidyKurdish(t) {
  if (!KU_ONLY.test(t)) return t;
  return t.replace(/[۰-۹]/g, (d) => "٠١٢٣٤٥٦٧٨٩"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)])
    .replace(/([\u0620-\u06FF])[\u064B-\u0652]+/g, "$1")
    .replace(/ەە(?=وە|\s|$|[.،؟!])/g, "ە");
}
// A careful Kurdish editor: fixes spelling and grammar only, keeps the meaning, the layout and every Markdown sign.
async function proofreadKurdish(text) {
  try {
    const r = await Promise.race([
      gemini().models.generateContent({
        model: "gemini-3.8-flash",
        contents: [{ role: "user", parts: [{ text }] }],
        config: {
          systemInstruction: "You are a professional editor of Central Kurdish (Sorani). Correct ONLY spelling, grammar, wrong word forms and unnatural wording in the Kurdish text you get, using the standard written Sorani of Sulaymaniyah and Erbil (correct ڕ ڵ ێ ۆ ە ک ی, Kurdish digits). Also repair broken words that mix Latin letters into a Kurdish word (e.g. «سانتیstateۆ» → «سانتیاگۆ»). Keep the meaning, the order, the length, every Markdown sign (**, #, -, 1.), line breaks, emojis, numbers, names, English words in brackets, and every ⟦0⟧-style marker exactly as they are. Do not add or remove anything. Return only the corrected text.",
          thinkingConfig: { thinkingLevel: "minimal" }, maxOutputTokens: 4096, safetySettings: GEMINI_SAFETY,
        },
      }),
      new Promise((_, no) => setTimeout(() => no(new Error("slow")), 9000)),
    ]);
    const out = tidyKurdish(String(r.text || "").trim());
    // a safe change only: about the same length and the same layout
    const lines = (x) => x.split("\n").filter((l) => l.trim()).length;
    if (!out || Math.abs(out.length - text.length) > text.length * 0.15 || Math.abs(lines(out) - lines(text)) > 1) return null;
    return out;
  } catch { return null; }
}
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
const noteDebug = (list, obj) => { if (hasRedis()) redis("LPUSH", "dbg:" + list, JSON.stringify({ t: new Date().toISOString(), ...obj })).then(() => redis("LTRIM", "dbg:" + list, 0, 19)).catch(() => {}); };
const noteRefusal = (why) => { if (hasRedis()) redis("LPUSH", "dbg:refusals", JSON.stringify({ t: new Date().toISOString(), why: String(why).replace(/key=[^&\s]+/gi, "key=…").slice(0, 160) })).then(() => redis("LTRIM", "dbg:refusals", 0, 19)).catch(() => {}); };
async function* answer(models, contents, baseConfig, useSearch, refusal = REFUSAL.ckb, start = 1) {
  let lastErr = null;
  let sentAny = false;
  // Google's filter often stops normal Kurdish answers by mistake. The first time, start again quietly
  // with the next model and a softer filter ("\u0000RESET" tells the app to clear what it showed).
  let safetyRetry = false, dropSafety = false, lastWhy = "", keyFails = 0;
  const refuseOrRetry = function* () {
    if (safetyRetry && dropSafety) { noteRefusal(lastWhy); yield (sentAny ? "\n\n" : "") + refusal; return true; }
    if (safetyRetry) { dropSafety = true; if (sentAny) yield "\u0000RESET\n"; sentAny = false; return false; } // third try: Google's default filter
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
    let ai = null;
    while (level < THINKING.length) {
      const config = { ...baseConfig, ...(safetyRetry ? { safetySettings: GEMINI_SAFETY_RELAXED } : {}) };
      if (dropSafety) delete config.safetySettings; // this model refused our filter settings: use Google's defaults
      if (THINKING[level]) config.thinkingConfig = THINKING[level];
      if (search) config.tools = [{ googleSearch: {} }];
      try {
        const t0 = Date.now();
        ai = gemini();
        const stream = await ai.models.generateContentStream({ model, contents, config });
        thinkingOk.set(model + ":" + start, level);
        const sources = new Map();
        let stopped = false;
        for await (const chunk of stream) {
          if (isSafetyStop(chunk)) { stopped = true; lastWhy = model + " stop: " + (chunk?.promptFeedback?.blockReason || chunk?.candidates?.[0]?.finishReason); }
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
        noteDebug("ai_errors", { where: "try", model, level, error: errText(e).replace(/key=[^&\s]+/gi, "key=…").slice(0, 160) });
        // an error about our filter SETTINGS (400, "safety_settings …") is not a refusal: try again without them
        if (!dropSafety && /400|INVALID_ARGUMENT/i.test(errCode(e)) && /safety|harm_?category|threshold/i.test(errText(e))) { dropSafety = true; continue; }
        if (/PROHIBITED_CONTENT|BLOCKLIST|blocked.*safety|SAFETY.*block|finishReason.*SAFETY/i.test(errText(e))) { lastWhy = model + " error: " + errText(e); if (yield* refuseOrRetry()) return; break; }
        if (sentAny) { yield isRateLimit(e) ? "\n\n\u0000ERR:busy" : "\n\n\u0000ERR:ai"; return; }
        if (search && (isBadConfig(e) || isRateLimit(e))) { search = false; searchOff.add(model); continue; }
        if (isRateLimit(e) && keyTries < keyCount() - 1) { keyTries++; continue; } // same model, another key
        if (isKeyError(e) && keyFails++ < 3) { markBadKey(ai); continue; } // a wrong / deleted key: skip it, use the next key
        if (isRateLimit(e) || isModelMissing(e)) break;
        if (isTransient(e) && transientTries < 2) { transientTries++; await sleep(700 * transientTries); continue; }
        if (isBadConfig(e)) { level++; continue; }
        break;
      }
    }
  }
  if (safetyRetry && !sentAny) { noteRefusal(lastWhy + " | last: " + errText(lastErr)); yield refusal; return; }
  noteDebug("ai_errors", { models: models.join(","), error: errText(lastErr).replace(/key=[^&\s]+/gi, "key=…").slice(0, 200) });
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

    const cloudDb = build && (body.cloudDb === true || project.some(([k]) => k === "js/ahm-db.js"));
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
      let text = stripFiles(m.content).slice(0, 30000); // made files (```ahm-file JSON) are only noise for a normal answer
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
- CLEAR SPEECH: everyday words that everyone understands, short sentences, no rare or very formal words. In Kurdish: standard Central Kurdish (Sorani) as spoken in Sulaymaniyah and Erbil, correct Sorani spelling (ڕ ڵ ێ ۆ ە), Kurdish words instead of Arabic or English ones where a common Kurdish word exists, numbers written as words. In Arabic: simple Modern Standard Arabic. In English: plain everyday English.
- Reply in the language the user spoke${tutor ? ", except in language teacher mode: speak mainly in the language being learned, keep it simple for their level, and give corrections in one short spoken sentence (\"Good! You can also say: ...\")" : ""}.` : "";
    const baseConfig = {
      systemInstruction: SYSTEM_PROMPT(lang) + (file ? FILE_PROMPT : "") + (build ? (planOnly ? KIND_PROMPT[buildKind] + PLAN_PROMPT(buildKind, blueprintText(matchBlueprints(messages.filter((m) => m.role === "user").slice(-3).map((m) => m.content).join(" ")), buildKind)) + (cloudDb ? "\nThe project will have a cloud database: data is saved online and shared by every device — mention it in the plan in one short line." : "") : BUILD_PROMPT + KIND_PROMPT[buildKind] + (cloudDb ? CLOUD_PROMPT : "")) : "") + (construct ? CONSTRUCT_PROMPT : "") + TUTOR_PROMPT + NOTE_PROMPT + VOICE_PROMPT,
      maxOutputTokens: (file || build) && !planOnly ? 32768 : 8192,
      safetySettings: GEMINI_SAFETY,
    };
    // Web search costs money on Google's side: switch it on in Vercel with ENABLE_SEARCH=1 (Pro users only).
    // The plan step looks things up on Google (free daily amount on the free AI key); it switches off by itself if not allowed.
    const useSearch = (!build && usage.pro && serverEnv("ENABLE_SEARCH") === "1") || (planOnly && serverEnv("PLAN_SEARCH") === "1");

    // A new project is built one file after another; "cont" = a signed note to continue the same build (not counted again).
    const contTok = build && !planOnly && !file ? readStep(body.cont, user.id) : null;
    const stepBuild = build && !planOnly && !file && serverEnv("STEP_BUILD") !== "0" && (!!contTok || project.filter(([k]) => k !== "js/ahm-db.js").length === 0);
    const stepContents = (extra, written) => messages.map((m, i) => {
      let text = m.content.slice(0, 30000);
      const last = i === messages.length - 1;
      if (last) {
        const all = Object.entries({ ...Object.fromEntries(project), ...written }); // new versions replace the old ones
        const files = all.length ? all.map(([k, v]) => `\`\`\`file:${k}\n${v}\n\`\`\``).join("\n\n") : "(empty project)";
        text = `Current project files:\n\n${files}\n\nRequest: ${text}\n\n${extra}`;
      }
      const parts = [{ text }];
      if (last && attachments.length) parts.unshift(...attachments.map((a) => ({ inlineData: { mimeType: a.mimeType, data: a.data } })));
      return { role: m.role === "assistant" ? "model" : "user", parts };
    });

    const encoder = new TextEncoder();
    let counted = !!contTok;
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
    // everyday questions think the least (fast first words); maths, code and long questions think a bit more
    const hard = /[=+*/^√∑]|\d+\s*[x×]\s*\d+|```|function|code|کۆد|بیرکاری|حیساب|معادلة|رياضيات|calculate|prove|equation/i.test(lastText) || lastText.length > 1200;
    const startLevel = planOnly ? 2 : kind === "chat" && !hard ? 2 : START[kind];
    const officeGate = kind === "chat" && !tutor && !body.voiceNote && serverEnv("OFFICE") !== "0" && (OFFICE_WORDS.test(lastText) || lastFile(messages).recent);
    let ctrl = null;
    let open = true;
    let left = false; // the user left the app before the answer was finished → send a notification
    const tStart = Date.now(), reqStart = tStart; let tFirst = 0; // how fast the first words come (shown in /api/health)
    const send = (txt) => { if (!tFirst && txt && !txt.startsWith("\u0000")) tFirst = Date.now(); if (!open || !ctrl) return; try { ctrl.enqueue(encoder.encode(txt)); } catch { open = false; left = true; } };
    // A big build that goes on while the user is away continues by itself on the server ("chain"),
    // with no need to open the app; everything is saved in the same job and the phone gets ONE notification at the end.
    const chainN = Math.max(0, Math.min(10, Number(body.chainN) || 0));
    const chained = body.chain === true && !!contTok && !!jobId;
    let chainNext = null, writtenAll = {}, saveSoFar = () => {};
    // the app told us it went to the background (iPhone often keeps the connection half-open, so "left" alone is not enough)
    // the user pressed ⏹ (only then does the work stop — leaving the app never stops it)
    let userStopped = false;
    const stopNow = async () => { if (userStopped) return true; if (!jobId || !hasRedis()) return false; try { userStopped = (await redis("GET", "stop:" + jobId)) === "1"; } catch {} return userStopped; };
    const awayNow = async () => { if (left) return true; if (!jobId || !hasRedis()) return false; try { return (await redis("GET", "away:" + jobId)) === "1"; } catch { return false; } };
    const work = (async () => {
      let full = "";
      if (chained) { const prev = await readJob(user.id, jobId); full = String(prev?.result || "").replace(/\u0000MORE:[^\n]*\n/g, ""); }
      if (chained && await stopNow()) { await saveJob(user.id, jobId, "done", full); return; } // stopped while the server was going on by itself
      // Saved in the background (don't make the user wait for the database).
      const started = jobId && !chained ? saveJob(user.id, jobId, "running") : null;
      // a small "still working" signal every 12 s, so the app can tell a quiet moment from a broken connection
      const beat = setInterval(() => send("\u0000H\n"), 12000);
      // what is made so far is saved now and then: the app shows it when the user comes back, even before the end
      let savedAt = 0;
      saveSoFar = (force) => { if (!jobId || (!force && Date.now() - savedAt < 4000)) return; savedAt = Date.now(); saveJob(user.id, jobId, "running", full).catch?.(() => {}); };
      // Wait in the fair line (Pro first). The app shows "you are number N".
      const ticket = jobId || randomUUID();
      await waitTurn(ticket, priorityScore({ pro: usage.pro || usage.unlimited, voice: !!body.voice, short: !build && !file && lastText.length < 300 }),
        { onPlace: (n) => send(`\u0000Q:${n}\n`) });
      try {
        let list = null, total = 0, doneN = 0, editing = false, contract = "";
        if (stepBuild) {
          if (contTok) { list = cleanList(contTok.f); doneN = Number(contTok.d) || 0; total = Number(contTok.n) || doneN + list.length; editing = !!contTok.ed; contract = String(contTok.c || "").slice(0, 2000); }
          else {
            const convo = messages.slice(-10).map((m) => (m.role === "user" ? "USER: " : "ASSISTANT: ") + m.content.slice(0, 6000)).join("\n\n");
            try {
              const pics = attachments.filter((a) => /^image\//.test(a.mimeType)).slice(0, 3).map((a) => ({ inlineData: { mimeType: a.mimeType, data: a.data } }));
              const out = await jsonCall(SYSTEM_PROMPT(lang) + FILELIST_PROMPT(buildKind, lang), [...pics, { text: convo + (pics.length ? "\n\n(The attached picture is the design to copy.)" : "") }], { maxTokens: 7000, think: "minimal" });
              list = cleanList(out?.files);
              contract = String(out?.contract || "").replace(/\u0000/g, "").slice(0, 2000);
              if (list.length >= 2) {
                total = list.length;
                const intro = String(out?.intro || "").replace(/\u0000/g, "").trim().slice(0, 600);
                if (intro) { full += intro + "\n\n"; send(intro + "\n\n"); }
                countUsage();
              }
            } catch (e) { console.error("file list", errText(e)); noteDebug("builds", { step: "file_list_failed", error: errText(e).slice(0, 160) }); list = null; }
          }
        }
        // a broad change to an existing project: the AI picks the files itself, then they are rewritten one by one
        const textFiles = project.filter(([k, v]) => !v.startsWith("[image file") && k !== "js/ahm-db.js");
        if (!list && build && !planOnly && !file && !contTok && !stepBuild && textFiles.length >= 2 && (BROAD_CHANGE.test(lastText) || textFiles.length >= 4) && serverEnv("STEP_BUILD") !== "0") {
          let budget = 120_000;
          const filesText = textFiles.map(([k, v]) => { const c = v.slice(0, Math.max(0, Math.min(6000, budget))); budget -= c.length; return `--- ${k} (${v.length} chars)\n${c}`; }).join("\n\n");
          const convo = messages.slice(-6).map((m) => (m.role === "user" ? "USER: " : "ASSISTANT: ") + m.content.slice(0, 3000)).join("\n\n");
          try {
            const out = await jsonCall(SYSTEM_PROMPT(lang) + CHANGE_PROMPT(lang), [{ text: `CONVERSATION:\n${convo}\n\nPROJECT FILES:\n${filesText}\n\nREQUEST: ${lastText}` }], { maxTokens: 3000, think: "minimal" });
            const picked = cleanList(out?.files);
            if (picked.length >= 1) {
              list = picked; total = picked.length; editing = true;
              const intro = String(out?.intro || "").replace(/\u0000/g, "").trim().slice(0, 500);
              if (intro) { full += intro + "\n\n"; send(intro + "\n\n"); }
              countUsage();
            }
          } catch (e) { console.error("change plan", errText(e)); }
        }
        if (list && list.length >= 2) {
          const t0 = Date.now(), written = {}, BUDGET = Number(serverEnv("STEP_BUDGET_MS")) || 210000; // time for one server run
          const stepConfig = { ...baseConfig, systemInstruction: baseConfig.systemInstruction + STEP_RULES };
          const listText = list.map((f, i) => `${doneN + i + 1}. ${f.path} — ${f.about}`).join("\n");
          let stopped = false, made = 0, begun = 0;
          const more = async (rest) => {
            if (stopped || !rest.length) return; stopped = true;
            if (await stopNow()) return; // the user stopped it: no next part
            const tok = signStep({ u: user.id, f: rest, d: total - rest.length, n: total, e: Date.now() + 3600000, ed: editing ? 1 : 0, c: contract });
            writtenAll = written;
            if ((chained || await awayNow()) && jobId && chainN < 8) { chainNext = tok; send("\u0000CHAIN\n"); return; } // nobody is watching: the server goes on by itself
            full += `\u0000MORE:${tok}\n`; send(`\u0000MORE:${tok}\n`);
          };
          const askFor = (f, last) => (editing
            ? `FILES TO CHANGE for this request (in order):\n${listText}\n\nNow write the COMPLETE new version of ONLY the file \`${f.path}\` with this change: ${f.about}. Keep everything else in it working and consistent with the other files.`
            : `FILE LIST of this project (in order)${doneN ? " — the files before these are already written (see the project files above)" : ""}:\n${listText}\n\n${contract ? `SHARED CONTRACT — use EXACTLY these names (other files are written at the same time and rely on them):\n${contract}\n\n` : ""}Now write ONLY the file \`${f.path}\` — ${f.about}`) + `${last ? "\nAfter the file block, add the \"suggest\" block (exactly 3 lines starting with \"- \") with next improvements, in the user's language." : ""}`;
          // Writes one file. live = its text appears in the app while it is being written.
          const writeOne = async (f, last, live, level) => {
            if (stopped) return false;
            const mark = `\u0000F:${doneN + ++begun}/${total}:${f.path}\n`;
            full += mark; send(mark);
            saveSoFar(begun <= 2); // the app shows "file 1 of 13" right away when it is opened again
            let out = "", shown = 0;
            const fileModels = /^readme\.md$/i.test(f.path) ? [...new Set(["gemini-3.5-flash-lite", ...models])] : models; // the guide is simple text: the fast model
            for await (const piece of answer(fileModels, stepContents(askFor(f, last), written), stepConfig, false, REFUSAL[lang], level)) {
              // never run into the server's hard time limit (the work would be lost and the app would wait forever):
              // a file that is not finished in time is written again in the next part
              if (Date.now() - reqStart > (Number(serverEnv("STEP_HARD_MS")) || 268000)) { out = "\u0000ERR:time"; break; }
              if (piece.includes("\u0000RESET")) { // the filter made the AI start again: take back what was shown of this file
                if (live && shown) { send(`\u0000UNDO:${shown}\n`); full = full.slice(0, full.length - shown); }
                out = ""; shown = 0; continue;
              }
              out += piece;
              if (live && !piece.includes("\u0000ERR:")) { full += piece; send(piece); shown += piece.length; }
            }
            if (/\u0000ERR:/.test(out) || !out.trim()) {
              if (live && shown) { send(`\u0000UNDO:${shown}\n`); full = full.slice(0, full.length - shown); }
              return false;
            }
            countUsage();
            const fixed = asFileBlock(out, f.path);
            written[f.path] = blockOf(fixed, f.path) ?? "";
            if (live) {
              if (blockOf(out, f.path) == null) { send(`\u0000UNDO:${shown}\n`); full = full.slice(0, full.length - shown); full += fixed; send(fixed); }
              full += "\n\n"; send("\n\n");
            } else { full += fixed + "\n\n"; send(fixed + "\n\n"); }
            made++;
            saveSoFar();
            return true;
          };
          // the files everything depends on are written one by one (and shown live); then the pages / screens
          // are written 3 at a time (they only need the shared files) — much faster for big projects; README last.
          const isPage = (p) => (/\.html?$/i.test(p) && p !== "index.html") || /(^|\/)(pages|screens)\//i.test(p);
          // Speed: only the first two files (the shared design and the main page / app shell) are written one by one,
          // live on screen; every other file only needs those, so they are written 4 at a time. No long "thinking" for
          // any file (it made the first words wait up to a minute per file).
          const pages = list.filter((f) => isPage(f.path) || /^readme\.md$/i.test(f.path));
          const core = list.filter((f) => !pages.includes(f));
          const firstN = doneN ? 0 : Math.min(2, core.length);
          const order = [...core, ...pages];
          const lastPath = order[order.length - 1].path;
          const leftAll = () => order.filter((f) => !(f.path in written));
          // the shared design and the main page are written at the same time (the contract gives both the same names);
          // without a contract they are written one after the other
          if (firstN) {
            const firsts = core.slice(0, firstN);
            const liveOne = firsts.find((f) => /\.html?$/i.test(f.path)) || firsts[0];
            const results = contract
              ? await Promise.all(firsts.map((f) => writeOne(f, f.path === lastPath, f === liveOne, 2)))
              : await (async () => { const out = []; for (const f of firsts) { if (stopped) break; out.push(await writeOne(f, f.path === lastPath, true, 2)); if (!out[out.length - 1]) break; } return out; })();
            if (results.includes(false) || results.length < firsts.length) { if (made || doneN) await more(leftAll()); else { const er = "\u0000ERR:ai"; full += er; send(er); stopped = true; } }
          }
          const rest = [...core.slice(firstN), ...pages];
          for (let i = 0; i < rest.length && !stopped; i += 5) {
            if (await stopNow()) { stopped = true; break; }
            if (Date.now() - t0 > BUDGET * 0.85) { await more(leftAll()); break; }
            const batch = rest.slice(i, i + 5);
            // a single file alone (e.g. the last one) is shown live
            const ok = await Promise.all(batch.map((f) => writeOne(f, f.path === lastPath, batch.length === 1, 2)));
            if (ok.includes(false)) { await more(leftAll()); break; }
          }
          noteDebug("builds", { mode: editing ? "edit" : contTok ? "continue" : "new", kind: buildKind, cloud: cloudDb, planned: list.length, made, result: stopped ? (/\u0000MORE:/.test(full) ? "continue_later" : "error") : "ok", secs: Math.round((Date.now() - t0) / 1000) });
          if (!stopped && !/\u0000(MORE|ERR):/.test(full)) {
            const n = doneN + list.length;
            // an edit says honestly what was changed, file by file, in the user's language
            const changes = editing ? list.filter((f) => f.path in written).map((f) => `• \`${f.path}\` — ${f.note || f.about}`).join("\n") : "";
            const kd = (x) => (lang === "en" ? String(x) : String(x).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]));
            const end = (changes ? changes + "\n\n" : "") + (editing
              ? { ckb: `✅ تەواو بوو — ${kd(n)} فایل نوێ کرانەوە.\n▶️ لە پیشاندان سەیری بکە، و ئەگەر شتێکی تر بگۆڕم پێم بڵێ.`,
                  ar: `✅ انتهى — تم تحديث ${kd(n)} ملفات.\n▶️ شاهده في المعاينة، وأخبرني إن أردت تغييراً آخر.`,
                  en: `✅ Done — ${kd(n)} files updated.\n▶️ See it in the preview and tell me if you want anything else changed.` }
              : { ckb: `✅ تەواو بوو — هەموو ${kd(n)} فایلەکە دروست کران.\n▶️ لە پیشاندان تاقی بکەرەوە، و هەر شتێکت ویست بیگۆڕم پێم بڵێ.`,
                  ar: `✅ انتهى — تم إنشاء كل الملفات (${kd(n)}).\n▶️ جرّبه في المعاينة، وأخبرني بأي تغيير تريده.`,
                  en: `✅ Done — all ${kd(n)} files are ready.\n▶️ Try it in the preview and tell me anything you want changed.` })[lang] || "";
            full += end; send(end);
          }
        } else {
          // A real Excel / PowerPoint / Word / PDF file asked for (or a change to the file made just before):
          // the AI writes its content as JSON and the phone turns it into the file (lib/office.js).
          let office = null;
          if (officeGate) {
            // "making your file…" only when a file was clearly asked for (a follow-up may just be a question)
            const note = OFFICE_WORDS.test(lastText) ? { ckb: "📄 فایلەکەت ئامادە دەکەم…", ar: "📄 أجهّز ملفك…", en: "📄 Making your file…" }[lang] || "" : "";
            const o0 = Date.now(), secsWord = { ckb: "چرکە", ar: "ثانية", en: "s" }[lang] || "s";
            const digitsOf = (x) => (lang === "en" ? String(x) : String(x).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]));
            if (note) { full += note; send(note); }
            // a live "… 12 seconds" so the user sees it is working (only shown, not saved)
            const tick = note ? setInterval(() => send("\u0000RESET\n" + note + " " + digitsOf(Math.round((Date.now() - o0) / 1000)) + " " + secsWord), 3000) : null;
            let why = "";
            try { office = await officeTurn({ messages, lang, attachments }); }
            catch (e) { why = String(e?.message || e).slice(0, 120); if (why === "unsafe") office = { refused: true }; else console.error("office", why); }
            if (tick) clearInterval(tick);
            noteDebug("builds", { mode: "office", kind: office?.file?.type || (office?.refused ? "refused" : "none"), result: office ? "ok" : why ? "error: " + why : "chat", secs: Math.round((Date.now() - o0) / 1000) });
            if (note) { full += "\u0000RESET\n"; send("\u0000RESET\n"); }
          }
          if (office?.refused) { full += REFUSAL[lang]; send(REFUSAL[lang]); }
          else if (office) {
            countUsage();
            const made = { ckb: "✅ فایلەکەت ئامادەیە.", ar: "✅ ملفك جاهز.", en: "✅ Your file is ready." }[lang];
            const txt = (office.reply || made) + "\n\n```ahm-file\n" + JSON.stringify(office.file) + "\n```\n";
            full += txt; send(txt);
          } else for await (const raw of answer(models, contents, baseConfig, useSearch, REFUSAL[lang], startLevel)) {
            if (!raw.includes("\u0000ERR:")) countUsage(); // only count questions that got an answer
            const piece = lang === "ckb" ? tidyKurdish(raw) : raw;
            full += piece;
            send(piece);
            saveSoFar(); // what is written is kept now and then (the app shows it on return)
          }
          // Kurdish answers get a quick proofreading pass (the AI's Kurdish grammar is sometimes a little off):
          // the answer is already on screen, and a few seconds later the corrected text replaces it.
          if (lang === "ckb" && kind === "chat" && full.length > 60 && full.length < 8000 && !/\u0000|\]\(http/.test(full) && serverEnv("PROOFREAD") !== "0") {
            // code / cards (``` blocks) are kept aside untouched; only the Kurdish text around them is checked
            const blocks = [];
            const textOnly = full.replace(/```[\s\S]*?```/g, (b) => `⟦${blocks.push(b) - 1}⟧`);
            const edited = textOnly.length > 60 ? await proofreadKurdish(textOnly) : null;
            const ok = edited && blocks.every((_, i) => edited.split(`⟦${i}⟧`).length === 2);
            const fixed = ok ? edited.replace(/⟦(\d+)⟧/g, (_, i) => blocks[+i]) : null;
            if (fixed && fixed !== full) { full = fixed; send("\u0000RESET\n" + fixed); }
          }
        }
      } catch (e) {
        console.error(e);
        full += "\u0000ERR:ai";
        send("\u0000ERR:ai");
      } finally {
        clearInterval(beat);
        noteDebug("timing", { kind: officeGate && /```ahm-file/.test(full) ? "file" : kind, pro: !!proUser, first_s: tFirst ? +((tFirst - tStart) / 1000).toFixed(1) : null, total_s: +((Date.now() - tStart) / 1000).toFixed(1), chars: full.length });
        doneTurn(ticket);
        if (open && ctrl) { try { ctrl.close(); } catch {} }
        open = false;
      }
      if (started) await started;
      if (chainNext) {
        // save what is made so far, then start the next part (a new server run) and stop here — no notification yet
        await saveJob(user.id, jobId, "running", full);
        try {
          const proj = { ...(body.project && typeof body.project === "object" ? body.project : {}), ...writtenAll };
          const res = await fetch(new URL("/api/chat", req.url), { method: "POST", headers: { "Content-Type": "application/json", Authorization: req.headers.get("authorization") || "" },
            body: JSON.stringify({ ...body, project: proj, cont: chainNext, chain: true, chainN: chainN + 1, jobId }) });
          try { await res.body?.cancel(); } catch {}
          noteDebug("builds", { mode: "chain", part: chainN + 1, status: res.status });
          if (res.ok) return;
        } catch (e) { console.error("chain", errText(e)); }
        // the next part could not start: leave a "continue" note for the app instead
        full += `\u0000MORE:${chainNext}\n`;
      }
      if (jobId) await saveJob(user.id, jobId, "done", full);
      if (!(await stopNow()) && await awayNow()) {
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
    // an unexpected server error: tell the owner (the same error at most once every 6 hours)
    try { const m = errText(e).slice(0, 200); if (hasRedis() && (await redis("SET", "serr:" + m.slice(0, 80), "1", "NX", "EX", 21600)) === "OK") await notifyOwner("🔥 <b>هەڵەی سێرڤەر</b> (chat)\n<code>" + escHtml(m) + "</code>"); } catch {}
    return Response.json({ error: "server", detail: errText(e) }, { status: 500 });
  }
}
