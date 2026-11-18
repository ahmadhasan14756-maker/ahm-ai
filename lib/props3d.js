// Real 3D objects drawn by the app itself (no downloads): cars, trees, and things around a Kurdish house.
// Every object is at real size in metres, stands on the floor (y = 0), front towards +x.
import * as THREE from "three";

export const PROPS = {
  car_sedan: { e: "🚗", n: ["ئۆتۆمبێلی سیدان", "Sedan car", "ترومبێلا سیدان", "سيارة سيدان"], color: "#1e3a5f" },
  car_suv: { e: "🚙", n: ["ئۆتۆمبێلی گەورە (SUV)", "SUV", "ترومبێلا مەزن (SUV)", "سيارة دفع رباعي"], color: "#f2f2f2" },
  car_pickup: { e: "🛻", n: ["پیکاپ", "Pickup truck", "پیکاپ", "بيك آب"], color: "#8a1c1c" },
  car_van: { e: "🚐", n: ["ڤان", "Van", "ڤان", "فان"], color: "#d9d9d9" },
  tree: { e: "🌳", n: ["دار", "Tree", "دار", "شجرة"] },
  olive: { e: "🫒", n: ["داری زەیتوون", "Olive tree", "دارا زەیتوونێ", "شجرة زيتون"] },
  palm: { e: "🌴", n: ["دارخورما", "Palm tree", "دارا قەسپێ", "نخلة"] },
  pine: { e: "🌲", n: ["داری کاژ", "Pine tree", "دارا کاژێ", "صنوبر"] },
  bush: { e: "🌿", n: ["دەوەن", "Bush", "دەوەن", "شجيرة"] },
  flowers: { e: "🌷", n: ["گوڵدان", "Flower bed", "گولدان", "أحواض زهور"] },
  tank: { e: "🛢️", n: ["تانکی ئاو", "Water tank", "تانکا ئاڤێ", "خزان ماء"] },
  ac: { e: "❄️", n: ["سپلیت (کوولەر)", "AC unit", "سپلیت", "مكيف سبليت"] },
  dish: { e: "📡", n: ["دەفری ستەلایت", "Satellite dish", "دەفرا ستەلایتێ", "صحن ستلايت"] },
  lamp: { e: "💡", n: ["گڵۆپی حەوشە", "Garden lamp post", "گلۆپا حەوشێ", "عمود إنارة"] },
  bench: { e: "🪑", n: ["کورسی باخچە", "Garden bench", "کورسیا باخچێ", "مقعد حديقة"] },
  bbq: { e: "🔥", n: ["مەنقەڵ", "Barbecue", "مەنقەل", "شواية"] },
  gen: { e: "⚡", n: ["مۆلیدە", "Generator", "مۆلیدە", "مولدة"] },
};
export const CAR_COLORS = ["#f2f2f2", "#1b1b1b", "#8c8f94", "#c9cdd2", "#1e3a5f", "#8a1c1c", "#2f5d3a", "#c79a3b", "#5b3a29", "#e5e0d0"];

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
const add = (g, mesh, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh; };

// a car body = the side profile pushed out to the car's width, with soft (bevelled) edges
function profileBody(pts, width, mat) {
  const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) sh.lineTo(x, y);
  sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: width - 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3, curveSegments: 6 });
  geo.translate(0, 0, -(width - 0.12) / 2);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}
function wheel(r, w) {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 28), std("#141414", { roughness: 0.9 }));
  tyre.rotation.x = Math.PI / 2; tyre.castShadow = true; g.add(tyre);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, w + 0.01, 20), std("#c9ccd1", { metalness: 0.9, roughness: 0.25 }));
  rim.rotation.x = Math.PI / 2; g.add(rim);
  for (let i = 0; i < 5; i++) { // spokes
    const sp = new THREE.Mesh(new THREE.BoxGeometry(r * 1.1, r * 0.12, w + 0.02), std("#9ea2a8", { metalness: 0.9, roughness: 0.3 }));
    sp.rotation.z = (i * Math.PI) / 5; g.add(sp);
  }
  return g;
}

