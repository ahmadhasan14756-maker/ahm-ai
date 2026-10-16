// AHM AI presentation designer — one layout for every slide, drawn two ways:
//   • on a canvas (preview + PDF), and
//   • as real PowerPoint shapes, text boxes and charts (editable .pptx).
// Sizes are in inches on a 16:9 slide (13.333 × 7.5). Text is measured once, so both outputs look the same.
// Works right-to-left for Kurdish and Arabic. Browser only.

export const SW = 13.333, SH = 7.5;

export const THEMES = {
  noir: { name: { ckb: "زێڕی شەو", ar: "ذهبي ليلي", en: "Noir gold" }, bg: "0B0D12", bg2: "151923", surface: "1A1F2B", text: "F4F1EA", muted: "A9A8A3", accent: "E8B14D", accent2: "C98A22", dark: true },
  ocean: { name: { ckb: "دەریا", ar: "المحيط", en: "Ocean" }, bg: "0A1A2F", bg2: "0F2A47", surface: "13345A", text: "F1F6FB", muted: "9FB6CC", accent: "2DD4BF", accent2: "38BDF8", dark: true },
  minimal: { name: { ckb: "سادە و سپی", ar: "بسيط أبيض", en: "Clean white" }, bg: "FFFFFF", bg2: "F3F4F6", surface: "F5F6F8", text: "111827", muted: "6B7280", accent: "2563EB", accent2: "1E40AF", dark: false },
  kurd: { name: { ckb: "سەوز و خۆر", ar: "أخضر وشمس", en: "Green & sun" }, bg: "F7F9F6", bg2: "E8F0E6", surface: "FFFFFF", text: "10291F", muted: "557064", accent: "0E5A3F", accent2: "F2B01E", dark: false },
  sunset: { name: { ckb: "ئاوابوون", ar: "الغروب", en: "Sunset" }, bg: "1F1023", bg2: "3A1530", surface: "3B1A35", text: "FFF4EC", muted: "E3B9AE", accent: "FB923C", accent2: "F43F5E", dark: true },
  royal: { name: { ckb: "شاهانە", ar: "ملكي", en: "Royal" }, bg: "140F2E", bg2: "231A4F", surface: "2A2160", text: "F5F3FF", muted: "B9B2E6", accent: "A78BFA", accent2: "F0ABFC", dark: true },
};

const FONT = 'Vazirmatn, "Noto Kufi Arabic", "Noto Sans Arabic", sans-serif';
const PPT_FONT_RTL = "Tahoma"; // on almost every Windows / Mac, supports Kurdish and Arabic letters
const PPT_FONT_LTR = "Segoe UI";

// ---------- text measuring (in points; 72 pt = 1 inch) ----------
let mctx = null;
function measure(text, pt, bold) {
  if (!mctx) mctx = document.createElement("canvas").getContext("2d");
  mctx.font = `${bold ? 800 : 500} ${pt}px ${FONT}`;
  return mctx.measureText(text).width; // pt
}
function wrap(text, wIn, pt, bold) {
  const max = wIn * 72 * 0.9; // a little room: PowerPoint fonts are a bit wider
  const out = [];
  for (const para of String(text || "").split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? line + " " + word : word;
      if (line && measure(next, pt, bold) > max) { out.push(line); line = word; } else line = next;
    }
    out.push(line);
  }
  return out;
}
const LH = 1.32;
// Biggest size (≤ maxPt) at which the text fits the box.
function fit(text, wIn, hIn, maxPt, minPt = 12, bold = false) {
  for (let pt = maxPt; pt >= minPt; pt -= 1) {
    const lines = wrap(text, wIn, pt, bold);
    if (lines.length * pt * LH <= hIn * 72) return { pt, lines };
  }
  return { pt: minPt, lines: wrap(text, wIn, minPt, bold) };
}
function fitList(items, wIn, hIn, maxPt, minPt = 12, gap = 0.55) {
  for (let pt = maxPt; pt >= minPt; pt -= 1) {
    const all = items.map((t) => wrap(t, wIn - (pt * 1.4) / 72, pt, false));
    const h = all.reduce((n, l) => n + l.length * pt * LH, 0) + (items.length - 1) * pt * gap;
    if (h <= hIn * 72) return { pt, all };
  }
  return { pt: minPt, all: items.map((t) => wrap(t, wIn - (minPt * 1.4) / 72, minPt, false)) };
}
const clean = (s, n = 400) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const list = (a, n = 6, m = 220) => (Array.isArray(a) ? a.map((x) => clean(x, m)).filter(Boolean).slice(0, n) : []);

