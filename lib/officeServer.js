// Real files made in the chat: Excel (.xlsx), PowerPoint (.pptx), Word (.docx) and PDF.
// The AI writes the CONTENT as JSON (this file); the phone turns it into the real file (lib/office.js),
// so Kurdish and Arabic letters are always drawn correctly and nothing heavy runs on the server.
// In the chat the file travels as a ```ahm-file block with that JSON; the app shows it as a file card.
import { jsonCall } from "./gemini";
import { SCHEMA as DECK_SCHEMA, RULES as DECK_RULES, LANG as DECK_LANG, cleanDeck } from "./deckSchema";

// Words that mean "make me a file" (Kurdish in Arabic and Latin letters, Arabic, English).
export const OFFICE_WORDS = /excel|xlsx|ئێکسڵ|ئێکسل|ئیکسل|ئێکسێل|ئێکسڵ|اكسل|إكسل|اکسل|\bexl\b|\bexel\b|spreadsheet|power\s*point|pptx|پاوەر\s*پۆینت|پاوەرپۆینت|پاوەر\s*پوینت|پاوەرپوینت|باوربوينت|بوربوينت|بور بوينت|عرض تقديمي|presentation|\bslides?\b|سلاید|شرائح|\bpdf\b|پی\s*دی\s*ئێف|بي دي اف|\bword\b|docx|وۆرد|وۆڕد|\bwrd\b|ملف وورد|\bfile\b|فایل|فايل|ملف/i;

const BLOCK = /```ahm-file\s*\n([\s\S]*?)\n```/;
export const stripFiles = (text) => String(text || "").replace(/```ahm-file\s*\n[\s\S]*?(\n```|$)/g, (m) => {
  try { const f = JSON.parse(BLOCK.exec(m)?.[1] || "{}"); return `[the file "${f.name || "file"}.${f.type || ""}" was made here]`; } catch { return "[a file was made here]"; }
});
export function lastFile(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== "assistant") continue;
    const m = BLOCK.exec(messages[i].content || "");
    if (!m) return { file: null, recent: false };
    try { return { file: JSON.parse(m[1]), recent: i === messages.length - 2 }; } catch { return { file: null, recent: false }; }
  }
  return { file: null, recent: false };
}

const LANG_NAME = { ckb: "Kurdish Sorani in Arabic script (correct Sorani spelling with ڕ ڵ ێ ۆ ە)", ar: "Modern Standard Arabic", en: "English" };

const SHEET_SCHEMA = `"xlsx" (Excel):
{"type":"xlsx","name":"short file name","lang":"ckb|ar|en","sheets":[{
  "name":"sheet name (max 30 chars)",
  "columns":[{"header":"…","type":"text|number|money|percent|date|integer","width":8-60,"sum":true|false}],
  "rows":[[cell, cell, …], …],
  "note":"optional one-line note under the table"}]}
- A cell is a string, a number, or a formula string starting with "=" (Excel English function names: SUM, AVERAGE, MIN, MAX, ROUND, IF, COUNT, COUNTIF, SUMIF, IFERROR).
- Formulas refer to cells by Excel address: the header is row 1, the first data row is row 2, column A is the first column (also in right-to-left sheets). Example in data row 5: "=C5*D5". Never refer to the total row. Another sheet: "='Sheet name'!B2" (always in single quotes).
- Numbers are plain numbers (12000, not "12,000 د.ع"); put the currency in the header, e.g. "نرخ (دینار)". Percent as a fraction (0.15 = 15%). Dates as "YYYY-MM-DD".
- "sum": true adds a total row (SUM formula) for that column. Use real, useful columns; calculated columns use formulas, not typed results.
- Up to 500 rows per sheet, up to 6 sheets.`;

