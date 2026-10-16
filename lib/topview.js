// Draws the user's OWN floor plan as a furnished top view (no AI drawing — so walls, positions and sizes stay
// exactly where the plan has them, and every Kurdish/Arabic label is written correctly).
// Rooms come from the plan reader with a box [ymin, xmin, ymax, xmax] (0–1000, relative to the plan picture).

const MAT = {
  modern: { wood: ["#d9c3a0", "#cfb68f"], tile: ["#e8e4dc", "#dcd7cc"], bathTile: ["#d7dade", "#c9cdd2"], wall: "#2b2f36", accent: "#3b4a5a", fabric: "#d9d4cc", fabric2: "#8c96a3", rug: "#b9b0a3" },
  classic: { wood: ["#b9875a", "#a87749"], tile: ["#efe9dd", "#e2d8c4"], bathTile: ["#e9e2d3", "#d8cdb7"], wall: "#3a2f26", accent: "#7a5a2e", fabric: "#e8dcc4", fabric2: "#8a3b3b", rug: "#9c6b4a" },
};
const FLOOR = { living: "wood", guest: "wood", bedroom: "wood", office: "wood", hall: "tile", stairs: "tile", kitchen: "tile", dining: "wood", bath: "bathTile", laundry: "bathTile", storage: "tile", balcony: "tile", other: "tile" };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); }
function shadow(g, on, blur = 14, y = 6) {
  g.shadowColor = on ? "rgba(0,0,0,.28)" : "transparent"; g.shadowBlur = on ? blur : 0; g.shadowOffsetY = on ? y : 0; g.shadowOffsetX = 0;
}

function floor(g, x, y, w, h, kind, m, unit) {
  const [a, b] = m[kind] || m.tile;
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = a; g.fillRect(x, y, w, h);
  g.fillStyle = b;
  if (kind === "wood") { // planks
    const ph = unit * 0.22;
    for (let i = 0, yy = y; yy < y + h; yy += ph, i++) {
      const off = (i % 3) * unit * 0.6;
      for (let xx = x - off; xx < x + w; xx += unit * 1.8) { g.globalAlpha = 0.35 + (i * 7 % 5) * 0.06; g.fillRect(xx, yy, unit * 1.75, ph - 1.2); }
    }
    g.globalAlpha = 1;
  } else { // tiles
    const t = unit * (kind === "bathTile" ? 0.3 : 0.6);
    for (let yy = y, r = 0; yy < y + h; yy += t, r++) for (let xx = x, c = 0; xx < x + w; xx += t, c++) if ((r + c) % 2) g.fillRect(xx, yy, t, t);
    g.strokeStyle = "rgba(0,0,0,.06)"; g.lineWidth = 1;
    for (let yy = y; yy < y + h; yy += t) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
    for (let xx = x; xx < x + w; xx += t) { g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y + h); g.stroke(); }
  }
  // soft shadow along the walls (gives depth)
  const s = Math.min(w, h) * 0.12;
  for (const [gx, gy, gw, gh, x0, y0, x1, y1] of [[x, y, w, s, 0, y, 0, y + s], [x, y + h - s, w, s, 0, y + h, 0, y + h - s], [x, y, s, h, x, 0, x + s, 0], [x + w - s, y, s, h, x + w, 0, x + w - s, 0]]) {
    const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, "rgba(0,0,0,.18)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(gx, gy, gw, gh);
  }
  g.restore();
}