// ---------- layout: slide JSON → elements ----------
export function layoutSlide(sl, theme, { rtl, index, total, deckTitle, image }) {
  const T = theme, E = [];
  const X = (x, w) => (rtl ? SW - x - w : x); // mirror for right-to-left
  const align = rtl ? "right" : "left";
  const M = 0.75; // page margin
  const text = (t, x, y, w, h, maxPt, o = {}) => {
    if (!clean(t)) return null;
    const f = fit(clean(t, o.limit || 400), w, h, maxPt, o.minPt || 12, !!o.bold);
    const el = { k: "text", x: X(x, w), y, w, h, pt: f.pt, lines: f.lines, text: clean(t, o.limit || 400), bold: !!o.bold, color: o.color || T.text, align: o.align || align, valign: o.valign || "top" };
    E.push(el); return el;
  };
  const bullets = (items, x, y, w, h, maxPt, o = {}) => {
    const its = list(items, o.max || 6);
    if (!its.length) return;
    const f = fitList(its, w, h, maxPt, o.minPt || 13);
    E.push({ k: "bullets", x: X(x, w), y, w, h, pt: f.pt, items: its, lines: f.all, color: o.color || T.text, dot: o.dot || T.accent, align });
  };
  const rect = (x, y, w, h, fill, o = {}) => E.push({ k: "rect", x: X(x, w), y, w, h, fill, alpha: o.alpha ?? 1, r: o.r || 0 });
  const blob = (x, y, d, fill, alpha) => E.push({ k: "ellipse", x: X(x, d), y, w: d, h: d, fill, alpha });

  // background + quiet decoration (same idea on every slide, so the deck feels like one design)
  E.push({ k: "bg", fill: T.bg, fill2: T.bg2 });
  const L = sl.layout;
  const hero = L === "title" || L === "section" || L === "closing";
  if (hero) { blob(SW - 4.2, -1.6, 6.2, T.accent, 0.13); blob(-1.4, SH - 2.6, 4, T.accent2, 0.12); }
  else { rect(0, 0, 0.14, SH, T.accent); blob(SW - 2.2, -1.3, 3.2, T.accent, 0.08); }

  const title = (t, y = 0.5, h = 1.15, maxPt = 40) => text(t, M, y, SW - 2 * M, h, maxPt, { bold: true, limit: 140 });
  const footer = () => {
    if (hero) return;
    E.push({ k: "text", x: X(M, 7), y: SH - 0.5, w: 7, h: 0.32, pt: 10, lines: [clean(deckTitle, 80)], text: clean(deckTitle, 80), color: T.muted, align, valign: "middle" });
    E.push({ k: "text", x: X(SW - M - 1.2, 1.2), y: SH - 0.5, w: 1.2, h: 0.32, pt: 11, lines: [`${index + 1} / ${total}`], text: `${index + 1} / ${total}`, color: T.muted, align: rtl ? "left" : "right", valign: "middle", ltr: true });
  };

  switch (L) {
    case "title": {
      const w = image ? 6.4 : SW - 2 * M;
      if (image) E.push({ k: "image", x: X(SW - M - 5.2, 5.2), y: 1.05, w: 5.2, h: 5.4, src: image, r: 0.3 });
      if (sl.kicker) text(sl.kicker, M, 1.35, w, 0.5, 18, { color: T.accent, bold: true, limit: 80 });
      const tl = text(sl.title, M, 1.95, w, 2.6, 54, { bold: true, limit: 140, valign: "bottom" });
      rect(M, 4.75, 1.4, 0.09, T.accent);
      text(sl.subtitle, M, 5.05, w, 1.4, 26, { color: T.muted, limit: 220 });
      if (!tl) title(sl.title);
      break;
    }
    case "section": {
      text(String(sl.number || "").slice(0, 3) || String(index + 1).padStart(2, "0"), M, 1.6, 4, 1.6, 96, { bold: true, color: T.accent, limit: 4 });
      text(sl.title, M, 3.25, SW - 2 * M, 1.6, 48, { bold: true, limit: 120 });
      text(sl.subtitle, M, 4.9, SW - 2 * M - 2, 1.2, 22, { color: T.muted, limit: 220 });
      break;
    }
    case "closing": {
      text(sl.title, M, 2.1, SW - 2 * M, 1.8, 60, { bold: true, align: "center", valign: "middle", limit: 80 });
      E[E.length - 1] && (E[E.length - 1].x = M);
      rect((SW - 1.6) / 2, 4.05, 1.6, 0.09, T.accent);
      const s = text(sl.subtitle, M, 4.4, SW - 2 * M, 1.4, 24, { color: T.muted, align: "center", limit: 240 });
      if (s) s.x = M;
      break;
    }
    case "cards": {
      title(sl.title);
      const cs = (Array.isArray(sl.cards) ? sl.cards : []).slice(0, 4);
      const n = Math.max(1, cs.length), gap = 0.3, cw = (SW - 2 * M - gap * (n - 1)) / n, cy = 1.95, ch = 4.6;
      cs.forEach((c, i) => {
        const x = M + i * (cw + gap);
        rect(x, cy, cw, ch, T.surface, { r: 0.18 });
        rect(x, cy, cw, 0.08, T.accent);
        if (c.icon) text(String(c.icon).slice(0, 4), x + 0.35, cy + 0.4, 1, 0.85, 40, { limit: 4 });
        text(c.title, x + 0.35, cy + 1.35, cw - 0.7, 1, 28, { bold: true, limit: 80 });
        text(c.text, x + 0.35, cy + 2.45, cw - 0.7, ch - 2.7, 22, { color: T.muted, limit: 260 });
      });
      break;
    }
    case "two": {
      title(sl.title);
      const gap = 0.4, cw = (SW - 2 * M - gap) / 2, cy = 1.95, ch = 4.75;
      [sl.left, sl.right].forEach((col, i) => {
        if (!col) return;
        const x = M + i * (cw + gap);
        rect(x, cy, cw, ch, T.surface, { r: 0.18 });
        text(col.title, x + 0.4, cy + 0.3, cw - 0.8, 0.85, 30, { bold: true, color: i ? T.accent2 : T.accent, limit: 80 });
        bullets(col.bullets, x + 0.4, cy + 1.3, cw - 0.8, ch - 1.55, 24, { max: 5 });
      });
      break;
    }
    case "stats": {
      title(sl.title);
      const ss = (Array.isArray(sl.stats) ? sl.stats : []).slice(0, 4);
      const n = Math.max(1, ss.length), gap = 0.3, cw = (SW - 2 * M - gap * (n - 1)) / n, cy = 2.2, ch = 3.2;
      ss.forEach((s, i) => {
        const x = M + i * (cw + gap);
        rect(x, cy, cw, ch, T.surface, { r: 0.18 });
        const v = text(s.value, x + 0.3, cy + 0.35, cw - 0.6, 1.5, 60, { bold: true, color: T.accent, align: "center", valign: "middle", limit: 14 });
        if (v) v.ltr = /^[\d\s.,%$+\-×xkmKMB]+$/.test(clean(s.value));
        text(s.label, x + 0.3, cy + 1.95, cw - 0.6, 1.1, 22, { color: T.muted, align: "center", limit: 90 });
      });
      text(sl.text, M, 5.75, SW - 2 * M, 0.9, 20, { color: T.muted, limit: 220 });
      break;
    }
    case "chart": {
      title(sl.title);
      const c = sl.chart || {};
      const labels = list(c.labels, 8, 30), values = (Array.isArray(c.values) ? c.values : []).slice(0, labels.length).map(Number).filter((v) => Number.isFinite(v));
      const hasText = !!clean(sl.text) || list(sl.bullets).length;
      const cw = hasText ? 7.6 : SW - 2 * M;
      if (labels.length && values.length === labels.length) {
        rect(M, 1.85, cw, 4.9, T.surface, { r: 0.18 });
        E.push({ k: "chart", x: X(M + 0.25, cw - 0.5), y: 2.05, w: cw - 0.5, h: 4.5, type: ["bar", "pie", "line"].includes(c.type) ? c.type : "bar", labels, values, unit: clean(c.unit, 12), colors: [T.accent, T.accent2, T.muted, T.text], text: T.text, muted: T.muted, rtl });
      }
      if (hasText) {
        const x = M + cw + 0.4, w = SW - M - x;
        if (clean(sl.text)) text(sl.text, x, 1.95, w, 1.9, 26, { bold: true, limit: 200 });
        bullets(sl.bullets, x, clean(sl.text) ? 4 : 1.95, w, clean(sl.text) ? 2.7 : 4.7, 21, { max: 4 });
      }
      break;
    }
    case "timeline": {
      title(sl.title);
      const st = (Array.isArray(sl.steps) ? sl.steps : []).slice(0, 6);
      const n = Math.max(1, st.length), w = SW - 2 * M, y = 3.85;
      rect(M, y - 0.03, w, 0.06, T.muted, { alpha: 0.6 });
      st.forEach((s, i) => {
        const cx = M + (w / n) * (i + 0.5), up = i % 2 === 0;
        const bx = cx - (w / n) / 2 + 0.1, bw = w / n - 0.2;
        E.push({ k: "ellipse", x: X(cx - 0.17, 0.34), y: y - 0.17, w: 0.34, h: 0.34, fill: T.accent, alpha: 1 });
        text(s.when, bx, up ? 1.95 : 4.2, bw, 0.65, 24, { bold: true, color: T.accent, align: "center", limit: 30 });
        text(s.what, bx, up ? 2.6 : 4.85, bw, 1.15, 19, { align: "center", limit: 120 });
      });
      break;
    }
    case "quote": {
      text("“", M, 0.9, 2, 1.8, 140, { bold: true, color: T.accent, limit: 2 });
      text(sl.quote || sl.title, M + 0.4, 2.35, SW - 2 * M - 0.8, 2.9, 44, { bold: true, limit: 300 });
      text(sl.author ? "— " + sl.author : "", M + 0.4, 5.45, SW - 2 * M - 0.8, 0.7, 20, { color: T.accent, limit: 80 });
      break;
    }
    default: { // "bullets" and "image": text on one side, a picture on the other when there is one
      title(sl.title);
      const withImg = !!image;
      const tw = withImg ? 6.6 : SW - 2 * M;
      if (withImg) E.push({ k: "image", x: X(SW - M - 5.1, 5.1), y: 1.85, w: 5.1, h: 4.9, src: image, r: 0.25 });
      if (clean(sl.text)) {
        text(sl.text, M, 1.9, tw, 1.2, 24, { color: T.muted, limit: 260 });
        bullets(sl.bullets, M, 3.2, tw, 3.55, 28);
      } else bullets(sl.bullets, M, 1.95, tw, 4.75, 30);
    }
  }
  footer();
  return E;
}

