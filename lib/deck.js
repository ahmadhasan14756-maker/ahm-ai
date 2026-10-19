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
  // professional company styles
  corporate: { name: { ckb: "کۆمپانیا", ar: "شركات", en: "Corporate" }, deco: "corporate", pro: true, bg: "FFFFFF", bg2: "F4F7FB", surface: "EEF3F9", text: "0F2340", muted: "5B6B85", accent: "2563EB", accent2: "0F2A5C", dark: false },
  consult: { name: { ckb: "ڕاوێژکاری", ar: "استشاري", en: "Consulting" }, deco: "consult", pro: true, bg: "FAFAF7", bg2: "F2F1EC", surface: "FFFFFF", text: "111111", muted: "5F5F5F", accent: "111111", accent2: "C2410C", dark: false },
  tech: { name: { ckb: "تەکنەلۆژیا", ar: "تقنية", en: "Tech" }, deco: "tech", pro: true, bg: "070A14", bg2: "0E1326", surface: "141A31", text: "F1F5FF", muted: "9CA3AF", accent: "818CF8", accent2: "22D3EE", dark: true },
  sunrise: { name: { ckb: "کوردی (خۆرهەڵات)", ar: "كردي (شروق)", en: "Kurdish sunrise" }, deco: "sunrise", pro: true, bg: "14161D", bg2: "3A2612", surface: "221F1C", text: "FFF3D6", muted: "D9BF8F", accent: "F2B01E", accent2: "FEBD11", dark: true },
};

// A brand colour from the user replaces the theme's main colour.
export function brandTheme(theme, brand) {
  const h = String(brand || "").replace("#", "").toUpperCase();
  return /^[0-9A-F]{6}$/.test(h) ? { ...theme, accent: h } : theme;
}

