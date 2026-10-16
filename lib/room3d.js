// "3D room": real 3D furniture placed on top of the user's photo, in true perspective.
// The photo is the background; a see-through 3D view sits on top. The floor of the 3D view is lined up with the
// floor of the photo (camera height, floor angle and lens can be adjusted), so a sofa farther back looks smaller,
// stands on the floor and casts a soft shadow — like it is really in the room.
// Models come from Poly Haven (free CC0 3D scans in real-world metres).
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const PROXY = (u) => "/api/m?u=" + encodeURIComponent(u);
const D2R = Math.PI / 180;
let nextId = 1;

export class Room3D {
  constructor(canvas, { onSelect, onChange } = {}) {
    this.canvas = canvas;
    this.onSelect = onSelect || (() => {});
    this.onChange = onChange || (() => {});
    const r = (this.r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true }));
    r.setClearColor(0x000000, 0);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = (this.scene = new THREE.Scene());
    const pm = new THREE.PMREMGenerator(r);
    this.envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = this.envTex;
    pm.dispose();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 0.55));
    const sun = (this.sun = new THREE.DirectionalLight(0xffffff, 1.5));
    sun.position.set(2.5, 6, 1.5);
    sun.target.position.set(0, 0, -3.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 30 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 5;
    scene.add(sun, sun.target);

    // invisible floor that only shows shadows
    const floor = (this.floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.32 })));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    // guide lines to line up the floor with the photo
    const grid = (this.grid = new THREE.GridHelper(24, 48, 0xffd27a, 0xffffff));
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    grid.material.depthWrite = false;
    grid.position.z = -6;
    grid.visible = false;
    scene.add(grid);

    this.cam = new THREE.PerspectiveCamera(55, 1.5, 0.05, 200);
    this.view = { height: 1.45, tilt: 14, fov: 55 };
    this.items = [];
    this.sel = null;
    this.box = new THREE.BoxHelper(undefined, 0xffc24a);
    this.box.visible = false;
    this.box.material.depthTest = false;
    this.box.renderOrder = 10;
    scene.add(this.box);
    this.ray = new THREE.Raycaster();
    this.pointers = new Map();
    this.drag = null;
    this.applyView();

    this._down = (e) => this.down(e);
    this._move = (e) => this.move(e);
    this._up = (e) => this.up(e);
    canvas.addEventListener("pointerdown", this._down);
    canvas.addEventListener("pointermove", this._move);
    canvas.addEventListener("pointerup", this._up);
    canvas.addEventListener("pointercancel", this._up);
    this._lost = (e) => { e.preventDefault(); };
    canvas.addEventListener("webglcontextlost", this._lost);
  }

  dispose() {
    const c = this.canvas;
    c.removeEventListener("pointerdown", this._down);
    c.removeEventListener("pointermove", this._move);
    c.removeEventListener("pointerup", this._up);
    c.removeEventListener("pointercancel", this._up);
    c.removeEventListener("webglcontextlost", this._lost);
    this.scene.traverse((o) => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => { x.map?.dispose?.(); x.dispose?.(); }); });
    this.envTex?.dispose();
    this.r.dispose();
  }

  // ---- camera / lining up with the photo ----
  setView(v) { Object.assign(this.view, v); this.applyView(); }
  applyView() {
    const { height, tilt, fov } = this.view;
    this.cam.fov = fov;
    this.cam.position.set(0, height, 0);
    this.cam.rotation.set(-tilt * D2R, 0, 0, "YXZ");
    this.cam.updateProjectionMatrix();
    this.cam.updateMatrixWorld();
    this.render();
  }
  showGrid(on) { this.grid.visible = !!on; this.render(); }
  resize(w, h) {
    if (!w || !h) return;
    this.r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.r.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
    this.render();
  }

  // where a point of the picture (-1..1) meets a flat level at height y
  levelPoint(nx, ny, y = 0) {
    this.ray.setFromCamera(new THREE.Vector2(nx, ny), this.cam);
    const p = new THREE.Vector3();
    return this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), p) ? p : null;
  }
  ndc(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 };
  }

  // ---- adding things ----
  async addModel({ url, include, name, label, hang, wall }) {
    const load = async (proxied) => {
      const map = {};
      for (const [k, v] of Object.entries(include || {})) map[k] = proxied ? PROXY(v) : v;
      const mgr = new THREE.LoadingManager();
      mgr.setURLModifier((u) => {
        let d = u;
        try { d = decodeURIComponent(u); } catch {}
        for (const k of Object.keys(map)) if (d.endsWith("/" + k) || d.endsWith(k)) return map[k];
        return u;
      });
      const loader = new GLTFLoader(mgr);
      loader.setCrossOrigin("anonymous");
      return loader.loadAsync(proxied ? PROXY(url) : url);
    };
    let gltf;
    try { gltf = await load(false); } catch { gltf = await load(true); }
    const obj = gltf.scene;
    obj.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true;
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach((m) => { if (m.map) m.map.anisotropy = 4; m.envMapIntensity = 0.9; });
      }
    });
    return this.put(obj, { kind: "model", name, label, hang, wall });
  }

  async addPicture({ src, name, label }) {
    const tex = await new THREE.TextureLoader().loadAsync(src);
    tex.colorSpace = THREE.SRGBColorSpace;
    const ar = tex.image.width / tex.image.height || 1;
    const h = ar > 1.6 ? 0.8 : 1.1, w = h * ar;
    const geo = new THREE.PlaneGeometry(w, h);
    geo.translate(0, h / 2, 0);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.04, side: THREE.DoubleSide, toneMapped: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
    const g = new THREE.Group();
    g.add(mesh);
    return this.put(g, { kind: "picture", name, label, src });
  }

  // something the AI will draw (no 3D model): a see-through box with its name
  addGhost({ name, label, size, hang }) {
    const [w, h, d] = size || [1, 1, 1];
    const geo = new THREE.BoxGeometry(w, h, d);
    geo.translate(0, h / 2, 0);
    const g = new THREE.Group();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffc24a, transparent: true, opacity: 0.28, roughness: 0.6, depthWrite: false }));
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xffe2a0 }));
    const tag = labelSprite(label);
    tag.position.set(0, h + 0.18, 0);
    g.add(m, edges, tag);
    return this.put(g, { kind: "ghost", name, label, hang, size: [w, h, d] });
  }

  put(inner, meta) {
    // stand it on the floor, centred
    const b = new THREE.Box3().setFromObject(inner);
    const c = b.getCenter(new THREE.Vector3());
    inner.position.x -= c.x; inner.position.z -= c.z; inner.position.y -= b.min.y;
    const size = b.getSize(new THREE.Vector3());
    const g = new THREE.Group();
    g.add(inner);
    const n = this.items.length % 5;
    const p = this.levelPoint((n - 2) * 0.12, -0.45 + (n % 2) * 0.08) || new THREE.Vector3(0, 0, -3);
    p.z = Math.max(-14, Math.min(-1.2, p.z));
    const lift = meta.hang ? Math.max(0, 2.65 - size.y) : meta.wall ? 1.1 : 0;
    g.position.set(p.x, lift, p.z);
    const it = { id: nextId++, g, size, scale: 1, rot: 0, lift, ...meta };
    this.scene.add(g);
    this.items.push(it);
    this.select(it.id);
    this.changed();
    return it;
  }

  // ---- changing things ----
  get(id) { return this.items.find((i) => i.id === id); }
  select(id) {
    const it = id ? this.get(id) : null;
    this.sel = it || null;
    this.box.visible = !!it;
    if (it) this.box.setFromObject(it.g);
    this.render();
    this.onSelect(it ? this.info(it) : null);
  }
  info(it) {
    return { id: it.id, kind: it.kind, name: it.name, label: it.label, scale: it.scale, rot: it.rot, lift: it.lift,
      w: +(it.size.x * it.scale).toFixed(2), h: +(it.size.y * it.scale).toFixed(2), d: +(it.size.z * it.scale).toFixed(2) };
  }
  set(id, ch) {
    const it = this.get(id);
    if (!it) return;
    if (ch.scale != null) { it.scale = Math.max(0.2, Math.min(4, ch.scale)); it.g.scale.setScalar(it.scale); }
    if (ch.rot != null) { it.rot = ((ch.rot % 360) + 360) % 360; }
    if (ch.lift != null) { it.lift = Math.max(0, Math.min(3.2, ch.lift)); it.g.position.y = it.lift; }
    if (it.kind !== "picture") it.g.rotation.y = it.rot * D2R;
    this.changed();
    if (this.sel === it) { this.box.setFromObject(it.g); this.onSelect(this.info(it)); }
    this.render();
  }
  remove(id) {
    const it = this.get(id);
    if (!it) return;
    this.scene.remove(it.g);
    this.items = this.items.filter((x) => x !== it);
    if (this.sel === it) this.select(null);
    this.changed();
    this.render();
  }
  duplicate(id) {
    const it = this.get(id);
    if (!it) return;
    const g = it.g.clone(true);
    g.position.x += 0.6 * it.scale; g.position.z -= 0.3;
    const copy = { ...it, id: nextId++, g };
    this.scene.add(g);
    this.items.push(copy);
    this.select(copy.id);
    this.changed();
  }
  clear() { [...this.items].forEach((i) => this.remove(i.id)); }
  changed() { this.onChange(this.items.map((i) => this.info(i))); }

  // ---- touch / mouse ----
  hit(e) {
    const n = this.ndc(e);
    this.ray.setFromCamera(new THREE.Vector2(n.x, n.y), this.cam);
    const hits = this.ray.intersectObjects(this.items.map((i) => i.g), true);
    for (const h of hits) {
      let o = h.object;
      while (o && !this.items.some((i) => i.g === o)) o = o.parent;
      if (o) return this.items.find((i) => i.g === o);
    }
    return null;
  }
  down(e) {
    this.canvas.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2 && this.sel) {
      // two fingers: pinch to resize, twist to turn
      const [a, b] = [...this.pointers.values()];
      this.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), scale: this.sel.scale, rot: this.sel.rot };
      this.drag = null;
      return;
    }
    if (this.pointers.size > 1) return;
    const it = this.hit(e);
    if (!it) { this.select(null); return; }
    if (this.sel !== it) this.select(it.id);
    const n = this.ndc(e);
    const p = this.levelPoint(n.x, n.y, it.g.position.y);
    this.drag = p ? { it, off: new THREE.Vector3().subVectors(it.g.position, p) } : null;
  }
  move(e) {
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pinch && this.pointers.size === 2 && this.sel) {
      const [a, b] = [...this.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      this.set(this.sel.id, { scale: this.pinch.scale * (dist / (this.pinch.dist || 1)), rot: this.pinch.rot - (ang - this.pinch.ang) / D2R });
      return;
    }
    if (!this.drag) return;
    const it = this.drag.it, n = this.ndc(e);
    const p = this.levelPoint(n.x, n.y, it.g.position.y);
    if (!p) return;
    p.add(this.drag.off);
    it.g.position.x = Math.max(-12, Math.min(12, p.x));
    it.g.position.z = Math.max(-18, Math.min(-0.6, p.z));
    this.box.setFromObject(it.g);
    this.render();
  }
  up(e) {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    if (this.drag) { this.drag = null; this.changed(); }
  }

  // ---- drawing ----
  render() {
    if (!this.r) return;
    for (const it of this.items) {
      if (it.kind === "picture") {
        // flat pictures always face the camera
        const p = it.g.position;
        it.g.rotation.y = Math.atan2(this.cam.position.x - p.x, this.cam.position.z - p.z) + it.rot * D2R;
      }
    }
    this.r.render(this.scene, this.cam);
  }

  // The photo with the 3D things drawn in it. Items the AI will draw ("ghosts") are left out and their areas returned.
  async snapshot(photo, longSide = 1280) {
    const ghosts = this.items.filter((i) => i.kind === "ghost");
    const was = { box: this.box.visible, grid: this.grid.visible };
    this.box.visible = false; this.grid.visible = false;
    ghosts.forEach((g) => (g.g.visible = false));
    this.render();
    const W = photo.naturalWidth, H = photo.naturalHeight, s = longSide / Math.max(W, H);
    const c = document.createElement("canvas");
    c.width = Math.round(W * s); c.height = Math.round(H * s);
    const x = c.getContext("2d");
    x.drawImage(photo, 0, 0, c.width, c.height);
    x.drawImage(this.canvas, 0, 0, c.width, c.height);
    ghosts.forEach((g) => (g.g.visible = true));
    this.box.visible = was.box; this.grid.visible = was.grid;
    this.render();
    return { canvas: c, ghosts: ghosts.map((g) => ({ name: g.name, ...this.area(g) })) };
  }
  // where an item is on the picture, in % of width/height
  area(it) {
    const b = new THREE.Box3().setFromObject(it.g);
    let x0 = 1, y0 = 1, x1 = -1, y1 = -1;
    for (const X of [b.min.x, b.max.x]) for (const Y of [b.min.y, b.max.y]) for (const Z of [b.min.z, b.max.z]) {
      const v = new THREE.Vector3(X, Y, Z).project(this.cam);
      x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
    }
    const cl = (v) => Math.max(0, Math.min(100, v));
    const L = cl(((x0 + 1) / 2) * 100), R = cl(((x1 + 1) / 2) * 100), T = cl(((1 - y1) / 2) * 100), B = cl(((1 - y0) / 2) * 100);
    return { x: +L.toFixed(1), y: +T.toFixed(1), w: +Math.max(2, R - L).toFixed(1), h: +Math.max(2, B - T).toFixed(1) };
  }
}