// ---------- canvas renderer (preview + PDF) ----------
const hex = (h, a = 1) => { const n = parseInt(h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const loadImg = (src) => new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = src; });

export async function renderSlide(E, { px = 1600 } = {}) {
  const s = px / SW, c = document.createElement("canvas");
  c.width = Math.round(SW * s); c.height = Math.round(SH * s);
  const g = c.getContext("2d");
  for (const e of E) {
    if (e.k === "bg") {
      const gr = g.createLinearGradient(0, 0, c.width, c.height); gr.addColorStop(0, hex(e.fill)); gr.addColorStop(1, hex(e.fill2));
      g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    } else if (e.k === "rect") {
      g.fillStyle = hex(e.fill, e.alpha); g.beginPath(); g.roundRect(e.x * s, e.y * s, e.w * s, e.h * s, (e.r || 0) * s); g.fill();
    } else if (e.k === "ellipse") {
      g.fillStyle = hex(e.fill, e.alpha); g.beginPath(); g.ellipse((e.x + e.w / 2) * s, (e.y + e.h / 2) * s, (e.w / 2) * s, (e.h / 2) * s, 0, 0, Math.PI * 2); g.fill();
    } else if (e.k === "image") {
      try {
        const im = await loadImg(e.src);
        const k = Math.max((e.w * s) / im.width, (e.h * s) / im.height), sw = (e.w * s) / k, sh = (e.h * s) / k;
        g.save(); g.beginPath(); g.roundRect(e.x * s, e.y * s, e.w * s, e.h * s, (e.r || 0) * s); g.clip();
        g.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, e.x * s, e.y * s, e.w * s, e.h * s); g.restore();
      } catch {}
    } else if (e.k === "text") {
      const pt = e.pt * (s / 72);
      g.font = `${e.bold ? 800 : 500} ${pt}px ${FONT}`; g.fillStyle = hex(e.color); g.textBaseline = "middle";
      g.direction = e.ltr ? "ltr" : e.align === "right" ? "rtl" : "ltr";
      const lh = pt * LH, total = e.lines.length * lh;
      let y = e.y * s + (e.valign === "middle" ? (e.h * s - total) / 2 : e.valign === "bottom" ? e.h * s - total : 0) + lh / 2;
      const x = e.align === "center" ? (e.x + e.w / 2) * s : e.align === "right" ? (e.x + e.w) * s : e.x * s;
      g.textAlign = e.align === "center" ? "center" : e.align === "right" ? (g.direction === "rtl" ? "start" : "right") : (g.direction === "rtl" ? "end" : "left");
      for (const ln of e.lines) { g.fillText(ln, x, y); y += lh; }
    } else if (e.k === "bullets") {
      const pt = e.pt * (s / 72), lh = pt * LH, rtl = e.align === "right";
      g.font = `500 ${pt}px ${FONT}`; g.textBaseline = "middle"; g.direction = rtl ? "rtl" : "ltr";
      let y = e.y * s + lh / 2;
      const ind = pt * 1.4;
      e.lines.forEach((ls) => {
        g.fillStyle = hex(e.dot); g.beginPath();
        g.arc(rtl ? (e.x + e.w) * s - pt * 0.35 : e.x * s + pt * 0.35, y, pt * 0.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = hex(e.color); g.textAlign = rtl ? "start" : "left";
        for (const ln of ls) { g.fillText(ln, rtl ? (e.x + e.w) * s - ind : e.x * s + ind, y); y += lh; }
        y += pt * 0.55;
      });
    } else if (e.k === "chart") drawChart(g, e, s);
  }
  return c;
}

