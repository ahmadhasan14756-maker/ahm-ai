// AHM 3D Studio — the building model and its 3D view (three.js).
// The model is plain JSON in metres, seen from above like a floor plan: x = to the right, z = down the page, y = up.
//   walls:    { id, x1, z1, x2, z2, t (thickness), h (height), color }
//   openings: { id, wall, at (centre, metres from the wall's start), w, h, sill, kind: "door" | "window" }
//   rooms:    { id, name, type, x, z, w, d, floor (colour) }
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { makeProp, PROPS } from "./props3d";

export const ROOM_TYPES = {
  living: "#eadcc4", guest: "#efd9d0", bedroom: "#d8e3ee", kitchen: "#dcecd8", dining: "#ebe2cf", bath: "#d3eaee",
  hall: "#e9e4da", stairs: "#e2ddd4", garage: "#dadada", office: "#e0e6d6", storage: "#e4e0d8", balcony: "#e6eee0", other: "#e6e1d8",
};
export const WALL_COLORS = ["#ebe4d6", "#f2eee6", "#e9dfcc", "#d9cbb3", "#c9b28f", "#b9c7cf", "#cfd8c4", "#e8d3c7", "#9a9a9a", "#4a4a4a"];

let seq = Date.now() % 100000;
export const uid = (p) => p + (seq++).toString(36);
const r2 = (v) => Math.round(v * 100) / 100;

export const emptyModel = () => ({ v: 1, walls: [], openings: [], rooms: [], items: [], wallH: 3 });

// Surface materials (drawn in the app, no downloads). size = metres one pattern tile covers.
export const MATERIALS = {
  paint: { size: 2 }, block: { size: 0.8 }, brick: { size: 0.9 }, stone: { size: 1.2 }, tile: { size: 0.6 }, wood: { size: 1.4 }, marble: { size: 1.6 }, concrete: { size: 2.4 }, carpet: { size: 1.5 },
};
const texCache = new Map();
function rnd(seed) { let x = seed; return () => ((x = (x * 16807) % 2147483647) / 2147483647); }
function shade(hex, k) { const c = new THREE.Color(hex); c.multiplyScalar(k); return "#" + c.getHexString(); }
// a repeating picture for a surface, tinted with the chosen colour
function surfaceTex(kind, color) {
  const key = kind + color;
  if (texCache.has(key)) return texCache.get(key);
  const N = 512, c = document.createElement("canvas"); c.width = c.height = N;
  const g = c.getContext("2d"), r = rnd(kind.length * 977 + 13);
  g.fillStyle = color; g.fillRect(0, 0, N, N);
  const noise = (n, a, sz = 2) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${a * r()})`; g.fillRect(r() * N, r() * N, sz, sz); } };
  if (kind === "block") { // concrete blocks 40 × 20 cm, staggered rows, grey mortar
    const bh = N / 4, bw = N / 2;
    for (let row = 0; row < 4; row++) for (let i = -1; i < 3; i++) {
      const x = i * bw + (row % 2 ? bw / 2 : 0), y = row * bh;
      g.fillStyle = shade(color, 0.9 + r() * 0.16); g.fillRect(x + 4, y + 4, bw - 8, bh - 8);
    }
    g.fillStyle = "rgba(120,118,112,0.9)";
    for (let row = 0; row <= 4; row++) g.fillRect(0, row * bh - 4, N, 8);
    for (let row = 0; row < 4; row++) for (let i = 0; i < 3; i++) g.fillRect(i * bw + (row % 2 ? bw / 2 : 0) - 4, row * bh, 8, bh);
    noise(9000, 0.16, 2);
  } else if (kind === "grass") {
    for (let i = 0; i < 26000; i++) { g.fillStyle = `hsl(${88 + r() * 30},${35 + r() * 25}%,${22 + r() * 22}%)`; g.fillRect(r() * N, r() * N, 2, 3 + r() * 4); }
  } else if (kind === "soil") { // bare earth of a new plot
    for (let i = 0; i < 22000; i++) { g.fillStyle = `hsl(${24 + r() * 14},${28 + r() * 18}%,${24 + r() * 26}%)`; const z = 1 + r() * 3; g.fillRect(r() * N, r() * N, z, z); }
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${120 + r() * 60},${110 + r() * 50},${95 + r() * 40},0.9)`; g.beginPath(); g.arc(r() * N, r() * N, 1.5 + r() * 4, 0, 7); g.fill(); }
  } else if (kind === "gravel") {
    for (let i = 0; i < 9000; i++) { const v = 120 + r() * 110; g.fillStyle = `rgb(${v},${v - 6},${v - 14})`; g.beginPath(); g.arc(r() * N, r() * N, 1.5 + r() * 3.5, 0, 7); g.fill(); }
  } else if (kind === "asphalt") {
    noise(30000, 0.22, 2);
  } else if (kind === "brick") {
    const bh = N / 8, bw = N / 4;
    for (let row = 0; row < 8; row++) for (let i = -1; i < 5; i++) {
      const x = i * bw + (row % 2 ? bw / 2 : 0), y = row * bh;
      g.fillStyle = shade(color, 0.82 + r() * 0.3); g.fillRect(x + 3, y + 3, bw - 6, bh - 6);
    }
    g.fillStyle = "rgba(225,218,205,0.9)";
    for (let row = 0; row <= 8; row++) g.fillRect(0, row * bh - 3, N, 6);
    noise(4000, 0.12);
  } else if (kind === "stone") {
    for (let i = 0; i < 26; i++) {
      g.fillStyle = shade(color, 0.75 + r() * 0.45); g.beginPath();
      const cx = r() * N, cy = r() * N, rad = 40 + r() * 70;
      for (let a = 0; a < 7; a++) { const ang = (a / 7) * Math.PI * 2, rr = rad * (0.7 + r() * 0.4); g.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr); }
      g.closePath(); g.fill(); g.strokeStyle = "rgba(60,55,50,0.55)"; g.lineWidth = 4; g.stroke();
    }
    noise(6000, 0.15);
  } else if (kind === "tile") {
    const t = N / 4;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = shade(color, 0.94 + r() * 0.1); g.fillRect(i * t + 3, j * t + 3, t - 6, t - 6); }
    g.fillStyle = "rgba(170,165,158,0.9)";
    for (let i = 0; i <= 4; i++) { g.fillRect(i * t - 3, 0, 6, N); g.fillRect(0, i * t - 3, N, 6); }
  } else if (kind === "wood") {
    const pw = N / 6;
    for (let i = 0; i < 6; i++) {
      g.fillStyle = shade(color, 0.8 + r() * 0.35); g.fillRect(0, i * pw, N, pw);
      g.strokeStyle = "rgba(60,35,15,0.18)"; g.lineWidth = 2;
      for (let k = 0; k < 9; k++) { g.beginPath(); const y = i * pw + r() * pw; g.moveTo(0, y); g.bezierCurveTo(N * 0.3, y + (r() - 0.5) * 14, N * 0.7, y + (r() - 0.5) * 14, N, y); g.stroke(); }
      g.fillStyle = "rgba(40,25,10,0.45)"; g.fillRect(0, i * pw, N, 2);
      g.fillRect(((i * 37) % 6) * (N / 6), i * pw, 2, pw);
    }
  } else if (kind === "marble") {
    g.strokeStyle = shade(color, 0.6); g.globalAlpha = 0.35;
    for (let i = 0; i < 14; i++) {
      g.lineWidth = 1 + r() * 3; g.beginPath(); let x = r() * N, y = 0; g.moveTo(x, y);
      while (y < N) { x += (r() - 0.5) * 60; y += 20 + r() * 40; g.lineTo(x, y); } g.stroke();
    }
    g.globalAlpha = 1; noise(3000, 0.05);
  } else if (kind === "concrete") {
    noise(14000, 0.1, 3);
    g.strokeStyle = "rgba(0,0,0,0.12)"; g.lineWidth = 2; g.strokeRect(0, 0, N, N);
  } else if (kind === "carpet") {
    noise(30000, 0.12, 2);
  } else {
    noise(2500, 0.03);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 8;
  texCache.set(key, tex);
  return tex;
}
// a material for a surface of a given size (metres), so the pattern keeps its real size
function surfaceMat(kind, color, w, h, extra = {}) {
  const k = MATERIALS[kind] || ["grass", "asphalt", "soil", "gravel"].includes(kind) ? kind : "paint";
  const sz = MATERIALS[k]?.size || ({ grass: 3, soil: 4, gravel: 1.5 }[k] ?? 5);
  const tex = surfaceTex(k, color).clone();
  tex.needsUpdate = true;
  tex.repeat.set(Math.max(0.05, w / sz), Math.max(0.05, h / sz));
  return new THREE.MeshStandardMaterial({ map: tex, roughness: k === "marble" || k === "tile" ? 0.25 : k === "wood" ? 0.55 : 0.92, metalness: 0, ...extra });
}