const DOC_SCHEMA = `"docx" (Word) or "pdf":
{"type":"docx|pdf","name":"short file name","lang":"ckb|ar|en","title":"…","subtitle":"optional","blocks":[
  {"t":"h1|h2|h3","text":"…"},
  {"t":"p","text":"paragraph; **bold** words allowed"},
  {"t":"bullets","items":["…"]}, {"t":"numbers","items":["…"]},
  {"t":"table","columns":["…"],"rows":[["…"]],"total":"optional total line"},
  {"t":"kv","items":[{"k":"label","v":"value"}]}   (e.g. invoice/letter details: date, number, name),
  {"t":"quote","text":"…"}, {"t":"divider"}, {"t":"space"},
  {"t":"sign","text":"name / signature line"} ]}
- Real, complete, professional content (CV, letter, report, invoice, contract, plan, lesson…). No placeholder text like "lorem ipsum"; if a detail is unknown (the user's name, phone…), use a clear blank like "……………".`;

const OFFICE_SYSTEM = (lang) => `You are AHM AI's document maker. The user is chatting with you. Decide if they want a FILE (Excel, PowerPoint, Word, PDF) made or changed now.
Return JSON only: {"make": true|false, "reply": "…", "file": {…} }
- "make": true only if they ask to CREATE a file, or to CHANGE the file you made before ("add a column", "make it green", "add 2 slides", "translate it", "make it PDF"…). Questions ABOUT Excel/Word ("how do I use VLOOKUP?") → "make": false, no file.
- Make a file only when they name a file or format (Excel, PowerPoint/slides, Word, PDF, "file") or ask to change your previous file. "Write me a letter / a table" with no file asked → "make": false (a normal chat answer is better).
- File type: Excel/sheet → "xlsx"; PowerPoint/slides/presentation → "pptx"; Word → "docx"; PDF → "pdf". Just "a file" for a table/list to calculate → "xlsx"; just "a file" for a CV, letter, report, invoice or other text → "pdf".
- When CHANGING the previous file: return the WHOLE updated file, keep everything the user did not ask to change, same type unless they ask for another type.
- "reply": 1–2 short sentences in ${LANG_NAME[lang] || LANG_NAME.ckb}: what you made (e.g. "✅ فایلی Excelـەکەت ئامادەیە: ٣ شیت و ٢٠ ڕیز، کۆی گشتی خۆکار دەژمێرێت."). No file content in the reply.
- Write the file content in the language the user wrote in (Kurdish Sorani in Arabic script if they wrote Kurdish, also when they wrote Kurdish in Latin letters), unless they ask for another language. Set "lang". Perfect spelling.
- Use what the user gave you (their numbers, names, pasted text, attached photo of a table or document). Never invent personal facts about the user. Realistic example data only when they ask for an example/template.

FILE FORMATS
${SHEET_SCHEMA}

"pptx" (PowerPoint): {"type":"pptx","name":"short file name","theme":"corporate|consult|tech|sunrise|noir|ocean|minimal|kurd|sunset|royal", …the deck below}
${DECK_SCHEMA.replace(/^Return JSON only:\s*/, "")}
${DECK_RULES(LANG_NAME[lang] || LANG_NAME.ckb).replace(/^You are a world-class presentation designer and editor\.\n/, "")}
(For "pptx" leave "image" empty.)

${DOC_SCHEMA}`;