function grass(g, x, y, w, h) {
  const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, "#7fae5a"); gr.addColorStop(1, "#5f9443");
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.fillStyle = "rgba(255,255,255,.05)";
  for (let i = 0; i < (w * h) / 900; i++) g.fillRect(x + ((i * 97) % w), y + ((i * 57) % h), 2, 2);
}
function tree(g, cx, cy, r) {
  shadow(g, true, r * 0.6, r * 0.25);
  const gr = g.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r); gr.addColorStop(0, "#8cc265"); gr.addColorStop(1, "#3f7a2c");
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); shadow(g, false);
}
function flowers(g, x, y, w, h) {
  const cols = ["#e85d75", "#f2c14e", "#f7f7f7", "#c77dff"];
  for (let i = 0; i < Math.max(6, (w * h) / 600); i++) { g.fillStyle = cols[i % 4]; g.beginPath(); g.arc(x + ((i * 53) % w), y + ((i * 31) % h), 2.6, 0, Math.PI * 2); g.fill(); }
}
function car(g, x, y, w, h, u) { // fits a car (top view) inside w×h, pointing along the long side
  const vertical = h >= w;
  g.save(); g.translate(x + w / 2, y + h / 2); if (!vertical) g.rotate(Math.PI / 2);
  const L = Math.min(u ? u * 4.6 : Infinity, Math.max(w, h) * 0.85, Math.min(w, h) * 2.1), W = L * 0.42; // a real car is about 4.6 × 1.9 m
  shadow(g, true, 16, 6);
  const body = g.createLinearGradient(-W / 2, 0, W / 2, 0); body.addColorStop(0, "#3b4250"); body.addColorStop(0.5, "#5a6475"); body.addColorStop(1, "#3b4250");
  g.fillStyle = "#15181d"; for (const [wx, wy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { rr(g, wx * W / 2 - W * 0.09, wy * L * 0.3 - L * 0.07, W * 0.18, L * 0.14, 3); g.fill(); } // wheels
  g.fillStyle = body; rr(g, -W / 2, -L / 2, W, L, W * 0.2); g.fill(); shadow(g, false);
  g.fillStyle = "#1c222b"; rr(g, -W * 0.38, -L * 0.22, W * 0.76, L * 0.2, W * 0.12); g.fill(); // windscreen
  rr(g, -W * 0.36, L * 0.18, W * 0.72, L * 0.13, W * 0.1); g.fill(); // rear glass
  g.fillStyle = "#6c7889"; rr(g, -W * 0.36, -L * 0.02, W * 0.72, L * 0.2, W * 0.08); g.fill(); // roof
  g.restore();
}

// Furniture for each kind of room, scaled to the room (u = pixels per metre).
function furnish(g, r, x, y, w, h, m, u) {
  const p = Math.min(w, h) * 0.1;
  const ix = x + p, iy = y + p, iw = w - 2 * p, ih = h - 2 * p;
  if (iw < 12 || ih < 12) return;
  const fab = (c) => { g.fillStyle = c; };
  shadow(g, true, 10, 4);
  switch (r.type) {
    case "bedroom": {
      const bw = clamp(u * 1.8, iw * 0.35, iw * 0.7), bh = clamp(u * 2.1, ih * 0.4, ih * 0.8);
      const bx = ix + (iw - bw) / 2, by = iy;
      fab(m.accent); rr(g, bx - 2, by, bw + 4, bh * 0.08, 4); g.fill(); // headboard
      fab("#fbfaf7"); rr(g, bx, by + bh * 0.06, bw, bh * 0.94, 8); g.fill();
      fab(m.fabric2); rr(g, bx, by + bh * 0.45, bw, bh * 0.55, 8); g.fill(); // blanket
      fab("#ffffff"); rr(g, bx + bw * 0.08, by + bh * 0.12, bw * 0.38, bh * 0.16, 6); g.fill(); rr(g, bx + bw * 0.54, by + bh * 0.12, bw * 0.38, bh * 0.16, 6); g.fill();
      fab(m.wood[1]); const ns = Math.min(u * 0.5, bw * 0.25);
      rr(g, bx - ns - 6, by + 4, ns, ns, 4); g.fill(); rr(g, bx + bw + 6, by + 4, ns, ns, 4); g.fill();
      if (ih > bh + u * 0.8) { fab(m.wood[1]); rr(g, ix, iy + ih - u * 0.6, iw * 0.6, u * 0.55, 3); g.fill(); } // wardrobe
      break;
    }
    case "living": case "guest": {
      shadow(g, false); fab(m.rug); rr(g, ix + iw * 0.15, iy + ih * 0.2, iw * 0.7, ih * 0.6, 6); g.fill(); shadow(g, true, 10, 4);
      const t = Math.min(u * 0.85, Math.min(iw, ih) * 0.22);
      fab(m.fabric); rr(g, ix, iy, iw, t, 10); g.fill(); rr(g, ix, iy, t, ih * 0.75, 10); g.fill(); // L sofa
      if (r.type === "guest") { rr(g, ix + iw - t, iy, t, ih * 0.75, 10); g.fill(); rr(g, ix, iy + ih - t, iw, t, 10); g.fill(); }
      fab(m.wood[1]); rr(g, ix + iw * 0.35, iy + ih * 0.38, iw * 0.3, ih * 0.22, 6); g.fill(); // table
      if (r.type === "living") { fab("#20242b"); rr(g, ix + iw * 0.2, iy + ih - u * 0.15, iw * 0.6, u * 0.12, 2); g.fill(); } // TV
      break;
    }
    case "kitchen": {
      const d = Math.min(u * 0.62, Math.min(iw, ih) * 0.25);
      fab("#f4f2ee"); rr(g, ix, iy, iw, d, 4); g.fill(); rr(g, ix, iy, d, ih, 4); g.fill(); // L counter
      shadow(g, false);
      fab("#9aa4ae"); rr(g, ix + iw * 0.45, iy + d * 0.2, d * 0.9, d * 0.6, 4); g.fill(); // sink
      fab("#2a2e35"); for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(ix + iw * 0.75 + (i % 2) * d * 0.4, iy + d * 0.3 + Math.floor(i / 2) * d * 0.4, d * 0.13, 0, Math.PI * 2); g.fill(); }
      shadow(g, true, 10, 4);
      if (iw > u * 2.5 && ih > u * 2.5) { fab(m.wood[1]); rr(g, ix + iw * 0.45, iy + ih * 0.5, iw * 0.4, ih * 0.3, 6); g.fill(); } // table / island
      break;
    }
    case "dining": {
      fab(m.wood[1]); rr(g, ix + iw * 0.25, iy + ih * 0.3, iw * 0.5, ih * 0.4, 8); g.fill();
      fab(m.fabric); for (let i = 0; i < 3; i++) { const cx = ix + iw * (0.33 + i * 0.17); rr(g, cx - 8, iy + ih * 0.2, 16, 14, 4); g.fill(); rr(g, cx - 8, iy + ih * 0.72, 16, 14, 4); g.fill(); }
      break;
    }
    case "bath": case "laundry": {
      const s = Math.min(u * 0.9, Math.min(iw, ih) * 0.55);
      g.strokeStyle = "rgba(160,200,230,.9)"; g.lineWidth = 3; fab("rgba(200,225,240,.45)"); rr(g, ix + iw - s, iy, s, s, 4); g.fill(); g.stroke(); // shower
      fab("#ffffff"); g.beginPath(); g.ellipse(ix + s * 0.3, iy + ih - s * 0.35, s * 0.18, s * 0.26, 0, 0, Math.PI * 2); g.fill(); // toilet
      fab("#f4f2ee"); rr(g, ix, iy, s * 0.9, s * 0.45, 6); g.fill(); fab("#cfd6dc"); g.beginPath(); g.ellipse(ix + s * 0.45, iy + s * 0.22, s * 0.18, s * 0.12, 0, 0, Math.PI * 2); g.fill();
      break;
    }
    case "office": { fab(m.wood[1]); rr(g, ix, iy, iw * 0.6, u * 0.6, 4); g.fill(); fab(m.fabric2); g.beginPath(); g.arc(ix + iw * 0.3, iy + u * 0.95, u * 0.22, 0, Math.PI * 2); g.fill(); break; }
    case "stairs": { shadow(g, false); g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 2; const n = 10; for (let i = 0; i <= n; i++) { const yy = iy + (ih * i) / n; g.beginPath(); g.moveTo(ix, yy); g.lineTo(ix + iw, yy); g.stroke(); } break; }
    default: if (r.type !== "hall" && r.type !== "storage") { shadow(g, false); fab(m.rug); rr(g, ix + iw * 0.2, iy + ih * 0.2, iw * 0.6, ih * 0.6, 6); g.fill(); }
  }
  shadow(g, false);
}

function outdoor(g, r, x, y, w, h, u) {
  if (r.type === "garage" || /حەوش|حوش|yard|ساحة|فناء/i.test(r.name) && r.type !== "garden") {
    g.fillStyle = "#b9b4aa"; g.fillRect(x, y, w, h); // paving
    g.strokeStyle = "rgba(0,0,0,.08)"; g.lineWidth = 1;
    const t = u * 0.5;
    for (let yy = y; yy < y + h; yy += t) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
    for (let xx = x; xx < x + w; xx += t * 2) { g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y + h); g.stroke(); }
    if (r.type === "garage") car(g, x + w * 0.1, y + h * 0.1, w * 0.8, h * 0.8, u);
    else { tree(g, x + w * 0.12, y + h * 0.2, Math.min(w, h) * 0.08); flowers(g, x + 4, y + h - 18, w - 8, 14); }
    return;
  }
  grass(g, x, y, w, h);
  g.fillStyle = "#cfc6b3"; g.fillRect(x + w * 0.45, y, w * 0.1, h); // path
  tree(g, x + w * 0.2, y + h * 0.3, Math.min(w, h) * 0.12); tree(g, x + w * 0.8, y + h * 0.65, Math.min(w, h) * 0.1);
  flowers(g, x + 6, y + 6, w * 0.35, h - 12);
}

