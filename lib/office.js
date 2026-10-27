// Turns the file content the AI wrote (JSON from lib/officeServer.js) into REAL files, on the phone:
//   Excel (.xlsx, with working formulas)  ·  PowerPoint (.pptx, editable)  ·  Word (.docx)  ·  PDF
// Browser only. Kurdish and Arabic are right-to-left everywhere.

import { THEMES, layoutSlide, exportPptx, renderSlide, exportPdf } from "./deck";

export const MIME = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
};
const rtlOf = (f) => f.lang !== "en";
const fileName = (f, ext) => (String(f.name || "AHM-AI").replace(/[\\/:*?"<>|#%]+/g, " ").trim().slice(0, 60) || "AHM-AI") + "." + ext;
const TOTAL = { ckb: "کۆی گشتی", ar: "المجموع", en: "Total" };

// ======================================================================
// Excel formulas: a small calculator, so the preview (and phones that don't
// recalculate, like the iPhone Files preview) show the results.
// ======================================================================
export const colName = (n) => { let s = ""; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
const colIndex = (s) => s.toUpperCase().split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

// grid: rows of values (row 0 = header row 1 in Excel). Returns a function value(r, c).
export function calcSheet(grid) {
  const memo = new Map(), busy = new Set();
  const raw = (r, c) => grid[r]?.[c];
  function value(r, c) {
    const k = r + ":" + c;
    if (memo.has(k)) return memo.get(k);
    const v = raw(r, c);
    if (typeof v !== "string" || !v.startsWith("=")) return v ?? "";
    if (busy.has(k)) return NaN; // a formula that refers to itself
    busy.add(k);
    let out;
    try { out = evalFormula(v.slice(1), value); } catch { out = undefined; }
    busy.delete(k); memo.set(k, out);
    return out;
  }
  return value;
}
function evalFormula(src, value) {
  const toks = [];
  const re = /\s*(?:("(?:[^"]|"")*")|(\d+(?:\.\d+)?%?)|(\$?[A-Za-z]+\$?\d+(?::\$?[A-Za-z]+\$?\d+)?)|([A-Za-z_][A-Za-z0-9_.]*)(?=\s*\()|(<=|>=|<>|[-+*/^&=<>(),:;%]))/y;
  let m, i = 0;
  while (i < src.length) {
    re.lastIndex = i;
    if (!(m = re.exec(src))) { if (/^\s*$/.test(src.slice(i))) break; throw new Error("parse"); }
    i = re.lastIndex;
    if (m[1]) toks.push({ s: m[1].slice(1, -1).replace(/""/g, '"') });
    else if (m[2]) toks.push({ n: m[2].endsWith("%") ? parseFloat(m[2]) / 100 : parseFloat(m[2]) });
    else if (m[3]) toks.push({ ref: m[3].replace(/\$/g, "").toUpperCase() });
    else if (m[4]) toks.push({ fn: m[4].toUpperCase() });
    else toks.push({ op: m[5] === ";" ? "," : m[5] });
  }
  let p = 0;
  const peek = () => toks[p], eat = (op) => { if (toks[p]?.op === op) { p++; return true; } return false; };
  const cellAt = (ref) => { const mm = /^([A-Z]+)(\d+)$/.exec(ref); return value(+mm[2] - 1, colIndex(mm[1])); };
  const range = (ref) => {
    const [a, b] = ref.split(":"), A = /^([A-Z]+)(\d+)$/.exec(a), B = /^([A-Z]+)(\d+)$/.exec(b);
    const out = [];
    for (let r = Math.min(+A[2], +B[2]); r <= Math.max(+A[2], +B[2]); r++) for (let c = Math.min(colIndex(A[1]), colIndex(B[1])); c <= Math.max(colIndex(A[1]), colIndex(B[1])); c++) out.push(value(r - 1, c));
    return out;
  };
  const num = (v) => (typeof v === "number" ? v : v === "" || v == null ? 0 : typeof v === "boolean" ? +v : Number.isFinite(+v) ? +v : NaN);
  const flat = (args) => args.flatMap((a) => (Array.isArray(a) ? a : [a]));
  const nums = (args) => flat(args).filter((v) => typeof v === "number" || (typeof v === "string" && v !== "" && Number.isFinite(+v))).map(Number);
  const crit = (c) => {
    const mm = /^(<=|>=|<>|<|>|=)?(.*)$/.exec(String(c)), op = mm[1] || "=", rhs = mm[2], n = Number(rhs);
    return (v) => {
      const a = rhs !== "" && Number.isFinite(n) ? num(v) : String(v), b = rhs !== "" && Number.isFinite(n) ? n : rhs;
      return op === "=" ? a == b : op === "<>" ? a != b : op === "<" ? a < b : op === ">" ? a > b : op === "<=" ? a <= b : a >= b;
    };
  };
  const FN = {
    SUM: (a) => nums(a).reduce((x, y) => x + y, 0),
    AVERAGE: (a) => { const n = nums(a); return n.length ? n.reduce((x, y) => x + y, 0) / n.length : NaN; },
    MIN: (a) => { const n = nums(a); return n.length ? Math.min(...n) : 0; },
    MAX: (a) => { const n = nums(a); return n.length ? Math.max(...n) : 0; },
    COUNT: (a) => nums(a).length,
    COUNTA: (a) => flat(a).filter((v) => v !== "" && v != null).length,
    ROUND: ([x, d]) => { const k = 10 ** num(d ?? 0); return Math.round(num(x) * k) / k; },
    ABS: ([x]) => Math.abs(num(x)),
    IF: ([c, a, b]) => (c && c !== "0" ? a : b ?? false),
    IFERROR: ([a, b]) => (typeof a === "number" && !Number.isFinite(a)) || a === undefined ? b : a,
    AND: (a) => flat(a).every(Boolean), OR: (a) => flat(a).some(Boolean),
    SUMIF: ([r, c, s]) => { const t = crit(c), sr = s || r; return r.reduce((n, v, k) => n + (t(v) ? num(sr[k]) || 0 : 0), 0); },
    COUNTIF: ([r, c]) => { const t = crit(c); return r.filter((v) => t(v)).length; },
    AVERAGEIF: ([r, c, s]) => { const t = crit(c), sr = s || r, n = r.map((v, k) => (t(v) ? num(sr[k]) : null)).filter((x) => x != null); return n.length ? n.reduce((x, y) => x + y, 0) / n.length : NaN; },
    CONCATENATE: (a) => flat(a).join(""), CONCAT: (a) => flat(a).join(""),
  };
  function primary() {
    const t = toks[p++];
    if (!t) throw new Error("end");
    if (t.op === "(") { const v = compare(); if (!eat(")")) throw new Error(")"); return v; }
    if (t.op === "-") return -num(power());
    if (t.op === "+") return num(power());
    if ("n" in t) return t.n;
    if ("s" in t) return t.s;
    if (t.ref) return t.ref.includes(":") ? range(t.ref) : cellAt(t.ref);
    if (t.fn) {
      if (!eat("(")) throw new Error("(");
      const args = [];
      if (!eat(")")) { do args.push(compare()); while (eat(",")); if (!eat(")")) throw new Error(")"); }
      if (t.fn === "TRUE") return true; if (t.fn === "FALSE") return false;
      const f = FN[t.fn];
      if (!f) throw new Error("fn");
      return f(args);
    }
    throw new Error("token");
  }
  function power() { let v = primary(); while (peek()?.op === "^") { p++; v = num(v) ** num(primary()); } if (peek()?.op === "%") { p++; v = num(v) / 100; } return v; }
  function term() { let v = power(); while (peek()?.op === "*" || peek()?.op === "/") { const o = toks[p++].op, b = power(); v = o === "*" ? num(v) * num(b) : num(v) / num(b); } return v; }
  function sum() { let v = term(); while (peek()?.op === "+" || peek()?.op === "-") { const o = toks[p++].op, b = term(); v = o === "+" ? num(v) + num(b) : num(v) - num(b); } return v; }
  function concat() { let v = sum(); while (peek()?.op === "&") { p++; v = String(v) + String(sum()); } return v; }
  function compare() {
    let v = concat();
    while (["=", "<>", "<", ">", "<=", ">="].includes(peek()?.op)) {
      const o = toks[p++].op, b = concat();
      const [x, y] = typeof v === "number" || typeof b === "number" ? [num(v), num(b)] : [String(v), String(b)];
      v = o === "=" ? x == y : o === "<>" ? x != y : o === "<" ? x < y : o === ">" ? x > y : o === "<=" ? x <= y : x >= y;
    }
    return v;
  }
  const out = compare();
  if (p < toks.length) throw new Error("rest");
  if (Array.isArray(out)) return out[0];
  if (typeof out === "number" && !Number.isFinite(out)) return undefined;
  return out;
}

// One sheet as a grid (header row + data rows + total row), with the totals written as formulas.
export function sheetGrid(sh, lang) {
  const n = Math.max(sh.columns.length, ...sh.rows.map((r) => r.length), 1);
  const header = Array.from({ length: n }, (_, c) => sh.columns[c]?.header ?? "");
  const rows = sh.rows.map((r) => Array.from({ length: n }, (_, c) => (r[c] === undefined ? "" : r[c])));
  const sums = sh.columns.map((c, i) => (c.sum ? i : -1)).filter((i) => i >= 0);
  let total = null;
  if (sums.length && rows.length) {
    total = Array.from({ length: n }, () => "");
    const labelCol = [...Array(n).keys()].find((i) => !sums.includes(i)) ?? 0;
    if (!sums.includes(labelCol)) total[labelCol] = TOTAL[lang] || TOTAL.en;
    for (const c of sums) total[c] = `=SUM(${colName(c)}2:${colName(c)}${rows.length + 1})`;
  }
  return { n, header, rows, total, grid: [header, ...rows, ...(total ? [total] : [])] };
}

const FMT = { money: "#,##0", number: "#,##0.##", integer: "#,##0", percent: "0%", date: "yyyy-mm-dd" };
export function showValue(v, type, lang) {
  if (v === undefined || v === null) return "";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v !== "number") return String(v);
  const loc = lang === "en" ? "en-US" : "en-US"; // western digits in sheets, like Excel
  if (type === "percent") return (v * 100).toLocaleString(loc, { maximumFractionDigits: 1 }) + "%";
  if (type === "money" || type === "integer") return Math.round(v).toLocaleString(loc);
  return v.toLocaleString(loc, { maximumFractionDigits: 2 });
}

export async function makeXlsx(f) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "AHM AI"; wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true; // Excel recalculates every formula when the file opens
  const rtl = rtlOf(f), font = rtl ? "Tahoma" : "Calibri";
  const used = new Set();
  for (const sh of f.sheets) {
    let name = sh.name.slice(0, 31) || "Sheet", k = 2;
    while (used.has(name.toLowerCase())) name = sh.name.slice(0, 27) + " " + k++;
    used.add(name.toLowerCase());
    // a sheet written in Kurdish / Arabic opens right-to-left, an English one left-to-right
    const sheetRtl = /[\u0600-\u06FF]/.test(sh.name + sh.columns.map((c) => c.header).join(" ")) || (rtl && !/[A-Za-z]/.test(sh.columns.map((c) => c.header).join("")));
    const ws = wb.addWorksheet(name, { views: [{ rightToLeft: sheetRtl, state: "frozen", ySplit: 1 }], properties: { defaultRowHeight: 22 } });
    const g = sheetGrid(sh, f.lang), value = calcSheet(g.grid);
    const types = Array.from({ length: g.n }, (_, c) => sh.columns[c]?.type || "text");
    const thin = { style: "thin", color: { argb: "FFD0D7E2" } }, border = { top: thin, bottom: thin, left: thin, right: thin };
    ws.columns = Array.from({ length: g.n }, (_, c) => {
      const longest = Math.max(String(g.header[c]).length * 0.9, ...g.rows.slice(0, 200).map((r, i) => showValue(typeof r[c] === "string" && r[c].startsWith("=") ? value(i + 1, c) : r[c], types[c]).length));
      return { width: sh.columns[c]?.width || Math.max(10, Math.min(48, Math.round(longest * 1.15) + 3)) };
    });
    g.grid.forEach((row, r) => {
      const xr = ws.getRow(r + 1);
      const isHead = r === 0, isTotal = !!g.total && r === g.grid.length - 1;
      row.forEach((v, c) => {
        const cell = xr.getCell(c + 1);
        const t = types[c];
        if (typeof v === "string" && v.startsWith("=")) {
          const res = value(r, c);
          cell.value = { formula: v.slice(1), ...(res !== undefined && res !== "" ? { result: res } : {}) };
        } else if (!isHead && t === "date" && /^\d{4}-\d{2}-\d{2}$/.test(String(v))) {
          const [y, mo, d] = String(v).split("-").map(Number); cell.value = new Date(Date.UTC(y, mo - 1, d));
        } else if (!isHead && t !== "text" && typeof v === "string" && v.trim() !== "" && Number.isFinite(+v.replace(/,/g, ""))) {
          cell.value = +v.replace(/,/g, "");
        } else cell.value = v === "" ? null : v;
        if (!isHead && FMT[t]) cell.numFmt = FMT[t];
        cell.font = { name: font, size: isHead ? 12 : 11, bold: isHead || isTotal, color: { argb: isHead ? "FFFFFFFF" : "FF1F2937" } };
        cell.alignment = { vertical: "middle", horizontal: isHead ? "center" : t === "text" ? (sheetRtl ? "right" : "left") : "center", wrapText: isHead || t === "text", readingOrder: sheetRtl ? "rtl" : "ltr" };
        cell.border = border;
        if (isHead) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
        else if (isTotal) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDF0D5" } };
        else if (r % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F6FA" } };
      });
      xr.height = isHead ? 28 : 22;
    });
    if (g.rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: g.n } };
    if (sh.note) {
      const nr = ws.getRow(g.grid.length + 2), c = nr.getCell(1);
      c.value = sh.note; c.font = { name: font, size: 10, italic: true, color: { argb: "FF6B7280" } };
      c.alignment = { horizontal: sheetRtl ? "right" : "left", readingOrder: sheetRtl ? "rtl" : "ltr" };
      if (g.n > 1) ws.mergeCells(g.grid.length + 2, 1, g.grid.length + 2, g.n);
    }
  }
  const buf = await wb.xlsx.writeBuffer();
  return { blob: new Blob([buf], { type: MIME.xlsx }), name: fileName(f, "xlsx") };
}

// ======================================================================
// PowerPoint (uses the Slides studio designer)
// ======================================================================
export async function fontsReady() {
  try { await Promise.all([document.fonts.load('500 20px "Vazirmatn"'), document.fonts.load('800 20px "Vazirmatn"'), document.fonts.load('400 20px "Vazirmatn"')]); await document.fonts.ready; } catch {}
}
function deckLayouts(f) {
  const theme = THEMES[f.theme] || THEMES.corporate, rtl = rtlOf(f);
  let date = ""; try { date = new Date().toLocaleDateString(f.lang === "en" ? "en-GB" : "ar-IQ", { year: "numeric", month: "long", day: "numeric" }); } catch {}
  return { theme, rtl, layouts: f.slides.map((sl, i) => layoutSlide(sl, theme, { rtl, index: i, total: f.slides.length, deckTitle: f.title, date })) };
}
export async function makePptx(f) {
  await fontsReady();
  const { theme, rtl, layouts } = deckLayouts(f);
  const out = await exportPptx(f, layouts, { rtl, theme, fileName: fileName(f, "x").slice(0, -2) });
  return { blob: out.blob, name: fileName(f, "pptx") };
}
export async function deckPdf(f) {
  await fontsReady();
  const { layouts } = deckLayouts(f);
  const canvases = [];
  for (const E of layouts) canvases.push(await renderSlide(E, { px: 1920 }));
  const out = await exportPdf(canvases, { fileName: fileName(f, "x").slice(0, -2) });
  return { blob: out.blob, name: fileName(f, "pdf") };
}
export async function deckThumbs(f, max = 4) {
  await fontsReady();
  const { layouts } = deckLayouts(f);
  const out = [];
  for (const E of layouts.slice(0, max)) out.push((await renderSlide(E, { px: 560 })).toDataURL("image/jpeg", 0.85));
  return out;
}

// ======================================================================
// Documents → PDF pages (drawn on canvas: Kurdish letters join correctly)
// ======================================================================
const PW = 794, PH = 1123, MARGIN = 68; // A4 at 96 dpi
const C = { text: "#1F2937", muted: "#6B7280", accent: "#1F4E78", accent2: "#C98A22", line: "#D0D7E2", zebra: "#F3F6FA", headText: "#FFFFFF" };
const FONT = '"Vazirmatn", "Noto Kufi Arabic", "Noto Sans Arabic", system-ui, sans-serif';
const plain = (t) => String(t || "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*\*/g, "");
const allBold = (t) => /^\s*\*\*[^*]+\*\*\s*$/.test(String(t || ""));
const digits = (n, lang) => (lang === "en" ? String(n) : String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]));

let mc = null;
const ctxFont = (g, size, bold) => { g.font = `${bold ? 700 : 400} ${size}px ${FONT}`; };
function measureW(t, size, bold) { if (!mc) mc = document.createElement("canvas").getContext("2d"); ctxFont(mc, size, bold); return mc.measureText(t).width; }
function wrapText(t, width, size, bold) {
  const out = [];
  for (const para of String(t).split("\n")) {
    let line = "";
    for (const w of para.split(/\s+/).filter(Boolean)) {
      const next = line ? line + " " + w : w;
      if (line && measureW(next, size, bold) > width) { out.push(line); line = w; }
      else if (!line && measureW(w, size, bold) > width) { // one very long word: cut it
        let piece = "";
        for (const ch of w) { if (measureW(piece + ch, size, bold) > width) { out.push(piece); piece = ch; } else piece += ch; }
        line = piece;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

// Lays the document out on pages: [{ ops: [...] }] (positions in page pixels).
export function layoutDoc(f) {
  const rtl = rtlOf(f), W = PW - MARGIN * 2;
  const pages = [[]];
  let y = MARGIN;
  const page = () => pages[pages.length - 1];
  const newPage = () => { pages.push([]); y = MARGIN; };
  const need = (h) => { if (y + h > PH - MARGIN - 24 && page().length) newPage(); };
  const X0 = MARGIN, X1 = PW - MARGIN; // left / right edge of the text
  const text = (t, x, yy, size, o = {}) => page().push({ k: "text", t, x, y: yy, size, bold: !!o.bold, color: o.color || C.text, align: o.align || (rtl ? "right" : "left") });
  const para = (t, size, o = {}) => {
    const bold = o.bold || allBold(t), lh = Math.round(size * (o.lh || 1.75));
    const lines = wrapText(plain(t), (o.width || W), size, bold);
    for (const l of lines) { need(lh); text(l, o.x ?? (rtl ? X1 : X0), y + size, size, { bold, color: o.color, align: o.align }); y += lh; }
  };

  if (f.title) {
    para(f.title, 28, { bold: true, color: C.accent, lh: 1.45 });
    if (f.subtitle) { y += 2; para(f.subtitle, 15, { color: C.muted, lh: 1.6 }); }
    y += 10; page().push({ k: "rect", x: rtl ? X1 - 90 : X0, y, w: 90, h: 4, fill: C.accent2 }); y += 26;
  }
  let numbered = 0;
  for (const b of f.blocks) {
    numbered = 0; // every list starts at 1
    if (b.t === "h1") { y += 14; need(60); para(b.text, 21, { bold: true, color: C.accent, lh: 1.5 }); y += 6; }
    else if (b.t === "h2") { y += 12; need(50); para(b.text, 17.5, { bold: true, color: C.accent, lh: 1.5 }); y += 4; }
    else if (b.t === "h3") { y += 8; need(44); para(b.text, 15, { bold: true, lh: 1.5 }); y += 2; }
    else if (b.t === "p") { para(b.text, 13.5); y += 8; }
    else if (b.t === "bullets" || b.t === "numbers") {
      for (const it of b.items) {
        numbered++;
        const mark = b.t === "bullets" ? "•" : digits(numbered, f.lang) + ".";
        const ind = b.t === "bullets" ? 20 : 28, size = 13.5, lh = Math.round(size * 1.75);
        const lines = wrapText(plain(it), W - ind, size, allBold(it));
        lines.forEach((l, k) => {
          need(lh);
          if (!k) text(mark, rtl ? X1 : X0, y + size, size, { bold: true, color: C.accent2 });
          text(l, rtl ? X1 - ind : X0 + ind, y + size, size, { bold: allBold(it) });
          y += lh;
        });
        y += 3;
      }
      y += 8;
    }
    else if (b.t === "quote") {
      const lines = wrapText(plain(b.text), W - 26, 14, false), lh = 25;
      const bar = (from, to) => page().push({ k: "rect", x: rtl ? X1 - 4 : X0, y: from, w: 4, h: to - from, fill: C.accent2 });
      need(Math.min(lines.length * lh + 12, 200));
      let top = y; y += 6;
      for (const l of lines) {
        if (y + lh > PH - MARGIN - 24) { bar(top, y); newPage(); top = y; }
        text(l, rtl ? X1 - 22 : X0 + 22, y + 14, 14, { color: "#374151" }); y += lh;
      }
      bar(top, y + 4);
      y += 14;
    }
    else if (b.t === "divider") { need(24); y += 8; page().push({ k: "rect", x: X0, y, w: W, h: 1, fill: C.line }); y += 16; }
    else if (b.t === "space") y += 18;
    else if (b.t === "sign") {
      y += 30; need(70);
      const w = 220, x = rtl ? X0 : X1 - w;
      page().push({ k: "rect", x, y: y + 34, w, h: 1, fill: C.text });
      text(plain(b.text), x + w / 2, y + 58, 13, { align: "center" });
      y += 74;
    }
    else if (b.t === "kv") {
      const kw = Math.min(220, Math.max(...b.items.map((it) => measureW(it.k, 13, true))) + 18);
      for (const it of b.items) {
        const lines = wrapText(it.v, W - kw, 13, false), lh = 24;
        need(lh * lines.length + 4);
        text(it.k, rtl ? X1 : X0, y + 13, 13, { bold: true, color: C.muted });
        lines.forEach((l, k) => text(l, rtl ? X1 - kw : X0 + kw, y + 13 + k * lh, 13));
        y += lh * lines.length + 4;
      }
      y += 10;
    }
    else if (b.t === "table") {
      const cols = Math.max(b.columns.length, ...b.rows.map((r) => r.length), 1);
      const size = cols > 6 ? 10.5 : 12, pad = 8;
      const want = Array.from({ length: cols }, (_, c) => Math.max(measureW(b.columns[c] || "", size, true), ...b.rows.slice(0, 60).map((r) => Math.min(260, measureW(r[c] || "", size, false)))) + pad * 2);
      const sumW = want.reduce((a, x) => a + x, 0);
      const widths = want.map((x) => Math.max(46, (x / sumW) * W));
      const k = W / widths.reduce((a, x) => a + x, 0); widths.forEach((x, i) => (widths[i] = x * k));
      const xsOf = () => { const xs = []; let x = rtl ? X1 : X0; for (const w of widths) { xs.push(rtl ? x - w : x); x += rtl ? -w : w; } return xs; };
      const xs = xsOf();
      const rowOps = (cells, head, zebra) => {
        const wrapped = widths.map((w, c) => wrapText(String(cells[c] ?? ""), w - pad * 2, size, head));
        const lh = Math.round(size * 1.6), h = Math.max(...wrapped.map((l) => l.length)) * lh + pad * 1.5;
        return { h, draw: (yy) => {
          page().push({ k: "rect", x: X0, y: yy, w: W, h, fill: head ? C.accent : zebra ? C.zebra : "#FFFFFF" });
          wrapped.forEach((lines, c) => lines.forEach((l, i) => text(l, rtl ? xs[c] + widths[c] - pad : xs[c] + pad, yy + pad * 0.9 + size + i * lh, size, { bold: head, color: head ? C.headText : C.text })));
          page().push({ k: "rect", x: X0, y: yy + h - 1, w: W, h: 1, fill: C.line });
          xs.slice(1).forEach((x, c) => page().push({ k: "rect", x: rtl ? xs[c] : x, y: yy, w: 1, h, fill: head ? "#3D6A94" : C.line }));
        } };
      };
      const head = rowOps(b.columns, true, false);
      y += 4; need(head.h * 2 + 4); head.draw(y); y += head.h;
      b.rows.forEach((r, i) => {
        const ro = rowOps(r, false, i % 2 === 1);
        if (y + ro.h > PH - MARGIN - 24) { newPage(); head.draw(y); y += head.h; }
        ro.draw(y); y += ro.h;
      });
      if (b.total) { y += 8; para(b.total, 13.5, { bold: true, color: C.accent }); }
      y += 14;
    }
  }
  return pages.map((ops) => ({ ops }));
}

export async function drawPage(pg, i, n, f, scale = 2) {
  const c = document.createElement("canvas");
  c.width = Math.round(PW * scale); c.height = Math.round(PH * scale);
  const g = c.getContext("2d");
  g.scale(scale, scale);
  g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, PW, PH);
  g.fillStyle = C.accent; g.fillRect(0, 0, PW, 6); // a thin brand line on top
  for (const o of pg.ops) {
    if (o.k === "rect") { g.fillStyle = o.fill; g.fillRect(o.x, o.y, o.w, o.h); }
    else if (o.k === "text") {
      ctxFont(g, o.size, o.bold); g.fillStyle = o.color; g.textAlign = o.align; g.direction = rtlOf(f) ? "rtl" : "ltr";
      g.fillText(o.t, o.x, o.y);
    }
  }
  if (n > 1) { ctxFont(g, 10.5, false); g.fillStyle = C.muted; g.textAlign = "center"; g.direction = "ltr"; g.fillText(`${i + 1} / ${n}`, PW / 2, PH - 30); }
  return c;
}

export async function makeDocPdf(f) {
  await fontsReady();
  const pages = layoutDoc(f);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
  for (let i = 0; i < pages.length; i++) {
    const c = await drawPage(pages[i], i, pages.length, f, 2);
    if (i) pdf.addPage("a4", "portrait");
    pdf.addImage(c.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, 595.28, 841.89, undefined, "FAST");
  }
  pdf.setProperties({ title: f.title || f.name, creator: "AHM AI" });
  return { blob: pdf.output("blob"), name: fileName(f, "pdf"), pages: pages.length };
}
export async function docThumb(f) {
  await fontsReady();
  const pages = layoutDoc(f);
  return { src: (await drawPage(pages[0], 0, pages.length, f, 0.6)).toDataURL("image/jpeg", 0.85), pages: pages.length };
}

// ======================================================================
// Word (.docx)
// ======================================================================
export async function makeDocx(f) {
  const D = await import("docx");
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ShadingType, LevelFormat, HeadingLevel, Footer, PageNumber } = D;
  const rtl = rtlOf(f);
  const font = { ascii: rtl ? "Tahoma" : "Calibri", hAnsi: rtl ? "Tahoma" : "Calibri", cs: "Tahoma" };
  const run = (text, o = {}) => new TextRun({ text, font, size: o.size || 24, sizeComplexScript: o.size || 24, bold: !!o.bold, boldComplexScript: !!o.bold, color: o.color, italics: !!o.italic, rightToLeft: rtl });
  const runs = (t, o = {}) => String(t || "").split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((part) => /^\*\*[^*]+\*\*$/.test(part) ? run(part.slice(2, -2), { ...o, bold: true }) : run(part.replace(/\*\*/g, ""), o));
  const P = (children, o = {}) => new Paragraph({ children, bidirectional: rtl, alignment: o.align || AlignmentType.START, spacing: { after: o.after ?? 140, before: o.before ?? 0, line: o.line ?? 320 }, heading: o.heading, numbering: o.numbering, border: o.border, indent: o.indent });
  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "D0D7E2" };
  const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
  const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const children = [];
  let list = 0;
  if (f.title) {
    children.push(P([run(f.title, { size: 48, bold: true, color: "1F4E78" })], { after: 80, line: 360 }));
    if (f.subtitle) children.push(P([run(f.subtitle, { size: 26, color: "6B7280" })], { after: 120 }));
    children.push(P([], { after: 240, border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: "C98A22", space: 4 } } }));
  }
  for (const b of f.blocks) {
    if (b.t === "h1") children.push(P(runs(b.text, { size: 34, bold: true, color: "1F4E78" }), { heading: HeadingLevel.HEADING_1, before: 280, after: 120 }));
    else if (b.t === "h2") children.push(P(runs(b.text, { size: 29, bold: true, color: "1F4E78" }), { heading: HeadingLevel.HEADING_2, before: 220, after: 100 }));
    else if (b.t === "h3") children.push(P(runs(b.text, { size: 25, bold: true }), { heading: HeadingLevel.HEADING_3, before: 160, after: 80 }));
    else if (b.t === "p") children.push(P(runs(b.text)));
    else if (b.t === "bullets" || b.t === "numbers") {
      list++;
      for (const it of b.items) children.push(P(runs(it), { after: 80, numbering: { reference: b.t === "bullets" ? "ahm-bullets" : "ahm-numbers", level: 0, instance: list } }));
    }
    else if (b.t === "quote") children.push(P(runs(b.text, { italic: true, color: "374151" }), { indent: { start: 360 }, border: { [rtl ? "right" : "left"]: { style: BorderStyle.SINGLE, size: 24, color: "C98A22", space: 10 } } }));
    else if (b.t === "divider") children.push(P([], { border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "D0D7E2", space: 4 } } }));
    else if (b.t === "space") children.push(P([run("")]));
    else if (b.t === "sign") { children.push(P([run("")], { before: 480 })); children.push(P([run("____________________")], { align: rtl ? AlignmentType.LEFT : AlignmentType.RIGHT, after: 40 })); children.push(P(runs(b.text), { align: rtl ? AlignmentType.LEFT : AlignmentType.RIGHT })); }
    else if (b.t === "kv") {
      children.push(new Table({ visuallyRightToLeft: rtl, width: { size: 100, type: WidthType.PERCENTAGE },
        rows: b.items.map((it) => new TableRow({ children: [
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }, children: [P([run(it.k, { bold: true, color: "6B7280" })], { after: 60 })] }),
          new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }, children: [P(runs(it.v), { after: 60 })] }),
        ] })) }));
      children.push(P([run("")], { after: 80 }));
    }
    else if (b.t === "table") {
      const cols = Math.max(b.columns.length, ...b.rows.map((r) => r.length), 1);
      const cellP = (t, head) => P(head ? [run(t, { bold: true, color: "FFFFFF", size: 22 })] : runs(t, { size: 22 }), { after: 40, line: 280, align: head ? AlignmentType.CENTER : AlignmentType.START });
      const row = (cells, head, zebra) => new TableRow({ tableHeader: head, children: Array.from({ length: cols }, (_, c) => new TableCell({ borders,
        shading: head ? { type: ShadingType.CLEAR, color: "auto", fill: "1F4E78" } : zebra ? { type: ShadingType.CLEAR, color: "auto", fill: "F3F6FA" } : undefined,
        margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [cellP(String(cells[c] ?? ""), head)] })) });
      children.push(new Table({ visuallyRightToLeft: rtl, width: { size: 100, type: WidthType.PERCENTAGE }, rows: [row(b.columns, true, false), ...b.rows.map((r, i) => row(r, false, i % 2 === 1))] }));
      if (b.total) children.push(P(runs(b.total, { bold: true, color: "1F4E78" }), { before: 100 }));
      children.push(P([run("")], { after: 80 }));
    }
  }
  const level = (format, text) => [{ level: 0, format, text, alignment: AlignmentType.START, style: { paragraph: { indent: { start: 540, hanging: 300 } }, run: { font, color: "C98A22", bold: true } } }];
  const doc = new Document({
    creator: "AHM AI", title: f.title || f.name,
    styles: { default: { document: { run: { font, size: 24, sizeComplexScript: 24 } } } },
    numbering: { config: [{ reference: "ahm-bullets", levels: level(LevelFormat.BULLET, "•") }, { reference: "ahm-numbers", levels: level(LevelFormat.DECIMAL, "%1.") }] },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font, size: 18, color: "6B7280" })] })] }) },
      children,
    }],
  });
  const blob = await Packer.toBlob(doc);
  return { blob: new Blob([blob], { type: MIME.docx }), name: fileName(f, "docx") };
}

// ======================================================================
// Which files a card offers, and handing a file to the user
// ======================================================================
export const FORMATS = { xlsx: ["xlsx"], pptx: ["pptx", "pdf"], docx: ["docx", "pdf"], pdf: ["pdf", "docx"] };
export async function makeFormat(f, fmt) {
  if (fmt === "xlsx") return makeXlsx(f);
  if (fmt === "pptx") return makePptx(f);
  if (fmt === "docx") return makeDocx(f);
  if (fmt === "pdf") return f.type === "pptx" ? deckPdf(f) : makeDocPdf(f);
  throw new Error("format");
}

// iPhone / Android: the share sheet ("Save to Files", open in Excel / Word…); computer: a normal download.
export async function deliver({ blob, name }) {
  const mobile = typeof navigator !== "undefined" && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform || "")));
  if (mobile && typeof File !== "undefined" && navigator.canShare) {
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return "shared"; }
      catch (e) { if (e?.name === "AbortError") return "cancel"; }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 8000);
  return "download";
}