function drawChart(g, e, s) {
  const x = e.x * s, y = e.y * s, w = e.w * s, h = e.h * s, n = e.values.length;
  const max = Math.max(...e.values, 0) || 1;
  const fs = Math.max(11, Math.min(18, w / (n * 5))) * (s / 72) * 1.6;
  g.font = `600 ${fs}px ${FONT}`; g.textBaseline = "middle";
  const cols = e.colors.map((c) => hex(c));
  if (e.type === "pie") {
    const r = Math.min(w * 0.55, h) / 2 - 10, cx = x + (e.rtl ? w - r - 20 : r + 20), cy = y + h / 2;
    const sum = e.values.reduce((a, b) => a + Math.max(0, b), 0) || 1;
    let a0 = -Math.PI / 2;
    e.values.forEach((v, i) => {
      const a1 = a0 + (Math.max(0, v) / sum) * Math.PI * 2;
      g.fillStyle = i < 2 ? cols[i] : hex(e.colors[i % 2], 0.35 + 0.65 * ((i * 37) % 10) / 10); g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a0, a1); g.closePath(); g.fill();
      a0 = a1;
    });
    const lx = e.rtl ? x + 10 : x + r * 2 + 50, lw = w - r * 2 - 70;
    e.labels.forEach((lb, i) => {
      const ly = y + 30 + i * fs * 1.9;
      g.fillStyle = i < 2 ? cols[i] : hex(e.colors[i % 2], 0.35 + 0.65 * ((i * 37) % 10) / 10);
      g.fillRect(e.rtl ? lx + lw - fs : lx, ly - fs / 2, fs, fs);
      g.fillStyle = hex(e.text); g.direction = e.rtl ? "rtl" : "ltr"; g.textAlign = e.rtl ? "start" : "left";
      g.fillText(`${lb} — ${e.values[i]}${e.unit || ""}`, e.rtl ? lx + lw - fs * 1.6 : lx + fs * 1.6, ly);
    });
    return;
  }
  const pad = fs * 2.2, bw = (w - pad) / n, base = y + h - pad;
  g.strokeStyle = hex(e.muted, 0.4); g.lineWidth = 1;
  for (let i = 0; i <= 4; i++) { const yy = base - ((h - pad * 1.6) * i) / 4; g.beginPath(); g.moveTo(x + pad * 0.5, yy); g.lineTo(x + w, yy); g.stroke(); }
  const order = e.rtl ? [...e.values.keys()].reverse() : [...e.values.keys()];
  const pts = [];
  order.forEach((i, k) => {
    const v = e.values[i], bh = ((h - pad * 1.6) * Math.max(0, v)) / max, bx = x + pad * 0.5 + k * bw + bw * 0.18;
    if (e.type === "bar") { g.fillStyle = cols[0]; g.beginPath(); g.roundRect(bx, base - bh, bw * 0.64, bh, [6, 6, 0, 0]); g.fill(); }
    pts.push([bx + bw * 0.32, base - bh]);
    g.fillStyle = hex(e.text); g.textAlign = "center"; g.direction = "ltr";
    g.fillText(`${v}${e.unit || ""}`, bx + bw * 0.32, base - bh - fs * 0.8);
    g.fillStyle = hex(e.muted); g.direction = e.rtl ? "rtl" : "ltr";
    g.fillText(e.labels[i].slice(0, 16), bx + bw * 0.32, base + fs * 0.9);
  });
  if (e.type === "line") {
    g.strokeStyle = cols[0]; g.lineWidth = 4; g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke();
    g.fillStyle = cols[1]; pts.forEach(([px, py]) => { g.beginPath(); g.arc(px, py, 7, 0, Math.PI * 2); g.fill(); });
  }
}