function car(kind, color) {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
  const glass = new THREE.MeshPhysicalMaterial({ color: "#16202b", metalness: 0.2, roughness: 0.05, clearcoat: 1 });
  const S = {
    car_sedan: { L: 4.65, W: 1.82, wr: 0.33, wx: 1.42,
      body: [[-2.32, 0.3], [-2.32, 0.82], [-2.05, 0.95], [-1.45, 0.98], [-0.8, 1.42], [0.5, 1.44], [1.25, 0.99], [2.12, 0.88], [2.33, 0.7], [2.33, 0.3]],
      win: [[-1.38, 0.99], [-0.8, 1.37], [0.47, 1.39], [1.17, 1.0]] },
    car_suv: { L: 4.8, W: 1.92, wr: 0.39, wx: 1.48,
      body: [[-2.4, 0.38], [-2.4, 1.12], [-2.3, 1.78], [0.75, 1.8], [1.35, 1.15], [2.32, 1.02], [2.42, 0.8], [2.42, 0.38]],
      win: [[-2.28, 1.16], [-2.2, 1.72], [0.72, 1.74], [1.27, 1.17]] },
    car_pickup: { L: 5.3, W: 1.9, wr: 0.38, wx: 1.65,
      body: [[-2.65, 0.4], [-2.65, 1.05], [-0.55, 1.05], [-0.5, 1.8], [0.75, 1.82], [1.35, 1.15], [2.52, 1.02], [2.65, 0.8], [2.65, 0.4]],
      win: [[-0.42, 1.16], [-0.42, 1.74], [0.72, 1.76], [1.27, 1.17]] },
    car_van: { L: 5.0, W: 1.95, wr: 0.36, wx: 1.6,
      body: [[-2.5, 0.38], [-2.5, 2.0], [1.05, 2.02], [1.7, 1.2], [2.42, 1.05], [2.5, 0.8], [2.5, 0.38]],
      win: [[0.2, 1.25], [0.2, 1.9], [1.02, 1.92], [1.6, 1.25]] },
  }[kind];
  add(g, profileBody(S.body, S.W, paint));
  const w = profileBody(S.win, S.W + 0.02, glass); w.castShadow = false; g.add(w);
  if (kind === "car_van") { // side windows along the van
    const sw = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, S.W + 0.03), glass); sw.position.set(-1.0, 1.55, 0); g.add(sw);
  }
  if (kind === "car_pickup") { // open cargo bed
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, S.W - 0.25), std("#2a2a2a", { roughness: 0.9 })); bed.position.set(-1.6, 0.98, 0); g.add(bed);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const wh = wheel(S.wr, 0.24); wh.position.set(sx * S.wx, S.wr, sz * (S.W / 2 - 0.08)); g.add(wh);
  }
  // lights, grille, number plates, mirrors
  const head = std("#fffbe8", { emissive: "#fff3c4", emissiveIntensity: 0.6 }), tail = std("#b3121b", { emissive: "#6b0008", emissiveIntensity: 0.5 });
  const fx = S.body.reduce((a, p) => Math.max(a, p[0]), 0) + 0.05, rx = S.body.reduce((a, p) => Math.min(a, p[0]), 0) - 0.05;
  const ly = kind === "car_sedan" ? 0.72 : 0.9;
  for (const sz of [-1, 1]) {
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.34), head), fx, ly, sz * (S.W / 2 - 0.28));
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.3), tail), rx, ly + 0.05, sz * (S.W / 2 - 0.26));
    const mir = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.2), paint), kind === "car_sedan" ? 1.05 : 1.2, kind === "car_sedan" ? 1.05 : 1.25, sz * (S.W / 2 + 0.06));
    mir.castShadow = false;
  }
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.9), std("#222", { metalness: 0.4 })), fx, ly - 0.05, 0);
  for (const x of [fx + 0.01, rx - 0.01]) add(g, new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.48), std("#f5f5f5")), x, 0.5, 0);
  return g;
}

function foliage(g, cy, r, color, n = 5, seed = 1) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r * (0.55 + rnd() * 0.45), 1), std(new THREE.Color(color).offsetHSL(0, 0, (rnd() - 0.5) * 0.08), { roughness: 0.95, flatShading: true }));
    add(g, m, (rnd() - 0.5) * r * 1.1, cy + (rnd() - 0.4) * r * 0.8, (rnd() - 0.5) * r * 1.1);
  }
}