export function wallLen(w) { return Math.hypot(w.x2 - w.x1, w.z2 - w.z1); }

// ---------- model helpers (pure, no 3D) ----------

// Axis-aligned walls lying on the same line are merged (two rooms sharing a wall → one wall). Doors and windows
// keep their place: they are re-attached to whichever wall now holds their centre point.
export function mergeWalls(m) {
  const absOpen = m.openings.map((o) => {
    const w = m.walls.find((x) => x.id === o.wall);
    if (!w) return null;
    const L = wallLen(w) || 1;
    return { o, px: w.x1 + ((w.x2 - w.x1) * o.at) / L, pz: w.z1 + ((w.z2 - w.z1) * o.at) / L };
  }).filter(Boolean);
  const keep = [], groups = new Map();
  for (const w of m.walls) {
    const hor = Math.abs(w.z1 - w.z2) < 0.01, ver = Math.abs(w.x1 - w.x2) < 0.01;
    if (!hor && !ver) { keep.push(w); continue; }
    const key = (hor ? "h" : "v") + ":" + (hor ? r2(w.z1) : r2(w.x1)).toFixed(2) + (w.fence ? ":f" : ""); // a fence never merges with a house wall
    const a = hor ? Math.min(w.x1, w.x2) : Math.min(w.z1, w.z2), b = hor ? Math.max(w.x1, w.x2) : Math.max(w.z1, w.z2);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ w, a, b, hor });
  }
  for (const list of groups.values()) {
    list.sort((p, q) => p.a - q.a);
    let cur = null;
    for (const s of list) {
      if (cur && s.a <= cur.b + 0.02) {
        cur.b = Math.max(cur.b, s.b);
        cur.t = Math.max(cur.t, s.w.t); cur.h = Math.max(cur.h, s.w.h);
      } else {
        if (cur) keep.push(cur.make());
        const base = s.w;
        cur = { a: s.a, b: s.b, t: base.t, h: base.h, base, hor: s.hor, line: s.hor ? base.z1 : base.x1,
          // keep everything the wall had (colours, materials, fence…), only the ends and size change
          make() { return this.hor ? { ...this.base, x1: r2(this.a), z1: r2(this.line), x2: r2(this.b), z2: r2(this.line), t: this.t, h: this.h }
            : { ...this.base, x1: r2(this.line), z1: r2(this.a), x2: r2(this.line), z2: r2(this.b), t: this.t, h: this.h }; } };
      }
    }
    if (cur) keep.push(cur.make());
  }
  const openings = [];
  for (const { o, px, pz } of absOpen) {
    let best = null, bd = 0.3;
    for (const w of keep) {
      const L = wallLen(w); if (!L) continue;
      const ux = (w.x2 - w.x1) / L, uz = (w.z2 - w.z1) / L;
      const s = (px - w.x1) * ux + (pz - w.z1) * uz;
      if (s < 0 || s > L) continue;
      const d = Math.abs((px - w.x1) * uz - (pz - w.z1) * ux);
      if (d < bd) { bd = d; best = { w, s }; }
    }
    if (best) openings.push({ ...o, wall: best.w.id, at: r2(best.s) });
  }
  return { ...m, walls: keep, openings };
}

// A room = a floor + 4 walls around it (merged with walls already there).
export function addRoom(m, { name, type = "other", x, z, w, d, t = 0.2 }) {
  const room = { id: uid("r"), name: name || "", type, x: r2(x), z: r2(z), w: r2(w), d: r2(d) };
  const H = m.wallH || 3, c = WALL_COLORS[0];
  const ws = [
    { x1: x, z1: z, x2: x + w, z2: z }, { x1: x + w, z1: z, x2: x + w, z2: z + d },
    { x1: x, z1: z + d, x2: x + w, z2: z + d }, { x1: x, z1: z, x2: x, z2: z + d },
  ].map((s) => ({ id: uid("w"), x1: r2(s.x1), z1: r2(s.z1), x2: r2(s.x2), z2: r2(s.z2), t, h: H, color: c }));
  return mergeWalls({ ...m, rooms: [...m.rooms, room], walls: [...m.walls, ...ws] });
}

// Floor plan read by the AI (rooms with [ymin, xmin, ymax, xmax] boxes 0–1000 and real sizes in metres) → a 3D model.
export function planToModel(plan, floor = 1) {
  const rooms = (plan?.rooms || []).filter((r) => Array.isArray(r.box) && (r.floor || 1) === floor);
  if (!rooms.length) return null;
  // metres per picture unit, from every room whose real size is known (longer side ↔ longer side)
  const ks = [];
  for (const r of rooms) {
    const [y0, x0, y1, x1] = r.box, bw = Math.abs(x1 - x0), bh = Math.abs(y1 - y0);
    if (r.w > 0 && r.l > 0 && bw > 5 && bh > 5) {
      const big = Math.max(r.w, r.l), small = Math.min(r.w, r.l);
      ks.push(big / Math.max(bw, bh), small / Math.min(bw, bh));
    }
  }
  ks.sort((a, b) => a - b);
  const k = ks.length ? ks[Math.floor(ks.length / 2)] : 0.015; // fallback ≈ 15 m across the picture
  let m = emptyModel();
  const minX = Math.min(...rooms.map((r) => Math.min(r.box[1], r.box[3]))), minY = Math.min(...rooms.map((r) => Math.min(r.box[0], r.box[2])));
  const snap = (v) => Math.round(v * 20) / 20; // 5 cm
  for (const r of rooms) {
    const [y0, x0, y1, x1] = r.box;
    const x = snap((Math.min(x0, x1) - minX) * k), z = snap((Math.min(y0, y1) - minY) * k);
    const w = snap(Math.abs(x1 - x0) * k), d = snap(Math.abs(y1 - y0) * k);
    if (w < 0.5 || d < 0.5) continue;
    m = addRoom(m, { name: r.name, type: ROOM_TYPES[r.type] ? r.type : "other", x, z, w, d });
  }
  // outer walls thicker (25 cm), inner 12 cm
  const xs = m.walls.flatMap((w) => [w.x1, w.x2]), zs = m.walls.flatMap((w) => [w.z1, w.z2]);
  const X0 = Math.min(...xs), X1 = Math.max(...xs), Z0 = Math.min(...zs), Z1 = Math.max(...zs);
  m.walls = m.walls.map((w) => {
    const outer = (Math.abs(w.x1 - w.x2) < 0.01 && (Math.abs(w.x1 - X0) < 0.05 || Math.abs(w.x1 - X1) < 0.05))
      || (Math.abs(w.z1 - w.z2) < 0.01 && (Math.abs(w.z1 - Z0) < 0.05 || Math.abs(w.z1 - Z1) < 0.05));
    return { ...w, t: outer ? 0.25 : 0.12 };
  });
  return m;
}

