"use client";
// AHM 3D Studio — draw a building in 2D/3D with the finger, or tell the AI in Kurdish what to change.
// Preview for the owner only (the button shows only for the owner; the AI route checks it too).
import { useEffect, useRef, useState } from "react";
import { Studio3D, emptyModel, applyOps, addRoom, planToModel, boq, wallLen, uid, ROOM_TYPES, WALL_COLORS, DEFAULT_PRICES } from "../lib/studio3d";

const T = {
  title: ["AHM 3D Studio", "AHM 3D Studio"],
  beta: ["تاقیکردنەوە · تەنها تۆ دەیبینیت", "Preview · only you can see it"],
  back: ["گەڕانەوە", "Back"],
  v3d: ["3D", "3D"], vplan: ["نەخشە", "Plan"], vwalk: ["🚶 پیاسە", "🚶 Walk"],
  select: ["دیاریکردن", "Select"], wall: ["دیوار", "Wall"], room: ["ژوور", "Room"], door: ["دەرگا", "Door"], window: ["پەنجەرە", "Window"],
  measure: ["پێوانە", "Measure"], erase: ["سڕینەوە", "Erase"], undo: ["گەڕانەوە", "Undo"], redo: ["دووبارە", "Redo"],
  ai: ["🤖 AI", "🤖 AI"], cost: ["💰 تێچوون", "💰 Cost"], file: ["📁 فایل", "📁 File"], props: ["⚙️ تایبەتمەندی", "⚙️ Properties"],
  h_wall: ["خاڵی یەکەم دابگرە، پاشان خاڵی دووەم. بۆ وەستان هەمان خاڵ دووبارە دابگرە یان «✓ تەواو».", "Tap the first point, then the next. Tap the same point again or «✓ Done» to stop."],
  h_room: ["دوو گۆشەی بەرامبەر دابگرە، یان قەبارە بنووسە (وەک 4×5) و یەک جار دابگرە.", "Tap two opposite corners, or type a size (like 4×5) and tap once."],
  h_door: ["لەسەر دیوارێک دابگرە بۆ دانانی دەرگا.", "Tap a wall to put a door."],
  h_window: ["لەسەر دیوارێک دابگرە بۆ دانانی پەنجەرە.", "Tap a wall to put a window."],
  h_measure: ["دوو خاڵ دابگرە بۆ پێوانە.", "Tap two points to measure."],
  h_erase: ["لەسەر هەر شتێک دابگرە بۆ سڕینەوەی.", "Tap anything to delete it."],
  h_select: ["لەسەر دیوار، دەرگا، پەنجەرە یان ژوور دابگرە بۆ گۆڕینی.", "Tap a wall, door, window or room to edit it."],
  h_walk: ["پەنجە ڕابکێشە بۆ سەیرکردن، دوگمەکان بۆ ڕۆیشتن.", "Drag to look around, buttons to move."],
  done: ["✓ تەواو", "✓ Done"], len: ["درێژی (م)", "Length (m)"], size: ["قەبارە (وەک 4×5)", "Size (like 4×5)"],
  empty1: ["دەست پێبکە", "Get started"],
  empty2: ["بە پەنجە بیکێشە، نەخشەیەک بنێرە، یان بە کوردی بە AI بڵێ چی دروست بکات.", "Draw with your finger, send a floor plan, or tell the AI in Kurdish what to build."],
  sample: ["🏠 خانوویەکی نموونە", "🏠 Sample house"], fromPlan: ["📐 نەخشە ← 3D", "📐 Plan → 3D"], askAi: ["🤖 بە AI بڵێ", "🤖 Ask the AI"],
  aiPh: ["بۆ نموونە: ژوورێکی نوستنی ٤×٤ لە لای ڕاستی هۆڵەکە زیاد بکە", "e.g. add a 4×4 bedroom to the right of the living room"],
  send: ["ناردن", "Send"], thinking: ["AI بیر دەکاتەوە…", "The AI is thinking…"],
  sug1: ["دیوارە دەرەکییەکان ٣٠ سم ئەستوور بکە", "Make the outside walls 30 cm thick"],
  sug2: ["پەنجەرە بخەرە سەر هەموو دیوارە دەرەکییەکان", "Put windows on all outside walls"],
  sug3: ["چێشتخانەیەکی ٣×٤ لە خوارەوەی هۆڵەکە زیاد بکە", "Add a 3×4 kitchen below the living room"],
  sug4: ["بەرزی هەموو دیوارەکان بکە ٣.٢ م", "Make all walls 3.2 m high"],
  thick: ["ئەستووری (م)", "Thickness (m)"], height: ["بەرزی (م)", "Height (m)"], length: ["درێژی", "Length"], color: ["ڕەنگ", "Colour"],
  width: ["پانی (م)", "Width (m)"], sill: ["بەرزی لە زەوی (م)", "Sill (m)"], name: ["ناو", "Name"], type: ["جۆر", "Type"],
  addDoor: ["+ دەرگا", "+ Door"], addWin: ["+ پەنجەرە", "+ Window"], del: ["🗑️ سڕینەوە", "🗑️ Delete"],
  nothingSel: ["هیچ شتێک دیاری نەکراوە. ئامرازی «دیاریکردن» بەکاربهێنە.", "Nothing selected. Use the Select tool."],
  costNote: ["خەمڵاندنێکی سەرەتاییە. نرخەکان نموونەن بە دینار، بیانگۆڕە بۆ نرخی بازاڕی ناوچەکەت.", "A rough estimate. Prices are examples in IQD — change them to your local prices."],
  total: ["کۆی گشتی", "Total"], floorA: ["ڕووبەری زەوی", "Floor area"], wallA: ["ڕووبەری دیوار", "Wall area"],
  c_block: ["بلۆک", "Blocks"], c_plaster: ["گەچ و سمنت", "Plaster"], c_paint: ["بۆیە", "Paint"], c_tile: ["کاشی", "Floor tiles"],
  c_concrete: ["کۆنکرێتی سەقف", "Roof concrete"], c_door: ["دەرگا", "Doors"], c_window: ["پەنجەرە", "Windows"],
  newM: ["🆕 نوێ", "🆕 New"], saveJ: ["💾 پاشەکەوت (فایل)", "💾 Save (file)"], openJ: ["📂 کردنەوەی فایل", "📂 Open file"],
  png: ["🖼️ وێنەی 4K", "🖼️ 4K picture"], glb: ["🧊 مۆدێلی 3D (GLB)", "🧊 3D model (GLB)"], sunT: ["☀️ کاتی خۆر", "☀️ Sun time"],
  reading: ["نەخشەکە دەخوێنرێتەوە…", "Reading the plan…"], planDone: ["نەخشەکە کرا بە 3D ✅ ئێستا دەتوانیت دەستکاری بکەیت.", "The plan is now 3D ✅ You can edit it."],
  planFail: ["نەتوانرا نەخشەکە بخوێنرێتەوە. وێنەیەکی ڕوونتر تاقی بکەرەوە.", "Couldn't read the plan. Try a clearer picture."],
  confirmNew: ["مۆدێلەکە بسڕدرێتەوە و لە سەرەتاوە دەست پێبکەیت؟", "Clear the model and start again?"],
  aiFail: ["AI وەڵامی نەدایەوە. دووبارە هەوڵ بدەرەوە.", "The AI didn't answer. Try again."], saved: ["پاشەکەوت کرا", "Saved"],
  floorN: ["نهۆمی", "Floor"], measured: ["دووری", "Distance"],
};
const TYPE_NAMES = { living: ["هۆڵ", "Living"], guest: ["دیوەخان", "Guest"], bedroom: ["ژووری نوستن", "Bedroom"], kitchen: ["چێشتخانە", "Kitchen"], dining: ["نانخواردن", "Dining"],
  bath: ["حەمام / ئاودەست", "Bath"], hall: ["ڕاڕەو", "Hall"], stairs: ["پەیژە", "Stairs"], garage: ["گەراج", "Garage"], office: ["ئۆفیس", "Office"], storage: ["کۆگا", "Storage"], balcony: ["باڵکۆن", "Balcony"], other: ["تر", "Other"] };