function labelSprite(text) {
  const c = document.createElement("canvas");
  const g = c.getContext("2d");
  const font = "600 44px Tahoma, 'Noto Sans Arabic', sans-serif";
  g.font = font;
  const w = Math.min(900, Math.ceil(g.measureText(text).width) + 48);
  c.width = w; c.height = 72;
  g.font = font;
  g.fillStyle = "rgba(10,12,18,.78)";
  g.beginPath(); g.roundRect ? g.roundRect(0, 0, w, 72, 20) : g.rect(0, 0, w, 72); g.fill();
  g.fillStyle = "#ffd27a"; g.textAlign = "center"; g.textBaseline = "middle";
  g.direction = /[؀-ۿ]/.test(text) ? "rtl" : "ltr";
  g.fillText(text, w / 2, 38);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, toneMapped: false }));
  s.scale.set((w / 72) * 0.22, 0.22, 1);
  s.renderOrder = 11;
  return s;
}

// Makes a plain light background see-through (for product photos found in search).
export function cutout(img, max = 640) {
  const s = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  const c = document.createElement("canvas");
  const W = (c.width = Math.max(1, Math.round((img.naturalWidth || img.width) * s)));
  const H = (c.height = Math.max(1, Math.round((img.naturalHeight || img.height) * s)));
  const x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(img, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H), p = d.data;
  const at = (i, j) => (j * W + i) * 4;
  const corners = [at(0, 0), at(W - 1, 0), at(0, H - 1), at(W - 1, H - 1)];
  const bg = [0, 1, 2].map((k) => corners.reduce((a, i) => a + p[i + k], 0) / 4);
  const plain = corners.every((i) => Math.abs(p[i] - bg[0]) + Math.abs(p[i + 1] - bg[1]) + Math.abs(p[i + 2] - bg[2]) < 60);
  if (!plain || bg[0] + bg[1] + bg[2] < 450) return { url: c.toDataURL("image/jpeg", 0.9), cut: false };
  // flood fill from the edges
  const seen = new Uint8Array(W * H), stack = [];
  for (let i = 0; i < W; i++) stack.push(i, (H - 1) * W + i);
  for (let j = 0; j < H; j++) stack.push(j * W, j * W + W - 1);
  while (stack.length) {
    const k = stack.pop();
    if (seen[k]) continue;
    seen[k] = 1;
    const o = k * 4;
    if (Math.abs(p[o] - bg[0]) + Math.abs(p[o + 1] - bg[1]) + Math.abs(p[o + 2] - bg[2]) > 54) continue;
    p[o + 3] = 0;
    const i = k % W, j = (k / W) | 0;
    if (i > 0) stack.push(k - 1);
    if (i < W - 1) stack.push(k + 1);
    if (j > 0) stack.push(k - W);
    if (j < H - 1) stack.push(k + W);
  }
  x.putImageData(d, 0, 0);
  return { url: c.toDataURL("image/png"), cut: true };
}