// Apply edits (from the user's tools or from the AI) safely. Unknown or broken edits are skipped.
export function applyOps(m, ops) {
  let out = { ...m, walls: [...m.walls], openings: [...m.openings], rooms: [...m.rooms], items: [...(m.items || [])], patches: [...(m.patches || [])] };
  const num = (v, lo, hi) => (typeof v === "number" && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : undefined);
  const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
  for (const op of Array.isArray(ops) ? ops : []) {
    try {
      if (op.op === "setWall" || op.op === "setAllWalls") {
        const patch = clean({ t: num(op.t, 0.05, 1), h: num(op.h, 1, 12), color: typeof op.color === "string" && /^#[0-9a-f]{6}$/i.test(op.color) ? op.color : undefined });
        out.walls = out.walls.map((w) => (op.op === "setAllWalls" || w.id === op.id ? { ...w, ...patch } : w));
        if (op.op === "setAllWalls" && patch.h) out.wallH = patch.h;
      } else if (op.op === "addWall") {
        const w = { id: uid("w"), x1: num(op.x1, -500, 500), z1: num(op.z1, -500, 500), x2: num(op.x2, -500, 500), z2: num(op.z2, -500, 500), t: num(op.t, 0.05, 1) ?? 0.2, h: num(op.h, 1, 12) ?? out.wallH ?? 3, color: WALL_COLORS[0] };
        if ([w.x1, w.z1, w.x2, w.z2].every((v) => v !== undefined) && wallLen(w) > 0.05) out.walls.push(w);
      } else if (op.op === "addRoom") {
        const x = num(op.x, -500, 500), z = num(op.z, -500, 500), w = num(op.w, 0.5, 100), d = num(op.d, 0.5, 100);
        if ([x, z, w, d].every((v) => v !== undefined)) out = addRoom(out, { name: String(op.name || "").slice(0, 40), type: ROOM_TYPES[op.type] ? op.type : "other", x, z, w, d });
      } else if (op.op === "setRoom") {
        out.rooms = out.rooms.map((r) => (r.id === op.id ? { ...r, ...clean({ name: op.name != null ? String(op.name).slice(0, 40) : undefined, type: ROOM_TYPES[op.type] ? op.type : undefined, floor: typeof op.floor === "string" && /^#[0-9a-f]{6}$/i.test(op.floor) ? op.floor : undefined, fmat: MATERIALS[op.fmat] ? op.fmat : undefined }) } : r));
      } else if (op.op === "addOpening") {
        const w = out.walls.find((x) => x.id === op.wall);
        if (!w) continue;
        const L = wallLen(w), kind = op.kind === "window" ? "window" : "door";
        const ow = num(op.w, 0.4, Math.max(0.4, L - 0.1)) ?? (kind === "door" ? 0.9 : 1.2);
        const at = num(op.at, ow / 2, L - ow / 2) ?? L / 2;
        out.openings.push({ id: uid("o"), wall: w.id, at: r2(at), w: ow, kind, h: num(op.h, 0.3, w.h - 0.1) ?? (kind === "door" ? 2.1 : 1.2), sill: kind === "door" ? 0 : num(op.sill, 0, w.h - 0.5) ?? 1 });
      } else if (op.op === "setOpening") {
        out.openings = out.openings.map((o) => (o.id === op.id ? { ...o, ...clean({ w: num(op.w, 0.4, 6), h: num(op.h, 0.3, 5), sill: num(op.sill, 0, 4), at: num(op.at, 0, 500) }) } : o));
      } else if (op.op === "delete") {
        out.walls = out.walls.filter((w) => w.id !== op.id);
        out.items = (out.items || []).filter((it) => it.id !== op.id);
        out.patches = (out.patches || []).filter((pt) => pt.id !== op.id);
        out.rooms = out.rooms.filter((r) => r.id !== op.id);
        out.openings = out.openings.filter((o) => o.id !== op.id && o.wall !== op.id);
      } else if (op.op === "paintWall") {
        const c = typeof op.color === "string" && /^#[0-9a-f]{6}$/i.test(op.color) ? op.color : undefined, mk = MATERIALS[op.mat] ? op.mat : undefined;
        out.walls = out.walls.map((w) => {
          if (op.id !== "*" && w.id !== op.id) return w;
          const sides = op.side === "a" ? ["A"] : op.side === "b" ? ["B"] : ["A", "B"];
          const n = { ...w };
          for (const S of sides) { if (c) n["color" + S] = c; if (mk) n["mat" + S] = mk; }
          return n;
        });
      } else if (op.op === "addPic") {
        if (typeof op.pic === "string" && ((/^https:\/\//.test(op.pic) && op.pic.length < 600) || (/^data:image\/(png|jpeg|webp);base64,/.test(op.pic) && op.pic.length < 600000)))
          out.items = [...(out.items || []), { id: uid("i"), pic: op.pic, name: String(op.name || "").slice(0, 60), x: num(op.x, -500, 500) ?? 0, z: num(op.z, -500, 500) ?? 0, y: 0, rot: 0, s: 1, h: num(op.h, 0.2, 8) ?? 1 }].slice(0, 120);
      } else if (op.op === "setPlot") {
        const w = num(op.w, 5, 200), d = num(op.d, 5, 200);
        if (w && d) out.plot = { w: r2(w), d: r2(d), ground: op.ground === "grass" ? "grass" : "soil" };
      } else if (op.op === "lay") {
        // lay courses of blocks on one wall (id) or on every house wall ("*"): n courses of 20 cm, or the whole wall (full)
        const RAW = { block: "#b9b6ae", brick: "#b5654f", stone: "#c8b89a" };
        out.walls = out.walls.map((w) => {
          if ((op.id === "*" ? w.fence : w.id !== op.id)) return w;
          const n = { ...w };
          if (RAW[op.mat]) { n.matA = n.matB = op.mat; n.colorA = n.colorB = RAW[op.mat]; }
          const frac = num(op.frac, 0, 1);
          n.built = op.full ? n.h : frac !== undefined ? Math.min(n.h, r2(Math.round((frac * n.h) / 0.2) * 0.2)) : Math.min(n.h, r2((n.built ?? 0) + 0.2 * (num(op.n, 1, 30) ?? 1)));
          return n;
        });
      } else if (op.op === "pour") {
        out.rooms = out.rooms.map((r) => (op.id === "*" || r.id === op.id ? { ...r, slab: true } : r));
      } else if (op.op === "patch") {
        const x = num(op.x, -500, 500), z = num(op.z, -500, 500), w = num(op.w, 0.3, 200), d = num(op.d, 0.3, 200);
        if ([x, z, w, d].every((v) => v !== undefined))
          out.patches = [...(out.patches || []), { id: uid("p"), kind: ["grass", "paving", "gravel", "soil", "pool"].includes(op.kind) ? op.kind : "grass", x: r2(x), z: r2(z), w: r2(w), d: r2(d) }].slice(0, 80);
      } else if (op.op === "fence") {
        // a wall around the whole plot with a car gate and a front door on the street side
        const P = out.plot; if (!P) continue;
        out.walls = out.walls.filter((w) => !w.fence);
        const h = num(op.h, 1, 4) ?? 2, mat = MATERIALS[op.mat] ? op.mat : "stone", col = typeof op.color === "string" && /^#[0-9a-f]{6}$/i.test(op.color) ? op.color : "#c8b89a";
        const mk = (x1, z1, x2, z2) => ({ id: uid("w"), x1, z1, x2, z2, t: 0.2, h, fence: true, color: col, matA: mat, matB: mat });
        const front = mk(0, P.d, P.w, P.d);
        out.walls.push(mk(0, 0, P.w, 0), mk(P.w, 0, P.w, P.d), front, mk(0, 0, 0, P.d));
        const gate = Math.min(3.5, P.w * 0.35);
        out.openings.push({ id: uid("o"), wall: front.id, at: r2(P.w * 0.3), w: gate, h: Math.min(h, 2), sill: 0, kind: "door" });
        if (P.w > 7) out.openings.push({ id: uid("o"), wall: front.id, at: r2(P.w * 0.72), w: 1, h: Math.min(h, 2), sill: 0, kind: "door" });
      } else if (op.op === "addProp") {
        if (PROPS[op.prop])
          out.items = [...(out.items || []), { id: uid("i"), prop: op.prop, name: String(op.name || op.prop).slice(0, 60), color: /^#[0-9a-f]{6}$/i.test(op.color || "") ? op.color : undefined, x: num(op.x, -500, 500) ?? 0, z: num(op.z, -500, 500) ?? 0, y: num(op.y, 0, 12) ?? 0, rot: num(op.rot, -720, 720) ?? 0, s: 1 }].slice(0, 120);
      } else if (op.op === "addItem") {
        if (typeof op.ph === "string" && /^[A-Za-z0-9_-]{2,60}$/.test(op.ph))
          out.items = [...(out.items || []), { id: uid("i"), ph: op.ph, name: String(op.name || op.ph).slice(0, 60), x: num(op.x, -500, 500) ?? 0, z: num(op.z, -500, 500) ?? 0, y: num(op.y, 0, 10) ?? 0, rot: num(op.rot, -720, 720) ?? 0, s: num(op.s, 0.2, 5) ?? 1 }].slice(0, 120);
      } else if (op.op === "setItem") {
        out.items = (out.items || []).map((it) => (it.id === op.id ? { ...it, ...clean({ x: num(op.x, -500, 500), z: num(op.z, -500, 500), y: num(op.y, 0, 10), rot: num(op.rot, -720, 720), s: num(op.s, 0.2, 5), h: num(op.h, 0.2, 8), color: /^#[0-9a-f]{6}$/i.test(op.color || "") ? op.color : undefined }) } : it));
      } else if (op.op === "clear") {
        out = { ...emptyModel(), plot: op.keepPlot ? out.plot : undefined };
      }
    } catch { /* skip a broken edit */ }
  }
  out.openings = out.openings.filter((o) => out.walls.some((w) => w.id === o.wall));
  out.items = out.items || [];
  return out;
}

// Quantities and cost (a rough, preliminary estimate). Rules of thumb are shown to the user next to each line.
export const DEFAULT_PRICES = { block: 450, plaster: 8000, paint: 4500, tile: 18000, concrete: 125000, door: 175000, window: 150000 };
export function boq(m, prices = DEFAULT_PRICES) {
  let wallArea = 0, wallVol = 0, openArea = 0, doors = 0, windows = 0;
  for (const w of m.walls) { const L = wallLen(w); wallArea += L * w.h; wallVol += L * w.h * w.t; }
  for (const o of m.openings) { openArea += o.w * o.h; if (o.kind === "door") doors++; else windows++; }
  const net = Math.max(0, wallArea - openArea);
  const floor = m.rooms.reduce((s, r) => s + r.w * r.d, 0);
  const lines = [
    { k: "block", qty: Math.ceil(net * 12.5), unit: "pcs", rule: "12.5 / m²" },
    { k: "plaster", qty: Math.round(net * 2), unit: "m²", rule: "2 × wall" },
    { k: "paint", qty: Math.round(net * 2), unit: "m²", rule: "2 × wall" },
    { k: "tile", qty: Math.round(floor * 1.05), unit: "m²", rule: "floor + 5%" },
    { k: "concrete", qty: Math.round(floor * 0.15 * 10) / 10, unit: "m³", rule: "roof slab 15 cm" },
    { k: "door", qty: doors, unit: "pcs", rule: "" },
    { k: "window", qty: windows, unit: "pcs", rule: "" },
  ].map((l) => ({ ...l, price: prices[l.k] ?? 0, cost: Math.round(l.qty * (prices[l.k] ?? 0)) }));
  return { lines, total: lines.reduce((s, l) => s + l.cost, 0), floor: Math.round(floor * 10) / 10, net: Math.round(net * 10) / 10, wallVol: Math.round(wallVol * 10) / 10 };
}

// ---------- the 3D view ----------

function textSprite(text, { size = 0.5, color = "#1d1d1f", bg = "rgba(255,255,255,0.88)", bold = true } = {}) {
  const c = document.createElement("canvas"), g = c.getContext("2d");
  const font = `${bold ? "700 " : ""}56px 'Noto Kufi Arabic','Vazirmatn',system-ui,sans-serif`;
  g.font = font;
  const lines = String(text).split("\n");
  const W = Math.ceil(Math.max(...lines.map((l) => g.measureText(l).width))) + 40, H = lines.length * 70 + 24;
  c.width = W; c.height = H;
  g.font = font; g.direction = "rtl"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = bg; g.beginPath(); g.roundRect?.(0, 0, W, H, 20); g.fill();
  g.fillStyle = color;
  lines.forEach((l, i) => g.fillText(l, W / 2, 12 + 35 + i * 70));
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set((size * W) / 70, (size * H) / 70, 1);
  s.renderOrder = 10;
  return s;
}

export class Studio3D {
  constructor(canvas) {
    this.canvas = canvas;
    const r = (this.r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true }));
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.88;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color("#c9d6e2");
    const pm = new THREE.PMREMGenerator(r);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb9ab95, 0.6));
    const sun = (this.sun = new THREE.DirectionalLight(0xfff4e2, 2.2));
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
    scene.add(sun, sun.target);

    const ground = (this.ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: "#b9c2ad", roughness: 1 })));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; ground.receiveShadow = true;
    scene.add(ground);
    this.grid = new THREE.GridHelper(200, 200, 0x9aa3ab, 0xbcc4ca);
    this.grid.material.transparent = true; this.grid.material.opacity = 0.55;
    scene.add(this.grid);

    this.group = new THREE.Group(); scene.add(this.group);
    this.items3d = new THREE.Group(); scene.add(this.items3d);
    { // sky: soft gradient
      const c = document.createElement("canvas"); c.width = 4; c.height = 256;
      const g2 = c.getContext("2d"), gr = g2.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, "#7fa8cf"); gr.addColorStop(0.55, "#c4d6e6"); gr.addColorStop(1, "#eef1ec");
      g2.fillStyle = gr; g2.fillRect(0, 0, 4, 256);
      this.sky = new THREE.CanvasTexture(c); this.sky.colorSpace = THREE.SRGBColorSpace;
      this.planBg = new THREE.Color("#eef0ee");
    }
    this.overlay = new THREE.Group(); scene.add(this.overlay);

    this.persp = new THREE.PerspectiveCamera(50, 1, 0.05, 1000);
    this.persp.position.set(14, 13, 18);
    this.ortho = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 500);
    this.ortho.up.set(0, 0, -1);
    this.ortho.position.set(5, 100, 5); this.ortho.lookAt(5, 0, 5);
    this.view = "3d";
    this.camera = this.persp;

    this.controls = new OrbitControls(this.persp, canvas);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.12;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    this.controls.target.set(5, 0, 5);
    this.plan = new OrbitControls(this.ortho, canvas);
    this.plan.enableRotate = false; this.plan.screenSpacePanning = true;
    this.plan.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
    this.plan.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    this.plan.target.set(5, 0, 5);
    this.plan.enabled = false;
    this.controls.addEventListener("change", () => (this.dirty = true));
    this.plan.addEventListener("change", () => (this.dirty = true));

    this.walk = { yaw: 0, pitch: 0, pos: new THREE.Vector3(), move: 0, turn: 0 };
    this.ray = new THREE.Raycaster();
    this.model = emptyModel();
    this.selected = null;
    this.dirty = true;
    this.alive = true;
    const loop = () => {
      if (!this.alive) return;
      requestAnimationFrame(loop);
      if (this.growStart) this.growStep();
      if (this.pouring) this.pourStep();
      if (this.view === "walk") this.stepWalk();
      else (this.view === "plan" ? this.plan : this.controls).update();
      if (this.dirty) { this.dirty = false; this.r.render(this.scene, this.camera); }
    };
    this.resize();
    loop();
  }

  resize() {
    const w = this.canvas.clientWidth || 300, h = this.canvas.clientHeight || 300;
    this.r.setSize(w, h, false);
    this.persp.aspect = w / h; this.persp.updateProjectionMatrix();
    const half = this.orthoHalf || 10;
    this.ortho.left = (-half * w) / h; this.ortho.right = (half * w) / h; this.ortho.top = half; this.ortho.bottom = -half;
    this.ortho.updateProjectionMatrix();
    this.dirty = true;
  }

  bounds() {
    const xs = [], zs = [];
    for (const w of this.model.walls) xs.push(w.x1, w.x2), zs.push(w.z1, w.z2);
    for (const r of this.model.rooms) xs.push(r.x, r.x + r.w), zs.push(r.z, r.z + r.d);
    const P = this.model.plot;
    if (P) xs.push(0, P.w), zs.push(0, P.d);
    if (!xs.length) return { x0: 0, x1: 10, z0: 0, z1: 10 };
    return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
  }

  fit() {
    const b = this.bounds(), cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, size = Math.max(6, b.x1 - b.x0, b.z1 - b.z0);
    this.controls.target.set(cx, 0.5, cz);
    const tall = Math.max(1, 1 / (this.persp.aspect || 1)); // phone held upright → step back further
    this.persp.position.set(cx + size * 0.8 * tall, size * 0.95 * tall, cz + size * 1.15 * tall);
    this.plan.target.set(cx, 0, cz);
    this.ortho.position.set(cx, 100, cz);
    this.ortho.zoom = 1; this.orthoHalf = size * 0.62; this.resize();
    this.walk.pos.set(cx, 1.6, cz); this.walk.yaw = 0; this.walk.pitch = 0;
    this.placeSun();
    this.dirty = true;
  }

  // Sun: from the south-west in the afternoon (Kurdistan) — long soft shadows.
  placeSun(hour = 15) {
    const b = this.bounds(), cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, size = Math.max(8, b.x1 - b.x0, b.z1 - b.z0);
    const az = ((hour - 12) / 6) * (Math.PI / 2), el = Math.max(0.25, Math.cos(((hour - 12) / 7) * (Math.PI / 2)) * 1.05);
    this.sun.position.set(cx + Math.sin(az) * size * 1.4, size * 1.2 * el + 4, cz + Math.cos(az) * size * 1.2);
    this.sun.target.position.set(cx, 0, cz);
    Object.assign(this.sun.shadow.camera, { left: -size, right: size, top: size, bottom: -size, near: 0.5, far: size * 6 });
    this.sun.shadow.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  setView(v) {
    this.view = v;
    this.controls.enabled = v === "3d";
    this.plan.enabled = v === "plan";
    this.camera = v === "plan" ? this.ortho : this.persp;
    if (v === "walk" && this.model.plot) {
      const P = this.model.plot;
      this.walk.pos.set(P.w / 2, 1.6, P.d + 4); this.walk.yaw = 0; this.walk.pitch = -0.05; // on the street, facing the house
    } else if (v === "walk") {
      const b = this.bounds();
      const room = this.model.rooms[0];
      this.walk.pos.set(room ? room.x + room.w / 2 : (b.x0 + b.x1) / 2, 1.6, room ? room.z + room.d * 0.88 : b.z1 - 0.5);
      this.walk.pitch = -0.08; this.walk.yaw = 0;
    }
    this.persp.fov = v === "walk" ? 70 : 50; this.persp.updateProjectionMatrix();
    this.build();
  }

  look(dx, dy) { this.walk.yaw -= dx * 0.005; this.walk.pitch = Math.max(-1.2, Math.min(1.2, this.walk.pitch - dy * 0.004)); this.dirty = true; }
  stepWalk() {
    const w = this.walk;
    if (w.move) {
      const dx = -Math.sin(w.yaw) * w.move * 0.06, dz = -Math.cos(w.yaw) * w.move * 0.06;
      // walls stop you; open doors let you through. Slide along a wall when walking at an angle.
      if (this.free(w.pos.x + dx, w.pos.z + dz)) { w.pos.x += dx; w.pos.z += dz; }
      else if (this.free(w.pos.x + dx, w.pos.z)) w.pos.x += dx;
      else if (this.free(w.pos.x, w.pos.z + dz)) w.pos.z += dz;
      this.dirty = true;
    }
    if (w.turn) { w.yaw += w.turn * 0.03; this.dirty = true; }
    this.persp.position.copy(w.pos);
    this.persp.rotation.set(w.pitch, w.yaw, 0, "YXZ");
  }

  // can a person stand here? (30 cm from any wall, unless it is the gap of a door)
  free(x, z) {
    for (const w of this.model.walls) {
      const L = wallLen(w); if (!L) continue;
      if ((w.built ?? w.h) < 0.5) continue; // you can step over a wall that is still low
      const ux = (w.x2 - w.x1) / L, uz = (w.z2 - w.z1) / L;
      const s = (x - w.x1) * ux + (z - w.z1) * uz;
      if (s < -0.3 || s > L + 0.3) continue;
      const d = Math.abs((x - w.x1) * uz - (z - w.z1) * ux);
      if (d > w.t / 2 + 0.28) continue;
      const door = this.model.openings.some((o) => o.wall === w.id && o.kind === "door" && s > o.at - o.w / 2 + 0.1 && s < o.at + o.w / 2 - 0.1);
      if (!door) return false;
    }
    return true;
  }

  // "build it": the walls rise course by course (20 cm rows of blocks), doors and windows appear when the wall reaches them
  animateBuild(ms = 5200) { this.growStart = performance.now(); this.growMs = ms; this.dirty = true; }
  growStep() {
    const t = Math.min(1, (performance.now() - this.growStart) / this.growMs);
    const maxH = Math.max(3, ...this.model.walls.map((w) => w.h));
    const top = Math.max(0.2, Math.ceil((t * maxH) / 0.2) * 0.2); // whole courses of blocks
    if (top !== this.buildTop) { this.buildTop = top; this.build(); }
    if (t >= 1) { this.growStart = null; this.buildTop = null; this.build(); this.onBuilt?.(); }
  }
  // pouring a roof slab: the concrete fills up and dries from dark to light
  pourStep() {
    const P = this.pouring, t = Math.min(1, (performance.now() - P.t0) / 1800);
    this.group.traverse((o) => {
      if (o.userData?.pour !== P.id) return;
      o.scale.y = Math.max(0.03, t); o.position.y = o.userData.y0 + (0.22 * Math.max(0.03, t)) / 2;
      o.material.color.copy(new THREE.Color("#5c5a56").lerp(new THREE.Color("#bdb8ae"), t * t));
    });
    this.dirty = true;
    if (t >= 1) { this.pouring = null; this.build(); }
  }
  pour(id) { this.pouring = { id, t0: performance.now() }; this.build(); }

  setModel(m) { this.model = m; this.build(); }
  setSelected(id) { this.selected = id; this.build(); }

  build() {
    const g = this.group;
    const kill = (mm) => { if (!mm || mm.shared) return; mm.map?.dispose?.(); mm.dispose?.(); };
    g.traverse((o) => { o.geometry?.dispose?.(); if (Array.isArray(o.material)) o.material.forEach(kill); else kill(o.material); });
    g.clear();
    const plan = this.view === "plan";
    const m = this.model;
    const selColor = new THREE.Color("#e8a317");
    const edgeMat = (this.edgeMat ||= Object.assign(new THREE.LineBasicMaterial({ color: "#2a2a2a", transparent: true, opacity: 0.55 }), { shared: true }));

    const walk = this.view === "walk";
    let lights = 0;
    const P = m.plot;
    if (P) {
      const soil = (P.ground || "grass") === "soil";
      const grass = new THREE.Mesh(new THREE.BoxGeometry(P.w, 0.04, P.d), plan ? new THREE.MeshBasicMaterial({ color: soil ? "#d9c3a5" : "#cfe3c0" }) : surfaceMat(soil ? "soil" : "grass", soil ? "#8b6a48" : "#5d8a3c", P.w, P.d));
      grass.position.set(P.w / 2, -0.02, P.d / 2); grass.receiveShadow = true; g.add(grass);
      // the street in front (asphalt), a kerb and pavement, dashed middle line
      const road = new THREE.Mesh(new THREE.BoxGeometry(P.w + 40, 0.02, 8), plan ? new THREE.MeshBasicMaterial({ color: "#8d8f93" }) : surfaceMat("asphalt", "#3c3e42", P.w + 40, 8));
      road.position.set(P.w / 2, -0.03, P.d + 2 + 4); road.receiveShadow = true; g.add(road);
      const walkway = new THREE.Mesh(new THREE.BoxGeometry(P.w + 40, 0.12, 2), surfaceMat("tile", "#c9c4ba", P.w + 40, 2));
      walkway.position.set(P.w / 2, 0.02, P.d + 1); walkway.receiveShadow = true; g.add(walkway);
      for (let x = -18; x < P.w + 18; x += 4) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(2, 0.025, 0.15), new THREE.MeshBasicMaterial({ color: "#f2f2ea" }));
        dash.position.set(x, -0.01, P.d + 6); g.add(dash);
      }
      // lawn, paving and gravel the user laid in the yard
      for (const pt of m.patches || []) {
        if (pt.kind === "pool" && !plan) { // swimming pool: tiled rim and clear blue water
          const gp = new THREE.Group(); gp.position.set(pt.x + pt.w / 2, 0, pt.z + pt.d / 2);
          const rim = surfaceMat("tile", "#e9e6df", 1, 1);
          for (const [w2, d2, x2, z2] of [[pt.w, 0.3, 0, -pt.d / 2], [pt.w, 0.3, 0, pt.d / 2], [0.3, pt.d, -pt.w / 2, 0], [0.3, pt.d, pt.w / 2, 0]]) {
            const b = new THREE.Mesh(new THREE.BoxGeometry(w2, 0.12, d2), rim); b.position.set(x2, 0.06, z2); b.receiveShadow = true; b.userData = { type: "patch", id: pt.id }; gp.add(b);
          }
          const water = new THREE.Mesh(new THREE.BoxGeometry(pt.w - 0.3, 0.05, pt.d - 0.3), new THREE.MeshPhysicalMaterial({ color: this.selected === pt.id ? "#e8a317" : "#2fa4d9", roughness: 0.05, metalness: 0.1, clearcoat: 1, transmission: 0.2 }));
          water.position.y = 0.03; water.userData = { type: "patch", id: pt.id }; gp.add(water);
          g.add(gp); continue;
        }
        const col = { grass: "#5d8a3c", paving: "#cfc8bb", gravel: "#a8a39a", soil: "#8b6a48" }[pt.kind];
        const mk = pt.kind === "paving" ? "tile" : pt.kind;
        const pm = new THREE.Mesh(new THREE.BoxGeometry(pt.w, 0.03, pt.d), plan ? new THREE.MeshBasicMaterial({ color: { grass: "#a9d18e", paving: "#e3ddd2", gravel: "#cfcac1", soil: "#d9c3a5", pool: "#8fd0ef" }[pt.kind] }) : surfaceMat(mk, col, pt.w, pt.d));
        if (this.selected === pt.id) pm.material.emissive = selColor.clone().multiplyScalar(0.35);
        pm.position.set(pt.x + pt.w / 2, 0.012, pt.z + pt.d / 2); pm.receiveShadow = true;
        pm.userData = { type: "patch", id: pt.id };
        g.add(pm);
      }
      // the plot's edge (dashed gold line) and its size
      const pts = [[0, 0], [P.w, 0], [P.w, P.d], [0, P.d], [0, 0]].map(([x, z]) => new THREE.Vector3(x, 0.05, z));
      const edge = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: "#e8a317", dashSize: 0.5, gapSize: 0.3 }));
      edge.computeLineDistances(); g.add(edge);
      if (!walk) {
        const tag = textSprite(`${P.w}×${P.d} م · ${Math.round(P.w * P.d)} م²`, { size: plan ? 0.3 : 0.45, bg: "rgba(232,163,23,0.95)", color: "#1b1300" });
        tag.position.set(P.w / 2, plan ? 0.3 : 0.6, P.d + 1); g.add(tag);
      }
    }
    for (const rm of m.rooms) {
      const fcol = rm.floor || ROOM_TYPES[rm.type] || ROOM_TYPES.other;
      const mat = plan ? new THREE.MeshStandardMaterial({ color: fcol, roughness: 0.85 }) : surfaceMat(rm.fmat || "tile", fcol, rm.w, rm.d);
      if (this.selected === rm.id) mat.emissive = selColor.clone().multiplyScalar(0.35);
      const f = new THREE.Mesh(new THREE.BoxGeometry(rm.w, 0.06, rm.d), mat);
      f.position.set(rm.x + rm.w / 2, 0.03, rm.z + rm.d / 2); f.receiveShadow = true;
      f.userData = { type: "room", id: rm.id };
      g.add(f);
      const H = m.wallH || 3;
      const roofed = !m.plot || rm.slab; // a plot project has a ceiling only after its slab is poured
      if (!plan && ((walk && roofed) || this.ceiling)) { // ceiling, seen from inside
        const c = new THREE.Mesh(new THREE.PlaneGeometry(rm.w, rm.d), new THREE.MeshStandardMaterial({ color: "#f7f5f0", roughness: 0.95, side: THREE.DoubleSide }));
        c.rotation.x = Math.PI / 2; c.position.set(rm.x + rm.w / 2, H - 0.01, rm.z + rm.d / 2); c.receiveShadow = true;
        g.add(c);
      }
      if (!plan && ((this.roof && !walk) || (rm.slab && (!walk || true)))) { // flat concrete roof slab with a small overhang
        const r = new THREE.Mesh(new THREE.BoxGeometry(rm.w + 0.3, 0.22, rm.d + 0.3), surfaceMat("concrete", "#bdb8ae", rm.w, rm.d));
        r.position.set(rm.x + rm.w / 2, H + 0.11, rm.z + rm.d / 2); r.castShadow = true; r.receiveShadow = true;
        r.userData = { type: "room", id: rm.id, after: H, pour: this.pouring?.id === rm.id ? rm.id : undefined, y0: H };
        g.add(r);
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(r.geometry), edgeMat); e.position.copy(r.position); e.userData = { after: H }; g.add(e);
      }
      if (walk && roofed && lights < 8) { // a warm ceiling light in every room
        const L = new THREE.PointLight(0xffe3b8, 22, 0, 2);
        L.position.set(rm.x + rm.w / 2, H - 0.35, rm.z + rm.d / 2);
        g.add(L); lights++;
      }
      if (this.view !== "walk" && !((this.roof || rm.slab) && !plan)) {
        const area = Math.round(rm.w * rm.d * 10) / 10;
        const label = textSprite(`${rm.name || "—"}\n${rm.w}×${rm.d} م · ${area} م²`, { size: plan ? Math.min(0.45, Math.max(0.2, Math.min(rm.w, rm.d) * 0.09)) : 0.32 });
        label.position.set(rm.x + rm.w / 2, plan ? 0.2 : 3.4, rm.z + rm.d / 2);
        g.add(label);
      }
    }

    for (const w of m.walls) {
      const L = wallLen(w); if (L < 0.01) continue;
      const ang = Math.atan2(w.z2 - w.z1, w.x2 - w.x1);
      const ux = (w.x2 - w.x1) / L, uz = (w.z2 - w.z1) / L;
      const sel = this.selected === w.id;
      const base = w.color || WALL_COLORS[0];
      const mat = new THREE.MeshStandardMaterial({ color: plan ? "#2b2b2b" : base, roughness: 0.9 });
      if (sel) { mat.color = plan ? selColor.clone() : mat.color; mat.emissive = selColor.clone().multiplyScalar(plan ? 0.2 : 0.35); }
      // how high the wall stands now: laid courses (realistic mode) and the build animation
      const Hb = Math.min(w.h, w.built ?? w.h, this.buildTop ?? 99);
      const H = plan ? 0.3 : Hb;
      if (!plan && Hb < 0.01) { // nothing laid yet: only the concrete footing shows where the wall will stand
        const f = new THREE.Mesh(new THREE.BoxGeometry(L + w.t, 0.1, w.t + 0.12), new THREE.MeshStandardMaterial({ color: sel ? "#e8a317" : "#9d9890", roughness: 1 }));
        f.position.set(w.x1 + ux * L / 2, 0.05, w.z1 + uz * L / 2); f.rotation.y = -ang; f.receiveShadow = true;
        f.userData = { type: "wall", id: w.id }; g.add(f);
        continue;
      }
      // raw block or brick on both sides (not plastered yet): drawn as real units with mortar joints
      const RAWK = { block: { l: 0.4, h: 0.2 }, brick: { l: 0.25, h: 0.075 } };
      const raw = !plan && RAWK[w.matA] && w.matA === w.matB ? RAWK[w.matA] : null;
      const units = raw ? [] : null;
      const rawCol = raw ? new THREE.Color(w.colorA || (w.matA === "brick" ? "#b5654f" : "#b9b6ae")) : null;
      const sideMat = (S, s0, s1, y0, y1) => {
        const k = w["mat" + S] || "paint", col = w["color" + S] || base;
        const sm = surfaceMat(k, col, s1 - s0, y1 - y0);
        const size = MATERIALS[k].size;
        sm.map.offset.set((S === "A" ? s0 : -s1) / size, y0 / size); // keeps the pattern continuous along the wall
        if (sel) sm.emissive = selColor.clone().multiplyScalar(0.3);
        return sm;
      };
      const piece = (s0, s1, y0, y1) => {
        y1 = Math.min(y1, H);
        if (s1 - s0 < 0.005 || y1 - y0 < 0.005) return;
        if (raw) { // mortar core + one unit per block, running bond (every other course shifted half a block)
          const core = new THREE.Mesh(new THREE.BoxGeometry(s1 - s0, y1 - y0, w.t * 0.9), new THREE.MeshStandardMaterial({ color: "#8f8b84", roughness: 1 }));
          const midc = (s0 + s1) / 2;
          core.position.set(w.x1 + ux * midc, (y0 + y1) / 2, w.z1 + uz * midc); core.rotation.y = -ang; core.receiveShadow = true;
          core.userData = { type: "wall", id: w.id }; g.add(core);
          const J = 0.012; // joint
          for (let k = Math.floor(y0 / raw.h); k * raw.h < y1 - 0.001; k++) {
            const cy0 = Math.max(y0, k * raw.h), cy1 = Math.min(y1, (k + 1) * raw.h);
            if (cy1 - cy0 < 0.01) continue;
            const off = (k % 2) * raw.l / 2;
            for (let x = Math.floor((s0 - off) / raw.l) * raw.l + off; x < s1; x += raw.l) {
              const a0 = Math.max(s0, x) + J / 2, a1 = Math.min(s1, x + raw.l) - J / 2;
              if (a1 - a0 < 0.02) continue;
              units.push({ s: (a0 + a1) / 2, len: a1 - a0, y: (cy0 + cy1) / 2, hh: cy1 - cy0 - J, shade: 0.88 + ((k * 7 + Math.round(x * 13)) % 9) * 0.03 });
            }
          }
          return;
        }
        // box faces: 0 +x end, 1 −x end, 2 top, 3 bottom, 4 side A (+z), 5 side B (−z)
        const mats = plan ? mat : [mat, mat, mat, mat, sideMat("A", s0, s1, y0, y1), sideMat("B", s0, s1, y0, y1)];
        const b = new THREE.Mesh(new THREE.BoxGeometry(s1 - s0, y1 - y0, w.t), mats);
        const mid = (s0 + s1) / 2;
        b.position.set(w.x1 + ux * mid, (y0 + y1) / 2, w.z1 + uz * mid);
        b.rotation.y = -ang; b.castShadow = !plan; b.receiveShadow = true;
        b.userData = { type: "wall", id: w.id, grow: plan ? null : { y0, y1 } };
        g.add(b);
        if (!plan) { // dark outline edges, the SketchUp look: every shape stays readable
          const e = new THREE.LineSegments(new THREE.EdgesGeometry(b.geometry), edgeMat);
          e.position.copy(b.position); e.rotation.copy(b.rotation);
          e.userData = { after: y1 }; // outline shows once that piece is finished
          g.add(e);
        }
      };
      const ops = m.openings.filter((o) => o.wall === w.id).sort((a, b) => a.at - b.at);
      let s = -w.t / 2;
      for (const o of ops) {
        const a = Math.max(0, o.at - o.w / 2), b = Math.min(L, o.at + o.w / 2);
        piece(s, a, 0, H);
        if (!plan) { piece(a, b, 0, o.sill); piece(a, b, o.sill + o.h, H); }
        // the door / window itself
        const mid = (a + b) / 2;
        if (plan) {
          const sym = new THREE.Mesh(new THREE.BoxGeometry(b - a, 0.32, w.t * (o.kind === "window" ? 0.5 : 0.15)),
            new THREE.MeshBasicMaterial({ color: o.kind === "window" ? "#4aa3df" : "#b07a3c" }));
          sym.position.set(w.x1 + ux * mid, 0.16, w.z1 + uz * mid); sym.rotation.y = -ang;
          sym.userData = { type: "opening", id: o.id }; g.add(sym);
          if (o.kind === "door") { // swing arc
            const arc = new THREE.Mesh(new THREE.RingGeometry(o.w - 0.03, o.w, 24, 1, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#b07a3c", side: THREE.DoubleSide }));
            arc.rotation.x = -Math.PI / 2; arc.rotation.z = ang + Math.PI;
            arc.position.set(w.x1 + ux * b, 0.17, w.z1 + uz * b);
            g.add(arc);
          }
        } else if (Hb < o.sill + o.h - 0.01) {
          // the wall hasn't reached the top of this opening yet: leave the gap, no door / window fitted
        } else if (o.kind === "door") {
          // doors stand OPEN on their hinges (so you can walk through); a fence gate is two open leaves of metal bars
          let nx = -uz, nz = ux; // the side the door opens to
          if (w.fence && m.plot) { const cx = m.plot.w / 2 - (w.x1 + ux * mid), cz = m.plot.d / 2 - (w.z1 + uz * mid); if (nx * cx + nz * cz < 0) { nx = -nx; nz = -nz; } }
          const leaf = (hx, hz, len, sign) => { // hinge point, leaf length, sign: +1 opens from start side, −1 from end side
            const open = 1.35, dx = sign * ux * Math.cos(open) + nx * Math.sin(open), dz = sign * uz * Math.cos(open) + nz * Math.sin(open);
            const gr = new THREE.Group(); gr.position.set(hx, 0, hz); gr.rotation.y = -Math.atan2(dz, dx);
            gr.userData = { type: "opening", id: o.id, after: o.h };
            const sel2 = this.selected === o.id;
            if (w.fence) {
              const metal = new THREE.MeshStandardMaterial({ color: sel2 ? "#e8a317" : "#2d2f33", metalness: 0.6, roughness: 0.4 });
              for (const y of [0.12, o.h - 0.06]) { const r = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.05), metal); r.position.set(len / 2, y, 0); r.userData = gr.userData; gr.add(r); }
              for (let x = 0.03; x < len; x += 0.13) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, o.h - 0.12, 0.03), metal); bar.position.set(x, o.h / 2 + 0.03, 0); bar.castShadow = true; bar.userData = gr.userData; gr.add(bar); }
            } else {
              const d = new THREE.Mesh(new THREE.BoxGeometry(len, o.h - 0.02, 0.045), new THREE.MeshStandardMaterial({ color: sel2 ? "#e8a317" : "#8a5a32", roughness: 0.55 }));
              d.position.set(len / 2, o.h / 2, 0); d.castShadow = true; d.userData = gr.userData; gr.add(d);
            }
            g.add(gr);
          };
          const ax = w.x1 + ux * a, az = w.z1 + uz * a, bx = w.x1 + ux * b, bz = w.z1 + uz * b;
          if (w.fence && b - a > 1.6) { leaf(ax, az, (b - a) / 2 - 0.02, 1); leaf(bx, bz, (b - a) / 2 - 0.02, -1); }
          else leaf(ax, az, b - a - 0.04, 1);
        } else {
          const glass = new THREE.Mesh(new THREE.BoxGeometry(b - a, o.h, 0.03), new THREE.MeshPhysicalMaterial({ color: this.selected === o.id ? "#ffd27a" : "#bfe3f5", roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.55 }));
          glass.position.set(w.x1 + ux * mid, o.sill + o.h / 2, w.z1 + uz * mid); glass.rotation.y = -ang;
          glass.userData = { type: "opening", id: o.id, after: o.sill + o.h }; g.add(glass);
          const frame = new THREE.Mesh(new THREE.BoxGeometry(b - a + 0.06, 0.06, w.t + 0.04), new THREE.MeshStandardMaterial({ color: "#f5f5f5" }));
          frame.position.set(w.x1 + ux * mid, o.sill, w.z1 + uz * mid); frame.rotation.y = -ang; frame.userData = { after: o.sill }; g.add(frame);
        }
        s = b;
      }
      piece(s, L + w.t / 2, 0, H);
      if (units?.length) {
        const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.95 }), units.length);
        const M = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -ang), c = new THREE.Color();
        units.forEach((u, i) => {
          M.compose(new THREE.Vector3(w.x1 + ux * u.s, u.y, w.z1 + uz * u.s), q, new THREE.Vector3(u.len, u.hh, w.t));
          im.setMatrixAt(i, M);
          im.setColorAt(i, c.copy(rawCol).multiplyScalar(sel ? 1.25 : u.shade));
        });
        im.castShadow = true; im.receiveShadow = true;
        im.userData = { type: "wall", id: w.id };
        g.add(im);
      }
      if (plan) { // length label beside each wall
        const lab = textSprite(`${Math.round(L * 100) / 100} م`, { size: 0.22, color: "#5a4a2a", bg: "rgba(255,248,225,0.92)", bold: false });
        lab.position.set(w.x1 + ux * (L / 2) + uz * (w.t / 2 + 0.28), 0.35, w.z1 + uz * (L / 2) - ux * (w.t / 2 + 0.28));
        g.add(lab);
      }
    }
    this.grid.visible = this.view !== "walk";
    this.scene.background = plan ? this.planBg : this.sky;
    this.syncItems();
    this.dirty = true;
  }

  // ---------- furniture (real 3D models) ----------
  // resolve(ph) → { url, include } is given by the app (it asks the server for the model's files)
  async loadBase(ph) {
    this.bases ||= new Map();
    if (this.bases.has(ph)) return this.bases.get(ph);
    const p = (async () => {
      const f = await this.resolve(ph);
      const load = (proxied) => {
        const PX = (u) => "/api/m?u=" + encodeURIComponent(u);
        const mgr = new THREE.LoadingManager();
        mgr.setURLModifier((u) => {
          let d = u; try { d = decodeURIComponent(u); } catch {}
          for (const [k, v] of Object.entries(f.include || {})) if (d.endsWith("/" + k) || d.endsWith(k)) return proxied ? PX(v) : v;
          return u;
        });
        const l = new GLTFLoader(mgr); l.setCrossOrigin("anonymous");
        return l.loadAsync(proxied ? PX(f.url) : f.url);
      };
      let gltf; try { gltf = await load(false); } catch { gltf = await load(true); }
      const obj = gltf.scene;
      obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      const b = new THREE.Box3().setFromObject(obj), c = b.getCenter(new THREE.Vector3());
      obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= b.min.y; // stand it on the floor, centred
      const wrap = new THREE.Group(); wrap.add(obj);
      wrap.userData.size = b.getSize(new THREE.Vector3());
      return wrap;
    })();
    this.bases.set(ph, p);
    p.catch(() => this.bases.delete(ph));
    return p;
  }
  syncItems() {
    const items = this.model.items || [];
    this.itemObjs ||= new Map();
    const want = new Set(items.map((i) => i.id));
    for (const [id, o] of this.itemObjs) if (!want.has(id)) { this.items3d.remove(o); this.itemObjs.delete(id); }
    for (const it of items) {
      let o = this.itemObjs.get(it.id);
      const sig = it.prop ? it.prop + (it.color || "") : null;
      if (o && sig && o.userData.sig !== sig) { this.items3d.remove(o); this.itemObjs.delete(it.id); o = null; }
      if (!o && it.prop) {
        o = makeProp(it.prop, it.color);
        o.traverse((x) => { x.userData = { ...x.userData, type: "item", id: it.id }; });
        o.userData = { type: "item", id: it.id, sig };
        this.itemObjs.set(it.id, o); this.items3d.add(o);
      }
      if (!o) {
        o = new THREE.Group(); o.userData = { type: "item", id: it.id };
        this.itemObjs.set(it.id, o); this.items3d.add(o);
        // a light box while the model downloads
        const ph = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshStandardMaterial({ color: "#e8b44a", transparent: true, opacity: 0.35 }));
        ph.position.y = 0.3; ph.userData = { type: "item", id: it.id }; o.add(ph);
        if (it.pic && this.resolvePic) this.resolvePic(it.pic).then(({ url, ar }) => {
          if (!this.itemObjs.has(it.id)) return;
          const tex = new THREE.TextureLoader().load(url, () => (this.dirty = true));
          tex.colorSpace = THREE.SRGBColorSpace;
          const h = it.h || 1, wpx = h * (ar || 1);
          const geo = new THREE.PlaneGeometry(wpx, h); geo.translate(0, h / 2, 0);
          const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide, toneMapped: false }));
          mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
          mesh.castShadow = true; mesh.userData = { type: "item", id: it.id };
          o.clear(); o.add(mesh); this.dirty = true;
        }).catch(() => { ph.material.color.set("#e5484d"); this.dirty = true; });
        else if (this.resolve && it.ph) this.loadBase(it.ph).then((base) => {
          if (!this.itemObjs.has(it.id)) return;
          o.clear();
          const copy = base.clone(true);
          copy.traverse((x) => { x.userData = { type: "item", id: it.id }; });
          o.add(copy); o.userData.size = base.userData.size;
          this.dirty = true; this.onItemLoaded?.(it.id);
        }).catch(() => { ph.material.color.set("#e5484d"); this.dirty = true; });
      }
      o.position.set(it.x, it.y || 0, it.z);
      o.rotation.y = ((it.rot || 0) * Math.PI) / 180;
      o.scale.setScalar(it.s || 1);
    }
    // selection box
    if (this.selBox) { this.scene.remove(this.selBox); this.selBox = null; }
    const so = this.itemObjs.get(this.selected);
    if (so) { this.selBox = new THREE.BoxHelper(so, 0xe8a317); this.scene.add(this.selBox); }
    this.dirty = true;
  }
  // move a piece of furniture while the finger drags it (saved when the finger lifts)
  moveItem(id, x, z) {
    const o = this.itemObjs?.get(id); if (!o) return;
    o.position.x = x; o.position.z = z;
    this.selBox?.update(); this.dirty = true;
  }

  // temporary drawing: lines being drawn, a room rectangle, a measured distance
  setPreview(items) {
    this.overlay.traverse((o) => { o.geometry?.dispose?.(); o.material?.map?.dispose?.(); o.material?.dispose?.(); });
    this.overlay.clear();
    for (const it of items || []) {
      if (it.kind === "dot") {
        const d = new THREE.Mesh(new THREE.CircleGeometry(0.12, 20), new THREE.MeshBasicMaterial({ color: it.color || "#e8a317", depthTest: false }));
        d.rotation.x = -Math.PI / 2; d.position.set(it.x, 0.4, it.z); d.renderOrder = 20; this.overlay.add(d);
      } else if (it.kind === "line") {
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(it.x1, 0.4, it.z1), new THREE.Vector3(it.x2, 0.4, it.z2)]);
        const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: it.color || "#e8a317", depthTest: false }));
        l.renderOrder = 20; this.overlay.add(l);
        if (it.label) { const s = textSprite(it.label, { size: 0.26, bg: "rgba(232,163,23,0.95)", color: "#1b1300" }); s.position.set((it.x1 + it.x2) / 2, 0.6, (it.z1 + it.z2) / 2); this.overlay.add(s); }
      }
    }
    this.dirty = true;
  }

  // screen point → a point on the floor (y = 0)
  toFloor(cx, cy) {
    const rect = this.canvas.getBoundingClientRect();
    const v = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(v, this.camera);
    const p = new THREE.Vector3();
    return this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p) ? { x: p.x, z: p.z } : null;
  }

  // what is under the finger: a door/window, a wall (with the spot along it) or a room
  pick(cx, cy) {
    const rect = this.canvas.getBoundingClientRect();
    const v = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(v, this.camera);
    const hits = [...this.ray.intersectObjects(this.items3d.children, true), ...this.ray.intersectObjects(this.group.children, false)].filter((h) => h.object.userData?.type);
    const order = { item: -1, opening: 0, wall: 1, room: 2, patch: 3 };
    hits.sort((a, b) => (order[a.object.userData.type] - order[b.object.userData.type]) || a.distance - b.distance);
    const h = hits[0];
    if (!h) return null;
    const out = { ...h.object.userData, point: { x: h.point.x, z: h.point.z } };
    if (out.type === "wall") {
      const w = this.model.walls.find((x) => x.id === out.id);
      const L = wallLen(w);
      out.at = Math.max(0, Math.min(L, ((h.point.x - w.x1) * (w.x2 - w.x1) + (h.point.z - w.z1) * (w.z2 - w.z1)) / (L || 1)));
      // which face was touched: the side of the wall line the hit point is on (side A = local +z)
      const dz2 = -(h.point.x - w.x1) * Math.sin(Math.atan2(w.z2 - w.z1, w.x2 - w.x1)) + (h.point.z - w.z1) * Math.cos(Math.atan2(w.z2 - w.z1, w.x2 - w.x1));
      out.side = Math.abs(dz2) < w.t * 0.35 ? null : dz2 > 0 ? "a" : "b";
    }
    return out;
  }

  // snap a floor point: wall ends (30 cm), straight lines from the last point, then a 5 cm grid
  snap(p, from) {
    if (!p) return null;
    let best = null, bd = this.view === "plan" ? 0.3 : 0.45;
    for (const w of this.model.walls) for (const [x, z] of [[w.x1, w.z1], [w.x2, w.z2]]) {
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bd) { bd = d; best = { x, z, end: true }; }
    }
    if (best) return best;
    let { x, z } = p;
    if (from) {
      const dx = x - from.x, dz = z - from.z;
      if (Math.abs(dx) < Math.abs(dz) * 0.14) x = from.x; else if (Math.abs(dz) < Math.abs(dx) * 0.14) z = from.z;
    }
    const g = (v) => Math.round(v * 20) / 20;
    return { x: from && x === from.x ? x : g(x), z: from && z === from.z ? z : g(z) };
  }

  // picture of the current view; scale 2 ≈ 4K on most screens
  snapshot(long = 3840) {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight, pr = this.r.getPixelRatio();
    const k = long / Math.max(w, h);
    this.r.setPixelRatio(1); this.r.setSize(Math.round(w * k), Math.round(h * k), false);
    this.r.render(this.scene, this.camera);
    const url = this.canvas.toDataURL("image/png");
    this.r.setPixelRatio(pr); this.r.setSize(w, h, false); this.dirty = true;
    return url;
  }

  async exportGLB() {
    const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
    const keep = this.view; if (keep === "plan") this.setView("3d");
    const res = await new GLTFExporter().parseAsync(this.group, { binary: true, onlyVisible: true });
    if (keep === "plan") this.setView("plan");
    return new Blob([res], { type: "model/gltf-binary" });
  }

  dispose() {
    this.alive = false;
    this.controls.dispose(); this.plan.dispose();
    this.group.clear(); this.overlay.clear();
    this.r.dispose();
  }
}