// ---------- PowerPoint export (real, editable shapes) ----------
export async function exportPptx(deck, layouts, { rtl, theme, fileName }) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const p = new PptxGenJS();
  p.layout = "LAYOUT_WIDE"; // 13.333 × 7.5 in
  p.rtlMode = !!rtl;
  p.title = clean(deck.title, 120); p.author = "AHM AI"; p.company = "AHM AI";
  const font = rtl ? PPT_FONT_RTL : PPT_FONT_LTR;
  const lang = rtl ? "ar-IQ" : "en-US";
  deck.slides.forEach((sl, i) => {
    const s = p.addSlide();
    s.background = { color: theme.bg };
    for (const e of layouts[i]) {
      if (e.k === "rect") s.addShape(e.r ? p.ShapeType.roundRect : p.ShapeType.rect, { x: e.x, y: e.y, w: e.w, h: e.h, fill: { color: e.fill, transparency: Math.round((1 - e.alpha) * 100) }, line: { type: "none" }, ...(e.r ? { rectRadius: Math.min(0.5, e.r / Math.min(e.w, e.h)) } : {}) });
      else if (e.k === "ellipse") s.addShape(p.ShapeType.ellipse, { x: e.x, y: e.y, w: e.w, h: e.h, fill: { color: e.fill, transparency: Math.round((1 - e.alpha) * 100) }, line: { type: "none" } });
      else if (e.k === "image") s.addImage({ data: e.src, x: e.x, y: e.y, w: e.w, h: e.h, sizing: { type: "cover", w: e.w, h: e.h } });
      else if (e.k === "text") s.addText(e.text, {
        x: e.x, y: e.y, w: e.w, h: e.h, fontFace: font, fontSize: e.pt, bold: e.bold, color: e.color, align: e.align, valign: e.valign,
        rtlMode: !!rtl && !e.ltr, lang, margin: 0, lineSpacingMultiple: 1.1, fit: "shrink", autoFit: false,
      });
      else if (e.k === "bullets") s.addText(e.items.map((t) => ({ text: t, options: { bullet: { indent: e.pt * 1.1 }, breakLine: true, paraSpaceAfter: e.pt * 0.5 } })), {
        x: e.x, y: e.y, w: e.w, h: e.h, fontFace: font, fontSize: e.pt, color: e.color, align: e.align, valign: "top", rtlMode: !!rtl, lang, margin: 0, lineSpacingMultiple: 1.1, fit: "shrink",
      });
      else if (e.k === "chart") {
        const type = e.type === "pie" ? p.ChartType.pie : e.type === "line" ? p.ChartType.line : p.ChartType.bar;
        s.addChart(type, [{ name: clean(deck.slides[i].title, 60) || "data", labels: e.labels, values: e.values }], {
          x: e.x, y: e.y, w: e.w, h: e.h, chartColors: e.type === "pie" ? [theme.accent, theme.accent2, theme.muted, "8FA3B8", "D9C08A", "6EE7B7", "F9A8D4", "A5B4FC"] : [theme.accent],
          barDir: "col", showValue: true, dataLabelColor: theme.text, dataLabelFontSize: 12, catAxisLabelColor: theme.muted, valAxisLabelColor: theme.muted,
          valGridLine: { color: theme.muted, size: 0.5, style: "dash" }, catAxisLabelFontFace: font, legendFontFace: font, legendColor: theme.text,
          showLegend: e.type === "pie", legendPos: "r", catAxisOrientation: rtl ? "maxMin" : "minMax", lineSize: 3, lineDataSymbolSize: 9,
        });
      }
    }
    if (sl.notes) s.addNotes(clean(sl.notes, 2000));
  });
  return p.write({ outputType: "blob", compression: true }).then((blob) => ({ blob, name: (fileName || "AHM-AI-presentation") + ".pptx" }));
}