export function makeProp(kind, color) {
  const g = new THREE.Group();
  if (kind.startsWith("car_")) return car(kind, color || PROPS[kind].color);
  if (kind === "tree") {
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 2.2, 10), std("#6b4a2f", { roughness: 1 })), 0, 1.1, 0);
    foliage(g, 3.0, 1.3, "#3f7a35", 7, 3);
  } else if (kind === "olive") {
    const t = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 1.6, 9), std("#7a6650", { roughness: 1 })), 0, 0.8, 0); t.rotation.z = 0.12;
    foliage(g, 2.2, 1.1, "#7d8f5a", 8, 7);
  } else if (kind === "palm") {
    for (let i = 0; i < 8; i++) { const seg = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.6, 9), std("#8a6d4b", { roughness: 1 })), Math.sin(i * 0.12) * 0.15 * i * 0.2, 0.3 + i * 0.58, 0); seg.rotation.z = 0.03; }
    for (let i = 0; i < 9; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.28, 2.4, 4, 1), std("#4f7f2e", { flatShading: true, side: THREE.DoubleSide }));
      leaf.geometry.translate(0, 1.2, 0);
      const piv = new THREE.Group(); piv.position.set(0.15, 4.7, 0); piv.rotation.y = (i / 9) * Math.PI * 2; leaf.rotation.z = -1.9; leaf.castShadow = true; piv.add(leaf); g.add(piv);
    }
  } else if (kind === "pine") {
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 1.2, 8), std("#5b4030", { roughness: 1 })), 0, 0.6, 0);
    for (let i = 0; i < 4; i++) add(g, new THREE.Mesh(new THREE.ConeGeometry(1.3 - i * 0.25, 1.6, 9), std("#2e5b37", { flatShading: true })), 0, 1.6 + i * 0.85, 0);
  } else if (kind === "bush") {
    foliage(g, 0.45, 0.6, "#4c7d39", 6, 11);
  } else if (kind === "flowers") {
    add(g, new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 0.6), std("#b9b2a5", { roughness: 1 })), 0, 0.15, 0);
    add(g, new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.5), std("#5a3e2b", { roughness: 1 })), 0, 0.31, 0);
    const cols = ["#e5484d", "#f5c518", "#f28cb1", "#ffffff", "#9b59b6"];
    for (let i = 0; i < 22; i++) {
      const x = -0.68 + (i % 11) * 0.135, z = i < 11 ? -0.12 : 0.12;
      add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.25, 4), std("#3d7a2f")), x, 0.45, z);
      add(g, new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), std(cols[i % 5])), x, 0.58, z);
    }
  } else if (kind === "tank") { // the water tank on Kurdish roofs
    for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) add(g, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.05), std("#5a5a5a", { metalness: 0.6 })), x, 0.3, z);
    add(g, new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 1.0), std("#5a5a5a", { metalness: 0.6 })), 0, 0.62, 0);
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.25, 28), std("#e9edf0", { roughness: 0.4 })), 0, 1.27, 0);
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16), std("#2c6fb7")), 0, 1.94, 0);
  } else if (kind === "ac") {
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.55, 0.3), std("#f0f0f0", { roughness: 0.4 })), 0, 0.3, 0);
    const fan = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24), std("#3a3a3a")), 0.1, 0.3, 0.16); fan.rotation.x = Math.PI / 2;
  } else if (kind === "dish") {
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), std("#777", { metalness: 0.7 })), 0, 0.45, 0);
    const d = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 12, 0, Math.PI * 2, 0, 0.6), std("#eeeeee", { side: THREE.DoubleSide })), 0.05, 1.0, 0);
    d.rotation.z = 1.1;
  } else if (kind === "lamp") {
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.6, 10), std("#2b2b2b", { metalness: 0.6 })), 0, 1.3, 0);
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.3), std("#fff4d6", { emissive: "#ffd98a", emissiveIntensity: 1.2 })), 0, 2.75, 0);
    add(g, new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.2, 4), std("#2b2b2b")), 0, 3.02, 0).rotation.y = Math.PI / 4;
    const L = new THREE.PointLight(0xffd59a, 6, 8, 2); L.position.set(0, 2.6, 0); g.add(L);
  } else if (kind === "bench") {
    for (const x of [-0.7, 0.7]) add(g, new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.45), std("#2b2b2b", { metalness: 0.6 })), x, 0.22, 0);
    for (let i = 0; i < 4; i++) add(g, new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.1), std("#8a5a32")), 0, 0.46, -0.16 + i * 0.11);
    for (let i = 0; i < 3; i++) add(g, new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.03), std("#8a5a32")), 0, 0.62 + i * 0.13, -0.24);
  } else if (kind === "bbq") {
    for (const x of [-0.35, 0.35]) for (const z of [-0.18, 0.18]) add(g, new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.75, 0.03), std("#333", { metalness: 0.6 })), x, 0.37, z);
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.2, 0.42), std("#2b2b2b", { metalness: 0.5 })), 0, 0.82, 0);
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.38), std("#d9541e", { emissive: "#a8330b", emissiveIntensity: 0.8 })), 0, 0.93, 0);
  } else if (kind === "gen") {
    add(g, new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.8), std("#2f6b3a", { roughness: 0.5 })), 0, 0.5, 0);
    add(g, new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.9), std("#333")), 0, 0.04, 0);
    for (let i = 0; i < 6; i++) add(g, new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.6), std("#1d4426")), -0.6 + i * 0.05, 0.55, 0);
  }
  return g;
}