const KEY = "ahm3d:v1", PKEY = "ahm3d:prices";
const fa = (s) => String(s).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٫,]/g, ".");
const fmt = (n) => Math.round(n).toLocaleString("en-US");

function sampleHouse() {
  let m = emptyModel();
  m = addRoom(m, { name: "هۆڵ", type: "living", x: 0, z: 0, w: 6, d: 5 });
  m = addRoom(m, { name: "ژووری نوستن", type: "bedroom", x: 6, z: 0, w: 4, d: 4 });
  m = addRoom(m, { name: "چێشتخانە", type: "kitchen", x: 0, z: 5, w: 4, d: 3.5 });
  m = addRoom(m, { name: "حەمام", type: "bath", x: 6, z: 4, w: 2.2, d: 2.5 });
  m = addRoom(m, { name: "ڕاڕەو", type: "hall", x: 4, z: 5, w: 2, d: 3.5 });
  const outer = (pred) => m.walls.find(pred)?.id;
  const top = outer((w) => w.z1 === 0 && w.z2 === 0 && w.x1 === 0);
  const right = outer((w) => w.x1 === 10 && w.x2 === 10);
  const front = outer((w) => w.z1 === 8.5 && w.z2 === 8.5);
  const mid = outer((w) => w.x1 === 6 && w.x2 === 6);
  return applyOps(m, [
    top && { op: "addOpening", wall: top, kind: "window", at: 3, w: 2.2, h: 1.4, sill: 0.9 },
    right && { op: "addOpening", wall: right, kind: "window", at: 2, w: 1.4, h: 1.2, sill: 1 },
    front && { op: "addOpening", wall: front, kind: "door", at: 5, w: 1.1, h: 2.2 },
    front && { op: "addOpening", wall: front, kind: "window", at: 2, w: 1.4, h: 1.2, sill: 1 },
    mid && { op: "addOpening", wall: mid, kind: "door", at: 2.5, w: 0.9, h: 2.1 },
  ].filter(Boolean));
}