// ---------- professional line icons (24×24, drawn with lines) ----------
export const ICONS = {
  rocket: "M14 4c3.3-1 5.6-.6 6 0 .6.4 1 2.7 0 6l-6.5 6.5-6-6z M7.5 10.5L4 11l3-4 4.5-.5 M13.5 16.5L13 20l4-3 .5-4.5",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4",
  chart: "M4 20h16 M7 16v-5 M12 16V6 M17 16v-8",
  trend: "M3 17l6-6 4 4 8-8 M15 7h6v6",
  users: "M9 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z M3 20c.6-3.4 3-5 6-5s5.4 1.6 6 5 M17 11.5a2.5 2.5 0 1 0 0-5 M16 14.5c2.6 0 4.4 1.5 5 4.5",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 12.4v-.8",
  idea: "M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z",
  money: "M3 7h18v10H3z M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M6 10v4 M18 10v4",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c2.6 2.7 2.6 15.3 0 18 M12 3c-2.6 2.7-2.6 15.3 0 18",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z",
  check: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M8 12l3 3 5-6",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z M4 21V5 M8 7h7",
  education: "M2 9l10-5 10 5-10 5z M6 11v5c3 2 9 2 12 0v-5",
  leaf: "M5 19c0-9 6-14 15-14 0 9-5 15-14 15 M5 19l7-7",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 2.5v2 M12 19.5v2 M2.5 12h2 M19.5 12h2 M5.3 5.3l1.4 1.4 M17.3 17.3l1.4 1.4 M5.3 18.7l1.4-1.4 M17.3 6.7l1.4-1.4",
  energy: "M13 3L5 14h6l-1 7 8-11h-6z",
  phone: "M7 2.5h10v19H7z M11 18h2",
  laptop: "M5 5h14v10H5z M3 19h18",
  cloud: "M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z",
  lock: "M6 11h12v9H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  home: "M4 11l8-7 8 7 M6 10v10h12V10 M10 20v-5h4v5",
  building: "M5 21V4h10v17 M15 9h4v12 M3 21h18 M8 8h2 M8 12h2 M8 16h2",
  truck: "M3 6h11v10H3z M14 10h4l3 3v3h-7 M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  cart: "M3 4h2l2.5 11h10L20 7H6.5 M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M17 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  chat: "M4 5h16v11H9l-5 4z M8 9.5h8 M8 12.5h5",
  mail: "M3 6h18v12H3z M3 7l9 6 9-6",
  calendar: "M4 5h16v15H4z M4 10h16 M8 3v4 M16 3v4",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M12 2.5v3 M12 18.5v3 M2.5 12h3 M18.5 12h3 M5.3 5.3l2.1 2.1 M16.6 16.6l2.1 2.1 M5.3 18.7l2.1-2.1 M16.6 7.4l2.1-2.1",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z M15.5 15.5L21 21",
  health: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6z",
  handshake: "M3 12l4-4 4 2 3-2 7 4 M3 12l5 5 2-1 2 2 2-1 2 1 4-4 M10 10l3 3",
  award: "M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M8.5 14L7 21l5-3 5 3-1.5-7",
  location: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  code: "M8 8l-4 4 4 4 M16 8l4 4-4 4 M13.5 5l-3 14",
  water: "M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z",
  factory: "M3 21V10l6 4V10l6 4V6h6v15z",
  people: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c.8-4 4-6 8-6s7.2 2 8 6",
  growth: "M4 20V10 M10 20V4 M16 20v-7 M3 20h18",
};
export const ICON_NAMES = Object.keys(ICONS);

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
export function layoutSlide(sl, theme, { rtl, index, total, deckTitle, image, logo, date }) {
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
  const icon = (name, x, y, d, o = {}) => {
    const key = String(name || "").trim().toLowerCase();
    if (ICONS[key]) E.push({ k: "icon", x: X(x, d), y, w: d, h: d, name: key, color: o.color || T.bg, bg: o.bg || T.accent });
    else if (clean(name)) text(String(name).slice(0, 4), x, y, d, d, Math.round(d * 44), { limit: 4 }); // an old emoji icon
  };
  const onAccent = T.bg; // text on the main colour: the page colour reads well on it in every theme
  const deco = T.deco || "blobs";

  // background + quiet decoration (same idea on every slide, so the deck feels like one design)
  E.push({ k: "bg", fill: T.bg, fill2: T.bg2 });
  const L = sl.layout;
  const hero = L === "title" || L === "section" || L === "closing";
  let heroW = SW - 2 * M; // room for the big titles
  if (deco === "corporate") {
    if (L === "title") { rect(SW - 4.3, 0, 4.3, SH, T.accent2); rect(SW - 3.5, 4.3, 2.3, 2.3, "FFFFFF", { alpha: 0.12, r: 0.2 }); rect(SW - 2.6, 1.7, 1.4, 1.4, T.accent, { alpha: 0.9, r: 0.18 }); heroW = SW - 2 * M - 4.3; }
    else if (hero) { rect(0, SH - 0.9, SW, 0.9, T.accent2); rect(0, SH - 0.96, SW * 0.32, 0.06, T.accent); }
    else { rect(0, 0, SW, 0.12, T.accent2); rect(0, 0.12, 2.6, 0.05, T.accent); }
  } else if (deco === "consult") {
    if (hero) rect(M - 0.42, 1.9, 0.09, L === "closing" ? 0 : 2.9, T.text);
    else rect(M, 1.58, 1.1, 0.06, T.accent2);
  } else if (deco === "tech") {
    if (hero) { blob(SW - 5, -2.2, 7.2, T.accent, 0.2); blob(-2, SH - 3.2, 5.6, T.accent2, 0.16); blob(SW - 2.2, SH - 1.8, 0.5, T.accent2, 0.7); }
    else { blob(SW - 2.6, -1.6, 3.6, T.accent, 0.13); blob(-1.3, SH - 1.6, 2.8, T.accent2, 0.1); }
  } else if (deco === "sunrise") {
    const flag = () => { rect(0, SH - 0.08, SW / 3, 0.08, "D93A3A"); rect(SW / 3, SH - 0.08, SW / 3, 0.08, "F3EFE6"); rect((2 * SW) / 3, SH - 0.08, SW / 3, 0.08, "2F9A58"); };
    const mountains = (top) => {
      const pts = [[0, SH], [0, top + 0.9], [1.4, top + 0.25], [2.4, top + 0.75], [4.1, top], [5.3, top + 0.6], [6.4, top + 0.3], [8.0, top + 0.95], [9.4, top + 0.15], [10.8, top + 0.7], [12.1, top + 0.35], [SW, top + 0.8], [SW, SH]];
      E.push({ k: "poly", pts: pts.map(([x, y]) => [rtl ? SW - x : x, y]), fill: "1D140B", alpha: 1 });
    };
    if (hero) { blob(SW / 2 - 3.2, SH - 3.6, 6.4, T.accent2, 0.14); blob(SW / 2 - 1.5, SH - 2.35, 3, T.accent2, 0.95); mountains(SH - 1.45); }
    else { blob(SW - 1.9, -0.9, 2.2, T.accent2, 0.85); blob(SW - 2.6, -1.6, 3.6, T.accent2, 0.1); }
    flag();
  } else if (hero) { blob(SW - 4.2, -1.6, 6.2, T.accent, 0.13); blob(-1.4, SH - 2.6, 4, T.accent2, 0.12); }
  else { rect(0, 0, 0.14, SH, T.accent); blob(SW - 2.2, -1.3, 3.2, T.accent, 0.08); }

  const title = (t, y = 0.5, h = 1.15, maxPt = 40) => text(t, M, y, SW - 2 * M, h, maxPt, { bold: true, limit: 140 });
  const footer = () => {
    if (hero) {
      if (logo && L === "title") E.push({ k: "image", x: X(SW - M - 1.6, 1.6), y: 0.45, w: 1.6, h: 0.75, src: logo, fit: "contain" }); // the far corner, away from the title
      return;
    }
    const fy = SH - 0.52;
    let fx = M;
    if (logo) { E.push({ k: "image", x: X(M, 0.7), y: fy, w: 0.7, h: 0.34, src: logo, fit: "contain" }); fx += 0.85; }
    E.push({ k: "text", x: X(fx, 5.6), y: fy, w: 5.6, h: 0.34, pt: 10, lines: [clean(deckTitle, 70)], text: clean(deckTitle, 70), color: T.muted, align, valign: "middle" });
    if (clean(date)) E.push({ k: "text", x: (SW - 2.4) / 2, y: fy, w: 2.4, h: 0.34, pt: 10, lines: [clean(date, 30)], text: clean(date, 30), color: T.muted, align: "center", valign: "middle" });
    E.push({ k: "text", x: X(SW - M - 1.2, 1.2), y: fy, w: 1.2, h: 0.34, pt: 11, lines: [`${index + 1} / ${total}`], text: `${index + 1} / ${total}`, color: T.muted, align: rtl ? "left" : "right", valign: "middle", ltr: true });
    if (deco !== "sunrise") { rect(0, SH - 0.07, SW, 0.07, T.muted, { alpha: 0.18 }); rect(0, SH - 0.07, (SW * (index + 1)) / Math.max(1, total), 0.07, T.accent); }
  };

  switch (L) {
    case "title": {
      const w = image ? Math.min(6.4, heroW) : heroW;
      if (image) E.push({ k: "image", x: X(SW - M - 5.2, 5.2), y: 1.05, w: 5.2, h: 5.4, src: image, r: 0.3 });
      const sun = deco === "sunrise", top = sun ? -0.55 : 0; // the sunrise style keeps the bottom free for the sun
      if (sl.kicker) text(sl.kicker, M, 1.35 + top, w, 0.5, 18, { color: T.accent, bold: true, limit: 80 });
      const tl = text(sl.title, M, 1.95 + top, w, sun ? 2.2 : 2.6, sun ? 48 : 54, { bold: true, limit: 140, valign: "bottom" });
      rect(M, (sun ? 4.25 : 4.75) + top * 0, 1.4, 0.09, T.accent);
      text(sl.subtitle, M, sun ? 4.5 : 5.05, w, sun ? 0.95 : 1.4, sun ? 22 : 26, { color: T.muted, limit: 220 });
      if (!tl) title(sl.title);
      break;
    }
    case "section": {
      const up = deco === "sunrise" ? -0.8 : 0;
      text(String(sl.number || "").slice(0, 3) || String(index + 1).padStart(2, "0"), M, 1.6 + up, 4, 1.6, 96, { bold: true, color: T.accent, limit: 4 });
      text(sl.title, M, 3.25 + up, SW - 2 * M, 1.6, 48, { bold: true, limit: 120 });
      text(sl.subtitle, M, 4.9 + up, SW - 2 * M - 2, deco === "corporate" ? 0.9 : 1.2, 22, { color: T.muted, limit: 220 });
      break;
    }
    case "closing": {
      const up = deco === "sunrise" ? -0.9 : 0;
      const tt = text(sl.title, M, 2.1 + up, SW - 2 * M, 1.8, 60, { bold: true, align: "center", valign: "middle", limit: 80 });
      if (tt) tt.x = M;
      rect((SW - 1.6) / 2, 4.05 + up, 1.6, 0.09, T.accent);
      const s = text(sl.subtitle, M, 4.4 + up, SW - 2 * M, deco === "corporate" ? 1.1 : 1.4, 24, { color: T.muted, align: "center", limit: 240 });
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
        if (c.icon) icon(c.icon, x + 0.35, cy + 0.4, 0.85);
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
    case "agenda": {
      title(sl.title);
      const its = list(sl.items || sl.bullets, 7, 120);
      const two = its.length > 4, per = two ? Math.ceil(its.length / 2) : its.length;
      const colW = two ? (SW - 2 * M - 0.5) / 2 : SW - 2 * M, rowH = Math.min(1.05, 4.7 / per);
      its.forEach((it, i) => {
        const col = two ? Math.floor(i / per) : 0, r = two ? i % per : i;
        const x = M + col * (colW + 0.5), y = 1.95 + r * rowH, d = Math.min(0.62, rowH - 0.2);
        rect(x, y, colW, rowH - 0.14, T.surface, { r: 0.14 });
        rect(x + 0.14, y + (rowH - 0.14 - d) / 2, d, d, T.accent, { r: 0.12 });
        const n = text(String(i + 1).padStart(2, "0"), x + 0.14, y + (rowH - 0.14 - d) / 2, d, d, 20, { bold: true, color: onAccent, align: "center", valign: "middle", limit: 3 });
        if (n) { n.ltr = true; n.x = X(x + 0.14, d); }
        text(it, x + 0.14 + d + 0.3, y, colW - d - 0.6, rowH - 0.14, 24, { bold: true, valign: "middle", limit: 120 });
      });
      break;
    }
    case "table": {
      title(sl.title);
      const cols = list(sl.columns, 4, 40);
      const rows = (Array.isArray(sl.rows) ? sl.rows : []).slice(0, 6).map((r) => (Array.isArray(r) ? r : []).slice(0, cols.length).map((c) => clean(c, 90)));
      if (!cols.length || !rows.length) { bullets(sl.bullets, M, 1.95, SW - 2 * M, 4.75, 28); break; }
      const W = SW - 2 * M, first = cols.length > 2 ? W * 0.3 : W / cols.length, rest = (W - first) / Math.max(1, cols.length - 1);
      const cx = (j) => M + (j === 0 ? 0 : first + (j - 1) * rest), cw = (j) => (j === 0 ? first : rest);
      const hh = 0.72, rh = Math.min(0.85, (4.8 - hh) / rows.length), y0 = 1.95;
      rect(M, y0, W, hh, T.accent, { r: 0.1 });
      cols.forEach((c, j) => text(c, cx(j) + 0.2, y0, cw(j) - 0.4, hh, 20, { bold: true, color: onAccent, align: j ? "center" : align, valign: "middle", limit: 40 }));
      rows.forEach((r, i) => {
        const y = y0 + hh + i * rh;
        if (i % 2 === 0) rect(M, y, W, rh, T.surface);
        cols.forEach((_, j) => text(r[j] || "", cx(j) + 0.2, y, cw(j) - 0.4, rh, 18, { bold: j === 0, color: j === 0 ? T.text : T.text, align: j ? "center" : align, valign: "middle", limit: 90 }));
      });
      rect(M, y0 + hh + rows.length * rh, W, 0.04, T.accent, { alpha: 0.6 });
      text(sl.text, M, Math.min(6.4, y0 + hh + rows.length * rh + 0.2), W, 0.6, 18, { color: T.muted, limit: 200 });
      break;
    }
    case "process": {
      title(sl.title);
      const st = (Array.isArray(sl.flow) ? sl.flow : []).slice(0, 5);
      const n = Math.max(1, st.length), ag = 0.55, bw = (SW - 2 * M - ag * (n - 1)) / n, by = 2.05, bh = 4.5;
      st.forEach((s, i) => {
        const x = M + i * (bw + ag);
        rect(x, by, bw, bh, T.surface, { r: 0.18 });
        rect(x, by, bw, 0.08, T.accent);
        const nn = text(String(i + 1), x + 0.3, by + 0.35, 0.6, 0.6, 26, { bold: true, color: T.accent, limit: 2 });
        if (nn) nn.ltr = true;
        if (s?.icon && ICONS[String(s.icon).toLowerCase()]) icon(s.icon, x + bw - 1.0, by + 0.35, 0.7);
        text(s?.title, x + 0.3, by + 1.2, bw - 0.6, 1.0, 24, { bold: true, limit: 60 });
        text(s?.text, x + 0.3, by + 2.25, bw - 0.6, bh - 2.5, 18, { color: T.muted, limit: 200 });
        if (i < n - 1) E.push({ k: "arrow", x: X(x + bw + 0.1, ag - 0.2), y: by + bh / 2 - 0.25, w: ag - 0.2, h: 0.5, fill: T.accent, left: !!rtl });
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
    } else if (e.k === "image" && e.fit === "contain") {
      try {
        const im = await loadImg(e.src);
        const k = Math.min((e.w * s) / im.width, (e.h * s) / im.height), dw = im.width * k, dh = im.height * k;
        const dx = e.x * s + (e.w * s - dw) / 2, dy = e.y * s + (e.h * s - dh) / 2;
        g.drawImage(im, dx, dy, dw, dh);
      } catch {}
    } else if (e.k === "icon") {
      drawIcon(g, e, s);
    } else if (e.k === "arrow") {
      drawArrow(g, e, s);
    } else if (e.k === "poly") {
      g.fillStyle = hex(e.fill, e.alpha); g.beginPath(); e.pts.forEach(([px, py], i) => (i ? g.lineTo(px * s, py * s) : g.moveTo(px * s, py * s))); g.closePath(); g.fill();
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

function drawIcon(g, e, s) {
  const x = e.x * s, y = e.y * s, d = e.w * s;
  g.fillStyle = hex(e.bg); g.beginPath(); g.roundRect(x, y, d, d, d * 0.26); g.fill();
  const k = (d * 0.56) / 24;
  g.save(); g.translate(x + d * 0.22, y + d * 0.22); g.scale(k, k);
  g.strokeStyle = hex(e.color); g.lineWidth = 2; g.lineCap = "round"; g.lineJoin = "round";
  g.stroke(new Path2D(ICONS[e.name])); g.restore();
}
function drawArrow(g, e, s) {
  const x = e.x * s, y = e.y * s, w = e.w * s, h = e.h * s;
  g.fillStyle = hex(e.fill); g.beginPath();
  const P = e.left
    ? [[w, h * 0.3], [w * 0.45, h * 0.3], [w * 0.45, 0], [0, h / 2], [w * 0.45, h], [w * 0.45, h * 0.7], [w, h * 0.7]]
    : [[0, h * 0.3], [w * 0.55, h * 0.3], [w * 0.55, 0], [w, h / 2], [w * 0.55, h], [w * 0.55, h * 0.7], [0, h * 0.7]];
  P.forEach(([px, py], i) => (i ? g.lineTo(x + px, y + py) : g.moveTo(x + px, y + py))); g.closePath(); g.fill();
}
// small pictures for PowerPoint (icons and the mountains are drawn as images there)
function iconPng(e) {
  const c = document.createElement("canvas"), px = 192; c.width = c.height = px;
  drawIcon(c.getContext("2d"), { ...e, x: 0, y: 0, w: 1 }, px);
  return c.toDataURL("image/png");
}
function polyPng(e) {
  const xs = e.pts.map((p) => p[0]), ys = e.pts.map((p) => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, h = Math.max(...ys) - y0, k = 120;
  const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  const g = c.getContext("2d"); g.fillStyle = hex(e.fill, e.alpha); g.beginPath();
  e.pts.forEach(([px, py], i) => (i ? g.lineTo((px - x0) * k, (py - y0) * k) : g.moveTo((px - x0) * k, (py - y0) * k))); g.closePath(); g.fill();
  return { data: c.toDataURL("image/png"), x: x0, y: y0, w, h };
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
  const dims = {}; // real sizes of pictures that must not be stretched (the logo)
  for (const E of layouts) for (const e of E) if (e.k === "image" && e.fit === "contain" && !dims[e.src]) { try { const im = await loadImg(e.src); dims[e.src] = [im.width, im.height]; } catch { dims[e.src] = [1, 1]; } }
  deck.slides.forEach((sl, i) => {
    const s = p.addSlide();
    s.background = { color: theme.bg };
    for (const e of layouts[i]) {
      if (e.k === "rect") s.addShape(e.r ? p.ShapeType.roundRect : p.ShapeType.rect, { x: e.x, y: e.y, w: e.w, h: e.h, fill: { color: e.fill, transparency: Math.round((1 - e.alpha) * 100) }, line: { type: "none" }, ...(e.r ? { rectRadius: Math.min(0.5, e.r / Math.min(e.w, e.h)) } : {}) });
      else if (e.k === "ellipse") s.addShape(p.ShapeType.ellipse, { x: e.x, y: e.y, w: e.w, h: e.h, fill: { color: e.fill, transparency: Math.round((1 - e.alpha) * 100) }, line: { type: "none" } });
      else if (e.k === "image" && e.fit === "contain") {
        const [iw, ih] = dims[e.src] || [1, 1], k = Math.min(e.w / iw, e.h / ih), w = iw * k, h = ih * k;
        s.addImage({ data: e.src, x: e.x + (e.w - w) / 2, y: e.y + (e.h - h) / 2, w, h });
      }
      else if (e.k === "image") s.addImage({ data: e.src, x: e.x, y: e.y, w: e.w, h: e.h, sizing: { type: "cover", w: e.w, h: e.h } });
      else if (e.k === "icon") s.addImage({ data: iconPng(e), x: e.x, y: e.y, w: e.w, h: e.h });
      else if (e.k === "poly") { const im = polyPng(e); s.addImage({ data: im.data, x: im.x, y: im.y, w: im.w, h: im.h }); }
      else if (e.k === "arrow") s.addShape(p.ShapeType.rightArrow, { x: e.x, y: e.y, w: e.w, h: e.h, fill: { color: e.fill }, line: { type: "none" }, flipH: !!e.left });
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
