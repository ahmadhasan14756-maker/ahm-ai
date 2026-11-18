// AHM 3D Studio — the building model and its 3D view (three.js).
// The model is plain JSON in metres, seen from above like a floor plan: x = to the right, z = down the page, y = up.
//   walls:    { id, x1, z1, x2, z2, t (thickness), h (height), color }
//   openings: { id, wall, at (centre, metres from the wall's start), w, h, sill, kind: "door" | "window" }
//   rooms:    { id, name, type, x, z, w, d, floor (colour) }
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export const ROOM_TYPES = {
  living: "#eadcc4", guest: "#efd9d0", bedroom: "#d8e3ee", kitchen: "#dcecd8", dining: "#ebe2cf", bath: "#d3eaee",
  hall: "#e9e4da", stairs: "#e2ddd4", garage: "#dadada", office: "#e0e6d6", storage: "#e4e0d8", balcony: "#e6eee0", other: "#e6e1d8",
};
export const WALL_COLORS = ["#ebe4d6", "#f2eee6", "#e9dfcc", "#d9cbb3", "#c9b28f", "#b9c7cf", "#cfd8c4", "#e8d3c7", "#9a9a9a", "#4a4a4a"];

let seq = Date.now() % 100000;
export const uid = (p) => p + (seq++).toString(36);
const r2 = (v) => Math.round(v * 100) / 100;