// ---------- PDF export (sharp slide pictures, one page per slide) ----------
export async function exportPdf(canvases, { fileName }) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "in", format: [SW, SH], compress: true });
  canvases.forEach((c, i) => {
    if (i) pdf.addPage([SW, SH], "landscape");
    pdf.addImage(c.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, SW, SH, undefined, "FAST");
  });
  return { blob: pdf.output("blob"), name: (fileName || "AHM-AI-presentation") + ".pdf" };
}

// ---------- read an uploaded file in the browser ----------
// Returns { text } for PowerPoint / Word / text files, or { pdf: base64 } for PDF (the AI reads PDFs itself).
export async function readSource(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    if (file.size > 3_000_000) throw new Error("pdf_big"); // the request to the server must stay under 4.5 MB
    const buf = new Uint8Array(await file.arrayBuffer());
    let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { pdf: btoa(bin), name: file.name };
  }
  if (/\.(txt|md|csv)$/.test(name)) return { text: (await file.text()).slice(0, 60000), name: file.name };
  if (!/\.(pptx|docx)$/.test(name)) throw new Error("bad_type");
  if (file.size > 40_000_000) throw new Error("too_big");
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(file);
  const xmlText = (xml) => xml.split(/<\/a:p>|<\/w:p>/).map((p) => [...p.matchAll(/<(?:a|w):t[^>]*>([^<]*)<\/(?:a|w):t>/g)].map((m) => m[1]).join("")).map((s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim()).filter(Boolean);
  if (name.endsWith(".docx")) {
    const doc = await zip.file("word/document.xml")?.async("string");
    if (!doc) throw new Error("bad_type");
    return { text: xmlText(doc).join("\n").slice(0, 60000), name: file.name };
  }
  const slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f)).sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);
  if (!slides.length) throw new Error("bad_type");
  const parts = [];
  for (const [i, f] of slides.entries()) {
    const lines = xmlText(await zip.file(f).async("string"));
    const notesFile = zip.file(f.replace("slides/slide", "notesSlides/notesSlide"));
    const notes = notesFile ? xmlText(await notesFile.async("string")).filter((l) => !/^\d+$/.test(l)).join(" ") : "";
    parts.push(`--- Slide ${i + 1} ---\n${lines.join("\n")}${notes ? `\n(Notes: ${notes})` : ""}`);
  }
  return { text: parts.join("\n\n").slice(0, 60000), name: file.name, count: slides.length };
}