const s = (v, n = 300) => String(v ?? "").replace(/\u0000/g, "").slice(0, n);
const arr = (a, n) => (Array.isArray(a) ? a.slice(0, n) : []);
const cell = (c) => (typeof c === "number" && Number.isFinite(c) ? c : typeof c === "boolean" ? String(c) : s(c, 2000));
const fname = (n, fallback) => s(n, 80).replace(/[\\/:*?"<>|#%\u0000-\u001f]+/g, " ").replace(/\.(xlsx|pptx|docx|pdf)$/i, "").trim() || fallback;
const L = (l, fb) => (["ckb", "ar", "en"].includes(l) ? l : fb);

export function cleanFile(f, lang) {
  if (!f || typeof f !== "object") return null;
  const type = ["xlsx", "pptx", "docx", "pdf"].includes(f.type) ? f.type : null;
  if (!type) return null;
  if (type === "xlsx") {
    const TYPES = ["text", "number", "money", "percent", "date", "integer"];
    const sheets = arr(f.sheets, 6).map((sh, i) => {
      const columns = arr(sh?.columns, 40).map((c) => ({ header: s(c?.header ?? c, 80), type: TYPES.includes(c?.type) ? c.type : "text", width: Number(c?.width) > 0 ? Math.max(6, Math.min(70, Number(c.width))) : undefined, sum: !!c?.sum }));
      const rows = arr(sh?.rows, 500).map((r) => arr(r, 40).map(cell));
      return { name: s(sh?.name, 30).replace(/[\\/?*[\]:]/g, " ").trim() || "Sheet" + (i + 1), columns, rows, note: s(sh?.note, 300) };
    }).filter((sh) => sh.columns.length || sh.rows.length);
    if (!sheets.length) return null;
    return { type, name: fname(f.name, "AHM-AI"), lang: L(f.lang, lang), sheets };
  }
  if (type === "pptx") {
    const deck = cleanDeck(f);
    if (!deck) return null;
    const themes = ["corporate", "consult", "tech", "sunrise", "noir", "ocean", "minimal", "kurd", "sunset", "royal"];
    deck.slides.forEach((x) => { x.image = ""; });
    return { type, name: fname(f.name || deck.title, "AHM-AI"), theme: themes.includes(f.theme) ? f.theme : "corporate", ...deck, lang: L(f.lang || deck.lang, lang) };
  }
  const KINDS = ["h1", "h2", "h3", "p", "bullets", "numbers", "table", "kv", "quote", "divider", "space", "sign"];
  const blocks = arr(f.blocks, 400).map((b) => {
    const t = KINDS.includes(b?.t) ? b.t : "p";
    if (t === "bullets" || t === "numbers") return { t, items: arr(b.items, 60).map((x) => s(x, 1200)).filter(Boolean) };
    if (t === "table") return { t, columns: arr(b.columns, 12).map((x) => s(x, 80)), rows: arr(b.rows, 200).map((r) => arr(r, 12).map((x) => s(x, 400))), total: s(b.total, 200) };
    if (t === "kv") return { t, items: arr(b.items, 30).map((x) => ({ k: s(x?.k, 80), v: s(x?.v, 300) })) };
    if (t === "divider" || t === "space") return { t };
    return { t, text: s(b.text, 6000) };
  }).filter((b) => b.text || b.items?.length || b.rows?.length || b.columns?.length || b.t === "divider" || b.t === "space");
  if (!blocks.length && !s(f.title)) return null;
  return { type, name: fname(f.name || f.title, "AHM-AI"), lang: L(f.lang, lang), title: s(f.title, 200), subtitle: s(f.subtitle, 300), blocks };
}

// → { reply, file } when a file was made / changed, or null (a normal chat answer is better).
export async function officeTurn({ messages, lang, attachments = [] }) {
  const { file: prev } = lastFile(messages);
  const convo = messages.slice(-8, -1).map((m) => (m.role === "user" ? "USER: " : "ASSISTANT: ") + stripFiles(m.content).slice(0, 3000)).join("\n\n");
  const ask = String(messages[messages.length - 1].content || "").slice(0, 20000);
  const parts = [];
  for (const a of attachments.slice(0, 4)) if (/^(image\/|application\/pdf)/.test(a.mimeType)) parts.push({ inlineData: { mimeType: a.mimeType, data: a.data } });
  parts.push({ text: [
    convo ? "EARLIER CONVERSATION:\n" + convo : "",
    prev ? "THE FILE YOU MADE BEFORE (JSON):\n" + JSON.stringify(prev).slice(0, 120000) : "",
    (parts.length ? "(The user attached the file(s) above.)\n" : "") + "THE USER'S NEW MESSAGE:\n" + ask,
  ].filter(Boolean).join("\n\n") });
  const out = await jsonCall(OFFICE_SYSTEM(lang), parts, { maxTokens: 32000, think: "minimal" }); // writing a file needs little thinking: much faster
  if (!out?.make) return null;
  const file = cleanFile(out.file, lang);
  if (!file) return null;
  return { reply: s(out.reply, 600).trim(), file };
}