async function shrinkImage(file, max = 1400) {
  const url = URL.createObjectURL(file);
  try {
    const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    const k = Math.min(1, max / Math.max(im.width, im.height));
    const c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.88).split(",")[1];
  } finally { URL.revokeObjectURL(url); }
}

function download(href, name) { const a = document.createElement("a"); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }

export default function Studio3DView({ lang, getToken, onBack }) {
  const L = lang === "en" ? 1 : 0;
  const tx = (k) => T[k]?.[L] ?? T[k]?.[0] ?? k;
  const canvasRef = useRef(null), eng = useRef(null), fileRef = useRef(null), jsonRef = useRef(null);
  const [model, setModelState] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s?.walls) return s; } catch {}
    return emptyModel();
  });
  const modelRef = useRef(model);
  const hist = useRef({ past: [], future: [] });
  const [, force] = useState(0);
  const [view, setView] = useState("3d");
  const [tool, setTool] = useState("select");
  const [sel, setSel] = useState(null);
  const [panel, setPanel] = useState(null);
  const [draft, setDraft] = useState(null); // { start } wall chain · { c1 } room corner · { m1 } measure
  const [lenIn, setLenIn] = useState("");
  const [sizeIn, setSizeIn] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState("");
  const [aiText, setAiText] = useState("");
  const [planFloors, setPlanFloors] = useState(null);
  const [hour, setHour] = useState(15);
  const [prices, setPrices] = useState(() => { try { return { ...DEFAULT_PRICES, ...JSON.parse(localStorage.getItem(PKEY) || "{}") }; } catch { return DEFAULT_PRICES; } });
  const down = useRef(null);

  const say = (s) => { setToast(s); clearTimeout(say.t); say.t = setTimeout(() => setToast(""), 4200); };
  function commit(next, keepFuture) {
    hist.current.past.push(modelRef.current);
    if (hist.current.past.length > 80) hist.current.past.shift();
    if (!keepFuture) hist.current.future = [];
    modelRef.current = next; setModelState(next);
  }
  const edit = (ops) => commit(applyOps(modelRef.current, ops));
  function undo() { const p = hist.current.past.pop(); if (!p) return; hist.current.future.push(modelRef.current); modelRef.current = p; setModelState(p); force((x) => x + 1); }
  function redo() { const f = hist.current.future.pop(); if (!f) return; hist.current.past.push(modelRef.current); modelRef.current = f; setModelState(f); force((x) => x + 1); }

  // the 3D view
  useEffect(() => {
    const e = new Studio3D(canvasRef.current);
    eng.current = e;
    e.setModel(modelRef.current); e.fit();
    const ro = new ResizeObserver(() => e.resize());
    ro.observe(canvasRef.current);
    return () => { ro.disconnect(); e.dispose(); };
  }, []);
  useEffect(() => {
    eng.current?.setModel(model);
    try { localStorage.setItem(KEY, JSON.stringify(model)); } catch {}
  }, [model]);
  useEffect(() => { eng.current?.setSelected(sel); }, [sel]);
  useEffect(() => { eng.current?.setView(view); }, [view]);
  useEffect(() => { eng.current?.placeSun(hour); }, [hour]);
  useEffect(() => { try { localStorage.setItem(PKEY, JSON.stringify(prices)); } catch {} }, [prices]);
  useEffect(() => { setDraft(null); eng.current?.setPreview([]); }, [tool]);
  // keyboard (computer): Esc stops drawing, Delete removes the selection, Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const k = (ev) => {
      if (/INPUT|TEXTAREA|SELECT/.test(ev.target?.tagName)) return;
      if (ev.key === "Escape") { setDraft(null); eng.current?.setPreview([]); }
      else if ((ev.key === "Delete" || ev.key === "Backspace") && sel) { edit([{ op: "delete", id: sel }]); setSel(null); }
      else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") { ev.preventDefault(); ev.shiftKey ? redo() : undo(); }
      else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "y") { ev.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  // ---------- drawing with the finger ----------
  function preview(start, p) {
    const items = [];
    if (start) items.push({ kind: "dot", x: start.x, z: start.z });
    if (start && p) {
      if (tool === "room") {
        const x0 = Math.min(start.x, p.x), x1 = Math.max(start.x, p.x), z0 = Math.min(start.z, p.z), z1 = Math.max(start.z, p.z);
        const lab = `${(x1 - x0).toFixed(2)}×${(z1 - z0).toFixed(2)}`;
        items.push({ kind: "line", x1: x0, z1: z0, x2: x1, z2: z0, label: lab }, { kind: "line", x1: x1, z1: z0, x2: x1, z2: z1 }, { kind: "line", x1: x0, z1: z1, x2: x1, z2: z1 }, { kind: "line", x1: x0, z1: z0, x2: x0, z2: z1 });
      } else items.push({ kind: "line", x1: start.x, z1: start.z, x2: p.x, z2: p.z, label: Math.hypot(p.x - start.x, p.z - start.z).toFixed(2) + " م" });
    }
    eng.current?.setPreview(items);
  }
  function addWallTo(p) {
    const s = draft?.start;
    if (!s) return;
    if (Math.hypot(p.x - s.x, p.z - s.z) < 0.05) { setDraft(null); eng.current.setPreview([]); return; }
    const m = modelRef.current;
    commit({ ...m, walls: [...m.walls, { id: uid("w"), x1: s.x, z1: s.z, x2: p.x, z2: p.z, t: 0.2, h: m.wallH || 3, color: WALL_COLORS[0] }] });
    const closed = draft.first && Math.hypot(p.x - draft.first.x, p.z - draft.first.z) < 0.05;
    if (closed) { setDraft(null); eng.current.setPreview([]); return; }
    setDraft({ start: p, first: draft.first || s }); preview(p);
  }
  function placeRoom(x, z, w, d) {
    const n = modelRef.current.rooms.length + 1;
    commit(addRoom(modelRef.current, { name: (L ? "Room " : "ژووری ") + n, type: "other", x, z, w, d }));
  }
  function tap(cx, cy) {
    const e = eng.current; if (!e) return;
    if (tool === "select" || tool === "erase" || tool === "door" || tool === "window") {
      const hit = e.pick(cx, cy);
      if (tool === "select") { setSel(hit?.id || null); if (hit) setPanel("props"); return; }
      if (tool === "erase") { if (hit) { edit([{ op: "delete", id: hit.id }]); if (sel === hit.id) setSel(null); } return; }
      if (hit?.type === "wall") {
        const kind = tool;
        edit([{ op: "addOpening", wall: hit.id, kind, at: hit.at, w: kind === "door" ? 0.9 : 1.2, h: kind === "door" ? 2.1 : 1.2, sill: kind === "door" ? 0 : 1 }]);
      } else say(tx("h_" + tool));
      return;
    }
    const raw = e.toFloor(cx, cy); if (!raw) return;
    if (tool === "wall") {
      const p = e.snap(raw, draft?.start);
      if (!draft?.start) { setDraft({ start: p, first: p }); preview(p); } else addWallTo(p);
    } else if (tool === "room") {
      const sz = fa(sizeIn).match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i);
      const p = e.snap(raw);
      if (sz) { placeRoom(p.x, p.z, +sz[1], +sz[2]); return; }
      if (!draft?.c1) { setDraft({ c1: p }); preview(p); return; }
      const a = draft.c1, w = Math.abs(p.x - a.x), d = Math.abs(p.z - a.z);
      setDraft(null); e.setPreview([]);
      if (w >= 0.5 && d >= 0.5) placeRoom(Math.min(a.x, p.x), Math.min(a.z, p.z), w, d);
    } else if (tool === "measure") {
      const p = e.snap(raw, draft?.m1);
      if (!draft?.m1) { setDraft({ m1: p }); preview(p); return; }
      const dist = Math.hypot(p.x - draft.m1.x, p.z - draft.m1.z);
      e.setPreview([{ kind: "line", x1: draft.m1.x, z1: draft.m1.z, x2: p.x, z2: p.z, label: dist.toFixed(2) + " م" }]);
      say(`${tx("measured")}: ${dist.toFixed(2)} م`); setDraft(null);
    }
  }
  const onDown = (ev) => { down.current = { x: ev.clientX, y: ev.clientY, n: (down.current?.n || 0) + 1, lx: ev.clientX, ly: ev.clientY }; };
  const onMove = (ev) => {
    if (view === "walk" && down.current && ev.buttons) { eng.current.look(ev.clientX - down.current.lx, ev.clientY - down.current.ly); down.current.lx = ev.clientX; down.current.ly = ev.clientY; return; }
    if (ev.pointerType === "mouse" && !ev.buttons && (draft?.start || draft?.c1 || draft?.m1)) {
      const raw = eng.current.toFloor(ev.clientX, ev.clientY); if (!raw) return;
      const s = draft.start || draft.c1 || draft.m1;
      preview(s, eng.current.snap(raw, tool === "room" ? null : s));
    }
  };
  const onUp = (ev) => {
    const d = down.current; down.current = null;
    if (!d || view === "walk") return;
    if (Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < 8 && d.n === 1) tap(ev.clientX, ev.clientY);
  };
  function wallByLength(dx, dz) {
    const v = parseFloat(fa(lenIn)); const s = draft?.start;
    if (!s || !(v > 0)) return;
    addWallTo({ x: Math.round((s.x + dx * v) * 100) / 100, z: Math.round((s.z + dz * v) * 100) / 100 });
    setLenIn("");
  }

  // ---------- AI, plan, files ----------
  async function askAI(text) {
    const q = (text ?? aiText).trim(); if (!q || busy) return;
    setBusy("ai");
    try {
      const r = await fetch("/api/studio3d", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await getToken()) },
        body: JSON.stringify({ action: "command", text: q, lang, model: modelRef.current, selected: sel || undefined }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "ai");
      if (j.ops?.length) { edit(j.ops); setTimeout(() => eng.current?.fit(), 50); }
      say(j.say || "✅"); setAiText("");
    } catch { say(tx("aiFail")); }
    setBusy("");
  }
  async function readPlan(file) {
    if (!file) return;
    setBusy("plan"); say(tx("reading"));
    try {
      const image = await shrinkImage(file);
      const r = await fetch("/api/house", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await getToken()) }, body: JSON.stringify({ action: "analyze", image, lang }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.plan) throw new Error(j.error || "plan");
      const floors = [...new Set((j.plan.rooms || []).map((x) => x.floor || 1))].sort();
      const m = planToModel(j.plan, floors[0] || 1);
      if (!m) throw new Error("plan");
      commit(m); setSel(null); setTimeout(() => eng.current?.fit(), 50);
      setPlanFloors(floors.length > 1 ? { plan: j.plan, floors, cur: floors[0] } : null);
      say(tx("planDone")); setPanel(null);
    } catch { say(tx("planFail")); }
    setBusy("");
  }

  const m = model;
  const selWall = m.walls.find((w) => w.id === sel), selOpen = m.openings.find((o) => o.id === sel), selRoom = m.rooms.find((r) => r.id === sel);
  const q = boq(m, prices);
  const isEmpty = !m.walls.length && !m.rooms.length;
  const TOOLS = [["select", "👆"], ["wall", "🧱"], ["room", "⬜"], ["door", "🚪"], ["window", "🪟"], ["measure", "📏"], ["erase", "🗑️"]];
  const num = (v, on, step = 0.05) => (
    <input type="number" inputMode="decimal" step={step} defaultValue={v} key={sel + ":" + v}
      onBlur={(e) => { const x = parseFloat(fa(e.target.value)); if (isFinite(x) && x !== v) on(x); }}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
  );

  return (
    <div className="s3d" dir={L ? "ltr" : "rtl"}>
      <header className="s3d-top">
        <button className="s3d-btn" onClick={onBack} aria-label={tx("back")}>{L ? "←" : "→"}</button>
        <div className="s3d-title"><b>{tx("title")}</b><small>{tx("beta")}</small></div>
        <div className="s3d-seg" role="tablist">
          {[["plan", "vplan"], ["3d", "v3d"], ["walk", "vwalk"]].map(([v, k]) => (
            <button key={v} role="tab" aria-selected={view === v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{tx(k)}</button>
          ))}
        </div>
      </header>

      <div className="s3d-stage">
        <canvas ref={canvasRef} className="s3d-canvas" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
          onPointerCancel={() => (down.current = null)} onContextMenu={(e) => e.preventDefault()} />
        {view !== "walk" && <p className="s3d-hint">{tx("h_" + tool)}</p>}
        {view === "walk" && (
          <div className="s3d-walk">
            <p className="s3d-hint static">{tx("h_walk")}</p>
            {[["▲", 1, 0], ["▼", -1, 0], ["⟲", 0, 1], ["⟳", 0, -1]].map(([s, mv, tn]) => (
              <button key={s} className="s3d-btn big" onPointerDown={() => { eng.current.walk.move = mv; eng.current.walk.turn = tn; }}
                onPointerUp={() => { eng.current.walk.move = 0; eng.current.walk.turn = 0; }} onPointerLeave={() => { eng.current.walk.move = 0; eng.current.walk.turn = 0; }}>{s}</button>
            ))}
          </div>
        )}
        {tool === "wall" && draft?.start && view !== "walk" && (
          <div className="s3d-vcb">
            <input inputMode="decimal" placeholder={tx("len")} value={lenIn} onChange={(e) => setLenIn(e.target.value)} />
            {[["→", 1, 0], ["←", -1, 0], ["↑", 0, -1], ["↓", 0, 1]].map(([s, dx, dz]) => <button key={s} className="s3d-btn" onClick={() => wallByLength(dx, dz)}>{s}</button>)}
            <button className="s3d-btn gold" onClick={() => { setDraft(null); eng.current.setPreview([]); }}>{tx("done")}</button>
          </div>
        )}
        {tool === "room" && view !== "walk" && (
          <div className="s3d-vcb"><input inputMode="text" placeholder={tx("size")} value={sizeIn} onChange={(e) => setSizeIn(e.target.value)} /></div>
        )}
        {planFloors && (
          <div className="s3d-floors">
            {planFloors.floors.map((f) => <button key={f} className={"s3d-btn" + (planFloors.cur === f ? " gold" : "")} onClick={() => { const mm = planToModel(planFloors.plan, f); if (mm) { commit(mm); setPlanFloors({ ...planFloors, cur: f }); setTimeout(() => eng.current?.fit(), 50); } }}>{tx("floorN")} {f}</button>)}
          </div>
        )}
        {isEmpty && !busy && (
          <div className="s3d-empty">
            <b>{tx("empty1")}</b><p>{tx("empty2")}</p>
            <div className="s3d-row">
              <button className="s3d-btn gold" onClick={() => { commit(sampleHouse()); setTimeout(() => eng.current?.fit(), 50); }}>{tx("sample")}</button>
              <button className="s3d-btn" onClick={() => fileRef.current?.click()}>{tx("fromPlan")}</button>
              <button className="s3d-btn" onClick={() => setPanel("ai")}>{tx("askAi")}</button>
            </div>
          </div>
        )}
        {busy && <div className="s3d-busy"><span className="mini-spin" /> {tx(busy === "ai" ? "thinking" : "reading")}</div>}
        {toast && <div className="s3d-toast" role="status">{toast}</div>}
      </div>

      {panel && (
        <section className="s3d-panel">
          <button className="s3d-x" onClick={() => setPanel(null)} aria-label="close">✕</button>
          {panel === "props" && (
            selWall ? (
              <div className="s3d-form">
                <h4>🧱 {tx("wall")} · {tx("length")} {wallLen(selWall).toFixed(2)} م</h4>
                <label>{tx("thick")} {num(selWall.t, (v) => edit([{ op: "setWall", id: sel, t: v }]), 0.01)}</label>
                <label>{tx("height")} {num(selWall.h, (v) => edit([{ op: "setWall", id: sel, h: v }]))}</label>
                <div className="s3d-sw">{WALL_COLORS.map((c) => <button key={c} style={{ background: c }} className={selWall.color === c ? "on" : ""} onClick={() => edit([{ op: "setWall", id: sel, color: c }])} aria-label={c} />)}</div>
                <div className="s3d-row">
                  <button className="s3d-btn" onClick={() => edit([{ op: "addOpening", wall: sel, kind: "door", at: wallLen(selWall) / 2 }])}>{tx("addDoor")}</button>
                  <button className="s3d-btn" onClick={() => edit([{ op: "addOpening", wall: sel, kind: "window", at: wallLen(selWall) / 2 }])}>{tx("addWin")}</button>
                  <button className="s3d-btn danger" onClick={() => { edit([{ op: "delete", id: sel }]); setSel(null); }}>{tx("del")}</button>
                </div>
              </div>
            ) : selOpen ? (
              <div className="s3d-form">
                <h4>{selOpen.kind === "door" ? "🚪 " + tx("door") : "🪟 " + tx("window")}</h4>
                <label>{tx("width")} {num(selOpen.w, (v) => edit([{ op: "setOpening", id: sel, w: v }]))}</label>
                <label>{tx("height")} {num(selOpen.h, (v) => edit([{ op: "setOpening", id: sel, h: v }]))}</label>
                {selOpen.kind === "window" && <label>{tx("sill")} {num(selOpen.sill, (v) => edit([{ op: "setOpening", id: sel, sill: v }]))}</label>}
                <button className="s3d-btn danger" onClick={() => { edit([{ op: "delete", id: sel }]); setSel(null); }}>{tx("del")}</button>
              </div>
            ) : selRoom ? (
              <div className="s3d-form">
                <h4>⬜ {selRoom.w}×{selRoom.d} م · {Math.round(selRoom.w * selRoom.d * 10) / 10} م²</h4>
                <label>{tx("name")} <input defaultValue={selRoom.name} key={sel} onBlur={(e) => edit([{ op: "setRoom", id: sel, name: e.target.value }])} /></label>
                <label>{tx("type")} <select value={selRoom.type} onChange={(e) => edit([{ op: "setRoom", id: sel, type: e.target.value }])}>
                  {Object.keys(ROOM_TYPES).map((k) => <option key={k} value={k}>{TYPE_NAMES[k][L]}</option>)}</select></label>
                <div className="s3d-sw">{["#eadcc4", "#d8e3ee", "#c9a77c", "#8f6a4a", "#e9e9e9", "#bdbdbd", "#d6c6a5", "#a9b8a0"].map((c) => <button key={c} style={{ background: c }} onClick={() => edit([{ op: "setRoom", id: sel, floor: c }])} aria-label={c} />)}</div>
                <button className="s3d-btn danger" onClick={() => { edit([{ op: "delete", id: sel }]); setSel(null); }}>{tx("del")}</button>
              </div>
            ) : <p className="muted">{tx("nothingSel")}</p>
          )}
          {panel === "ai" && (
            <div className="s3d-form">
              <textarea rows={2} value={aiText} placeholder={tx("aiPh")} onChange={(e) => setAiText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askAI(); } }} />
              <div className="s3d-row">
                <button className="s3d-btn gold" disabled={!!busy || !aiText.trim()} onClick={() => askAI()}>{busy === "ai" ? tx("thinking") : tx("send")}</button>
              </div>
              <div className="s3d-chips">{["sug1", "sug2", "sug3", "sug4"].map((k) => <button key={k} disabled={!!busy} onClick={() => askAI(tx(k))}>{tx(k)}</button>)}</div>
            </div>
          )}
          {panel === "cost" && (
            <div className="s3d-form">
              <p className="muted small">{tx("floorA")}: <b>{q.floor} م²</b> · {tx("wallA")}: <b>{q.net} م²</b></p>
              <table className="s3d-table"><tbody>
                {q.lines.map((l) => (
                  <tr key={l.k}><td>{tx("c_" + l.k)}<small>{l.rule}</small></td><td>{fmt(l.qty)} {l.unit === "pcs" ? "" : l.unit}</td>
                    <td><input type="number" inputMode="numeric" value={prices[l.k]} onChange={(e) => setPrices({ ...prices, [l.k]: Math.max(0, +e.target.value || 0) })} /></td>
                    <td>{fmt(l.cost)}</td></tr>
                ))}
                <tr className="tot"><td colSpan={3}>{tx("total")}</td><td>{fmt(q.total)} IQD</td></tr>
              </tbody></table>
              <p className="cs-note">⚠️ {tx("costNote")}</p>
            </div>
          )}
          {panel === "file" && (
            <div className="s3d-form">
              <div className="s3d-grid">
                <button className="s3d-btn" onClick={() => fileRef.current?.click()}>{tx("fromPlan")}</button>
                <button className="s3d-btn" onClick={() => { commit(sampleHouse()); setTimeout(() => eng.current?.fit(), 50); }}>{tx("sample")}</button>
                <button className="s3d-btn" onClick={() => download(eng.current.snapshot(3840), "ahm-3d-4k.png")}>{tx("png")}</button>
                <button className="s3d-btn" onClick={async () => { const b = await eng.current.exportGLB(); const u = URL.createObjectURL(b); download(u, "ahm-3d.glb"); setTimeout(() => URL.revokeObjectURL(u), 4000); }}>{tx("glb")}</button>
                <button className="s3d-btn" onClick={() => { const u = URL.createObjectURL(new Blob([JSON.stringify(modelRef.current)], { type: "application/json" })); download(u, "ahm-3d.json"); setTimeout(() => URL.revokeObjectURL(u), 4000); say(tx("saved")); }}>{tx("saveJ")}</button>
                <button className="s3d-btn" onClick={() => jsonRef.current?.click()}>{tx("openJ")}</button>
                <button className="s3d-btn danger" onClick={() => { if (confirm(tx("confirmNew"))) { commit(emptyModel()); setSel(null); setPlanFloors(null); } }}>{tx("newM")}</button>
              </div>
              <label className="s3d-sun">{tx("sunT")} · {hour}:00 <input type="range" min={7} max={19} value={hour} onChange={(e) => setHour(+e.target.value)} /></label>
            </div>
          )}
        </section>
      )}

      <nav className="s3d-bar">
        <div className="s3d-tools">
          {TOOLS.map(([k, ic]) => (
            <button key={k} className={tool === k ? "on" : ""} onClick={() => { setTool(k); if (view === "walk") setView("3d"); }} aria-pressed={tool === k}>
              <span aria-hidden="true">{ic}</span><small>{tx(k)}</small>
            </button>
          ))}
          <button onClick={undo} disabled={!hist.current.past.length}><span aria-hidden="true">↶</span><small>{tx("undo")}</small></button>
          <button onClick={redo} disabled={!hist.current.future.length}><span aria-hidden="true">↷</span><small>{tx("redo")}</small></button>
        </div>
        <div className="s3d-tabs">
          {[["props", "props"], ["ai", "ai"], ["cost", "cost"], ["file", "file"]].map(([p, k]) => (
            <button key={p} className={panel === p ? "on" : ""} onClick={() => setPanel(panel === p ? null : p)}>{tx(k)}</button>
          ))}
        </div>
      </nav>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { readPlan(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={jsonRef} type="file" accept="application/json,.json" hidden onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
        try { const j = JSON.parse(await f.text()); if (Array.isArray(j.walls)) { commit(applyOps({ ...emptyModel(), ...j }, [])); setTimeout(() => eng.current?.fit(), 50); } } catch { say(tx("planFail")); }
      }} />
    </div>
  );
}