const OUTSIDE = new Set(["garden", "yard", "garage", "balcony"]);

// plan: { rooms: [{ type, name, w, l, box }] }, img: { w, h } of the plan picture. Returns a canvas or null.
export function drawTopView(plan, { style = "modern", img = { w: 1000, h: 1000 }, lang = "ckb", W = 1800 } = {}) {
  const rooms = (plan?.rooms || []).filter((r) => Array.isArray(r.box) && r.box.length === 4);
  if (!rooms.length) return null;
  const m = MAT[style] || MAT.modern;
  // the plan's own coordinates → pixels (keep the picture's proportions)
  const px = (r) => { const [y0, x0, y1, x1] = r.box; return [x0 / 1000 * img.w, y0 / 1000 * img.h, (x1 - x0) / 1000 * img.w, (y1 - y0) / 1000 * img.h]; };
  const all = rooms.map(px);
  const minX = Math.min(...all.map((b) => b[0])), minY = Math.min(...all.map((b) => b[1]));
  const maxX = Math.max(...all.map((b) => b[0] + b[2])), maxY = Math.max(...all.map((b) => b[1] + b[3]));
  const pad = Math.max(maxX - minX, maxY - minY) * 0.07;
  const s = W / (maxX - minX + 2 * pad);
  const H = Math.round((maxY - minY + 2 * pad) * s);
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  const map = (b) => [(b[0] - minX + pad) * s, (b[1] - minY + pad) * s, b[2] * s, b[3] * s];
  grass(g, 0, 0, W, H);
  // pixels per metre, from rooms whose size is known
  const ratios = rooms.map((r, i) => { const b = map(all[i]); return r.w && r.l ? Math.max(b[2], b[3]) / Math.max(r.w, r.l) : 0; }).filter(Boolean);
  const u = ratios.length ? ratios.sort((a, b) => a - b)[Math.floor(ratios.length / 2)] : W / 18;
  const wall = clamp(u * 0.2, 5, 16);
  // floors + furniture
  rooms.forEach((r, i) => {
    const [x, y, w, h] = map(all[i]);
    if (OUTSIDE.has(r.type)) outdoor(g, r, x, y, w, h, u);
    else { floor(g, x, y, w, h, FLOOR[r.type] || "tile", m, u); furnish(g, r, x, y, w, h, m, u); }
  });
  // walls (drawn on top, with a little shadow for depth)
  g.save(); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = wall; g.shadowOffsetY = wall * 0.4;
  g.strokeStyle = m.wall; g.lineJoin = "miter";
  rooms.forEach((r, i) => {
    if (r.type === "garden") return;
    const [x, y, w, h] = map(all[i]);
    g.lineWidth = r.type === "yard" ? wall * 0.5 : wall;
    g.strokeRect(x, y, w, h);
  });
  g.restore();
  // labels: the user's own room names and sizes, in their language
  g.direction = lang === "en" ? "ltr" : "rtl"; g.textAlign = "center"; g.textBaseline = "middle";
  rooms.forEach((r, i) => {
    const [x, y, w, h] = map(all[i]);
    const fs = clamp(Math.min(w, h) * 0.11, 15, 34);
    const name = r.name || r.type, size = r.w && r.l ? `${r.w} × ${r.l} m` : "";
    g.font = `800 ${fs}px Vazirmatn, "Noto Kufi Arabic", sans-serif`;
    const tw = Math.max(g.measureText(name).width, size ? fs * 4.2 : 0) + fs * 1.2;
    const bh = size ? fs * 2.5 : fs * 1.6;
    const cx = x + w / 2, cy = r.type === "garage" ? y + h - bh * 0.9 : y + h / 2; // keep the car visible
    g.fillStyle = "rgba(255,255,255,.88)"; rr(g, cx - tw / 2, cy - bh / 2, tw, bh, fs * 0.5); g.fill();
    g.fillStyle = "#14202b"; g.fillText(name, cx, cy - (size ? fs * 0.45 : 0), w - 8);
    if (size) { g.direction = "ltr"; g.font = `600 ${fs * 0.72}px Vazirmatn, sans-serif`; g.fillStyle = "#5b6773"; g.fillText(size, cx, cy + fs * 0.7); g.direction = lang === "en" ? "ltr" : "rtl"; }
  });
  return c;
}