export const emptyModel = () => ({ v: 1, walls: [], openings: [], rooms: [], wallH: 3 });

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
    const key = (hor ? "h" : "v") + ":" + (hor ? r2(w.z1) : r2(w.x1)).toFixed(2);
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
        cur = { a: s.a, b: s.b, t: base.t, h: base.h, color: base.color, id: base.id, hor: s.hor, line: s.hor ? base.z1 : base.x1,
          make() { return this.hor ? { id: this.id, x1: r2(this.a), z1: r2(this.line), x2: r2(this.b), z2: r2(this.line), t: this.t, h: this.h, color: this.color }
            : { id: this.id, x1: r2(this.line), z1: r2(this.a), x2: r2(this.line), z2: r2(this.b), t: this.t, h: this.h, color: this.color }; } };
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
  let out = { ...m, walls: [...m.walls], openings: [...m.openings], rooms: [...m.rooms] };
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
        out.rooms = out.rooms.map((r) => (r.id === op.id ? { ...r, ...clean({ name: op.name != null ? String(op.name).slice(0, 40) : undefined, type: ROOM_TYPES[op.type] ? op.type : undefined, floor: typeof op.floor === "string" && /^#[0-9a-f]{6}$/i.test(op.floor) ? op.floor : undefined }) } : r));
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
        out.rooms = out.rooms.filter((r) => r.id !== op.id);
        out.openings = out.openings.filter((o) => o.id !== op.id && o.wall !== op.id);
      } else if (op.op === "clear") {
        out = emptyModel();
      }
    } catch { /* skip a broken edit */ }
  }
  out.openings = out.openings.filter((o) => out.walls.some((w) => w.id === o.wall));
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
    if (v === "walk") {
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
      w.pos.x += -Math.sin(w.yaw) * w.move * 0.06; w.pos.z += -Math.cos(w.yaw) * w.move * 0.06; this.dirty = true;
    }
    if (w.turn) { w.yaw += w.turn * 0.03; this.dirty = true; }
    this.persp.position.copy(w.pos);
    this.persp.rotation.set(w.pitch, w.yaw, 0, "YXZ");
  }

  setModel(m) { this.model = m; this.build(); }
  setSelected(id) { this.selected = id; this.build(); }

  build() {
    const g = this.group;
    g.traverse((o) => { o.geometry?.dispose?.(); if (o.material && !o.material.shared) { o.material.map?.dispose?.(); o.material.dispose?.(); } });
    g.clear();
    const plan = this.view === "plan";
    const m = this.model;
    const selColor = new THREE.Color("#e8a317");
    const edgeMat = (this.edgeMat ||= Object.assign(new THREE.LineBasicMaterial({ color: "#2a2a2a", transparent: true, opacity: 0.55 }), { shared: true }));

    for (const rm of m.rooms) {
      const mat = new THREE.MeshStandardMaterial({ color: rm.floor || ROOM_TYPES[rm.type] || ROOM_TYPES.other, roughness: 0.85 });
      if (this.selected === rm.id) mat.emissive = selColor.clone().multiplyScalar(0.35);
      const f = new THREE.Mesh(new THREE.BoxGeometry(rm.w, 0.06, rm.d), mat);
      f.position.set(rm.x + rm.w / 2, 0.03, rm.z + rm.d / 2); f.receiveShadow = true;
      f.userData = { type: "room", id: rm.id };
      g.add(f);
      if (this.view !== "walk") {
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
      const mat = new THREE.MeshStandardMaterial({ color: plan ? "#2b2b2b" : w.color || WALL_COLORS[0], roughness: 0.9 });
      if (sel) { mat.color = plan ? selColor.clone() : mat.color; mat.emissive = selColor.clone().multiplyScalar(plan ? 0.2 : 0.35); }
      const H = plan ? 0.3 : w.h;
      const piece = (s0, s1, y0, y1) => {
        if (s1 - s0 < 0.005 || y1 - y0 < 0.005) return;
        const b = new THREE.Mesh(new THREE.BoxGeometry(s1 - s0, y1 - y0, w.t), mat);
        const mid = (s0 + s1) / 2;
        b.position.set(w.x1 + ux * mid, (y0 + y1) / 2, w.z1 + uz * mid);
        b.rotation.y = -ang; b.castShadow = !plan; b.receiveShadow = true;
        b.userData = { type: "wall", id: w.id };
        g.add(b);
        if (!plan) { // dark outline edges, the SketchUp look: every shape stays readable
          const e = new THREE.LineSegments(new THREE.EdgesGeometry(b.geometry), edgeMat);
          e.position.copy(b.position); e.rotation.copy(b.rotation);
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
        } else if (o.kind === "door") {
          const d = new THREE.Mesh(new THREE.BoxGeometry(b - a - 0.04, o.h - 0.02, 0.045), new THREE.MeshStandardMaterial({ color: this.selected === o.id ? "#e8a317" : "#8a5a32", roughness: 0.55 }));
          d.position.set(w.x1 + ux * mid, o.h / 2, w.z1 + uz * mid); d.rotation.y = -ang; d.castShadow = true;
          d.userData = { type: "opening", id: o.id }; g.add(d);
        } else {
          const glass = new THREE.Mesh(new THREE.BoxGeometry(b - a, o.h, 0.03), new THREE.MeshPhysicalMaterial({ color: this.selected === o.id ? "#ffd27a" : "#bfe3f5", roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.55 }));
          glass.position.set(w.x1 + ux * mid, o.sill + o.h / 2, w.z1 + uz * mid); glass.rotation.y = -ang;
          glass.userData = { type: "opening", id: o.id }; g.add(glass);
          const frame = new THREE.Mesh(new THREE.BoxGeometry(b - a + 0.06, 0.06, w.t + 0.04), new THREE.MeshStandardMaterial({ color: "#f5f5f5" }));
          frame.position.set(w.x1 + ux * mid, o.sill, w.z1 + uz * mid); frame.rotation.y = -ang; g.add(frame);
        }
        s = b;
      }
      piece(s, L + w.t / 2, 0, H);
      if (plan) { // length label beside each wall
        const lab = textSprite(`${Math.round(L * 100) / 100} م`, { size: 0.22, color: "#5a4a2a", bg: "rgba(255,248,225,0.92)", bold: false });
        lab.position.set(w.x1 + ux * (L / 2) + uz * (w.t / 2 + 0.28), 0.35, w.z1 + uz * (L / 2) - ux * (w.t / 2 + 0.28));
        g.add(lab);
      }
    }
    this.grid.visible = this.view !== "walk";
    this.dirty = true;
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
    const hits = this.ray.intersectObjects(this.group.children, false).filter((h) => h.object.userData?.type);
    const order = { opening: 0, wall: 1, room: 2 };
    hits.sort((a, b) => (order[a.object.userData.type] - order[b.object.userData.type]) || a.distance - b.distance);
    const h = hits[0];
    if (!h) return null;
    const out = { ...h.object.userData, point: { x: h.point.x, z: h.point.z } };
    if (out.type === "wall") {
      const w = this.model.walls.find((x) => x.id === out.id);
      const L = wallLen(w);
      out.at = Math.max(0, Math.min(L, ((h.point.x - w.x1) * (w.x2 - w.x1) + (h.point.z - w.z1) * (w.z2 - w.z1)) / (L || 1)));
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
