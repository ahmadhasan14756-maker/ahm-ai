// AHM AI Construction & Design Studio — redesign a real photo (room, house, building, garden) with AI.
//  POST { action: "make", tool, category, style, custom, ask, colors, materials, light, keep, hd, ref, original, ratio, project }
//        → the new picture (raw image) + headers X-Project, X-Left, X-Seed. Saved in the user's private projects.
//  POST { action: "list" | "rename" | "delete", id, name }  → the user's own projects
//  GET  → pictures left and whether picture making is set up
// Picture service: Cloudflare Workers AI (FLUX.2 klein) with the user's photo as reference — free daily quota.
import { getUser, getProfile, usageOf, getSettings, isOwner } from "../../../lib/server";
import { jsonCall } from "../../../lib/gemini";
import { makeImage } from "../../../lib/imagegen";
import { quota } from "../../../lib/quota";
import { allow, tooMany } from "../../../lib/ratelimit";
import { saveResult, listProjects, withLinks, renameProject, deleteProject } from "../../../lib/designs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const preferredRegion = "fra1";

const LIMIT = quota("ds", { freeEnv: "DESIGN_FREE", freeDefault: 10, proEnv: "DESIGN_PRO_DAILY", proDefault: 30 });
const err = (error, status = 400, extra = {}) => Response.json({ error, ...extra }, { status });
const JPEG = /^\/9j\/[A-Za-z0-9+/=]+$/; // base64 of a JPEG file (the app always sends JPEG)

const STYLES = {
  modern: "modern: clean lines, warm neutral palette, large windows, natural wood and stone, hidden LED lighting",
  minimal: "minimalist: very clean, calm, few carefully chosen pieces, white and soft beige, no clutter, soft daylight",
  luxury: "luxury: premium marble, brass and gold accents, velvet and leather, statement chandelier, rich textures, elegant symmetry",
  classic: "classic: mouldings and cornices, symmetrical layout, cream and warm gold, tufted furniture, crystal lighting, herringbone wood",
  scandinavian: "Scandinavian: light oak, white walls, cosy textiles, simple functional furniture, plants, bright natural light",
  industrial: "industrial: exposed brick and concrete, black steel, leather, Edison bulbs, open layout",
  contemporary: "contemporary: current trends, curved furniture, mixed textures, bold accent colours, sculptural lighting",
  kurdish: "traditional Kurdish-inspired: hand-woven kilim rugs and cushions with Kurdish geometric motifs, low diwan floor seating, carved walnut wood, natural stone walls, brass lanterns, deep red, saffron, indigo and terracotta, warm mountain-village hospitality, elegant and modern-comfortable",
  mediterranean: "Mediterranean: whitewashed walls, terracotta tiles, arches, blue accents, wrought iron, olive trees, sunny warm light",
  custom: "",
};
const LIGHT = { day: "bright natural daylight", golden: "warm golden-hour light", night: "evening / night with warm interior and exterior lighting turned on" };
const TOOLS = ["interior", "exterior", "redesign"];

async function ctx(req) {
  const user = await getUser(req);
  if (!user) return { fail: err("unauthorized", 401) };
  const [profile, settings] = await Promise.all([getProfile(user), getSettings()]);
  const usage = usageOf(profile, settings);
  if (isOwner(user)) usage.unlimited = true;
  return { user, usage };
}

const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, n);
const list = (a, n = 6) => (Array.isArray(a) ? a.slice(0, n).map((x) => clean(x, 40)).filter(Boolean) : []);

// Turns the user's request (any language) and choices into one clear English instruction for the picture model.
async function buildPrompt(o) {
  const subject = o.tool === "interior" ? "room" : o.tool === "exterior" ? "building / outdoor space" : "space";
  const style = o.style === "custom" ? clean(o.custom, 300) || "tasteful modern" : STYLES[o.style] || STYLES.modern;
  const keep = o.keep
    ? `Keep the exact same ${subject} from image 0: same walls, structure, perspective, camera angle${o.tool === "exterior" ? ", building shape, roof line" : ", windows and doors positions"}. Only change design, finishes, furniture and decoration.`
    : "You may change the layout and structure where it improves the design.";
  const facts = [
    `Category: ${clean(o.category, 40) || subject}.`,
    `Style: ${style}.`,
    o.colors.length ? `Main colours: ${o.colors.join(", ")}.` : "",
    o.materials.length ? `Materials: ${o.materials.join(", ")}.` : "",
    `Lighting: ${LIGHT[o.light] || LIGHT.day}.`,
  ].filter(Boolean).join(" ");
  let wish = clean(o.ask, 800);
  let title = "";
  if (wish) {
    try {
      const j = await jsonCall(
        `You write instructions for an image-editing AI that redesigns a photo (image 0). The user wrote a request in Kurdish Sorani, Arabic or English (maybe Kurdish in Latin letters). Return JSON {"wish": "the request translated to clear, concrete English design instructions (max 70 words), keep every detail", "title": "a 2-5 word project name in the user's language"}.`,
        [{ text: wish }], { maxTokens: 400, think: "minimal" });
      if (j?.wish) wish = clean(j.wish, 600);
      title = clean(j?.title, 60);
    } catch (e) { if (e.message === "unsafe") throw e; }
  }
  const prompt = [
    `Redesign the ${subject} in image 0 as a photorealistic professional ${o.tool === "exterior" ? "architectural exterior" : "interior design"} photograph.`,
    keep, facts, wish ? `Owner's wishes: ${wish}.` : "",
    "High-end architectural visualization, realistic materials and reflections, sharp details, balanced composition. No text, no watermark, no people.",
  ].filter(Boolean).join(" ");
  return { prompt, title };
}

// "Furnish it yourself": the user placed objects on the photo (positions in % of the picture).
async function furnishPrompt(items, refCount) {
  let names = items.map((it) => clean(it.name, 60) + (clean(it.note, 80) ? ` (${clean(it.note, 80)})` : ""));
  // names may be Kurdish/Arabic: one quick translation for all of them
  if (names.some((n) => /[^\x00-\x7F]/.test(n))) {
    try {
      const j = await jsonCall('Translate each item to short English furniture/decor wording. Return JSON {"items": ["..."]} in the same order and count.', [{ text: JSON.stringify(names) }], { maxTokens: 500, think: "minimal" });
      if (Array.isArray(j?.items) && j.items.length === names.length) names = j.items.map((x) => clean(x, 100));
    } catch (e) { if (e.message === "unsafe") throw e; }
  }
  const where = (it) => {
    const x0 = Math.round(it.x), x1 = Math.round(it.x + it.w), y0 = Math.round(it.y), y1 = Math.round(it.y + it.h);
    return `in the area from ${x0}% to ${x1}% from the left edge and ${y0}% to ${y1}% from the top edge of the picture`;
  };
  const lines = items.map((it, i) => `${i + 1}) ${names[i]} — ${where(it)}${it.ref >= 0 && it.ref < refCount ? `, looking like the object in image ${it.ref + 1}` : ""}.`);
  return [
    "Image 0 is a photo of a real space. Add the following objects into this exact space so the result looks like a real, professional photograph.",
    "Keep the space itself unchanged: same walls, floor, ceiling, windows, doors, camera angle and light. Do not add anything that is not in the list.",
    "Each object must have a realistic real-world size for this room, follow the room's perspective, stand on the floor or hang on the wall where it naturally belongs, with correct shadows and reflections.",
    "Objects:", ...lines,
    "No text, no watermark, no people.",
  ].join(" ");
}
// "3D room": the user placed real 3D furniture into the photo; the AI turns the mock-up into a real photograph.
async function composePrompt(items, ghosts) {
  let names = items.map((x) => clean(x, 60)).filter(Boolean).slice(0, 16);
  let gnames = ghosts.map((g) => clean(g.name, 60) + (clean(g.note, 80) ? ` (${clean(g.note, 80)})` : ""));
  const all = [...names, ...gnames];
  if (all.some((n) => /[^\x00-\x7F]/.test(n))) {
    try {
      const j = await jsonCall('Translate each item to short English furniture/decor wording. Return JSON {"items": ["..."]} in the same order and count.', [{ text: JSON.stringify(all) }], { maxTokens: 600, think: "minimal" });
      if (Array.isArray(j?.items) && j.items.length === all.length) { names = j.items.slice(0, names.length).map((x) => clean(x, 100)); gnames = j.items.slice(names.length).map((x) => clean(x, 100)); }
    } catch (e) { if (e.message === "unsafe") throw e; }
  }
  const where = (g) => `in the area from ${Math.round(g.x)}% to ${Math.round(g.x + g.w)}% from the left edge and ${Math.round(g.y)}% to ${Math.round(g.y + g.h)}% from the top edge`;
  return [
    "Image 0 is a photo of a real space into which furniture and objects were inserted as a 3D mock-up. Image 1 is the same space before.",
    "Turn image 0 into one real, professional photograph. Keep every inserted object exactly where it is, with the same size, shape, proportions, colours and materials, and make it sit naturally in the space: realistic lighting that matches the room, soft contact shadows on the floor, reflections and correct perspective.",
    "Keep the space itself as in image 1: same walls, floor, ceiling, windows, doors and camera angle. Do not add, remove or move anything else.",
    names.length ? `The inserted objects are: ${names.join("; ")}.` : "",
    gnames.length ? "Also add: " + ghosts.map((g, i) => `${i + 1}) ${gnames[i]} ${where(g)} of the picture`).join("; ") + ", each at a realistic real-world size for this space." : "",
    "No text, no watermark, no people.",
  ].filter(Boolean).join(" ");
}
const PANO_PROMPT = "Turn image 0 into a 360-degree equirectangular panorama photo of the same space with exactly the same design, furniture, colours, materials and lighting, as seen from the middle of the space. Continue the space naturally behind the camera. Seamless where the left and right edges meet, level horizon. Photorealistic. No text, no watermark, no people.";

// ---- Real 3D models (Poly Haven: free CC0 3D scans, real-world size in metres) ----
const UA = { "User-Agent": "AHM-AI/1.0 (ahm-ai.vercel.app)" };
const PH_FILE = /^https:\/\/dl\.polyhaven\.org\/file\/ph-assets\//;
let phList = null, phAt = 0;
const phFiles = new Map();
async function models() {
  if (phList && Date.now() - phAt < 12 * 3600_000) return phList;
  const r = await fetch("https://api.polyhaven.com/assets?t=models", { headers: UA, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error("models " + r.status);
  const j = await r.json();
  phList = Object.entries(j || {}).map(([id, a]) => ({
    id, name: clean(a?.name || id, 60),
    cats: list(a?.categories, 8), tags: list(a?.tags, 14),
    thumb: /^https:\/\/cdn\.polyhaven\.com\//.test(a?.thumbnail_url || "") ? a.thumbnail_url : `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=256&height=256`,
  }));
  phAt = Date.now();
  return phList;
}
async function modelFiles(id) {
  if (!/^[A-Za-z0-9_-]{2,60}$/.test(id)) throw new Error("bad_request");
  if (phFiles.has(id)) return phFiles.get(id);
  const r = await fetch(`https://api.polyhaven.com/files/${id}`, { headers: UA, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error("bad_request");
  const j = await r.json();
  const g = j?.gltf?.["1k"]?.gltf || j?.gltf?.["2k"]?.gltf;
  if (!g?.url || !PH_FILE.test(g.url)) throw new Error("bad_request");
  const include = {};
  for (const [k, v] of Object.entries(g.include || {})) if (PH_FILE.test(v?.url || "") && !k.includes("..")) include[k] = v.url;
  const out = { url: g.url, include };
  phFiles.set(id, out);
  return out;
}
// how well a model matches the English search words
function score(m, words) {
  const name = m.name.toLowerCase(), id = m.id.toLowerCase(), tags = m.tags.join(" ").toLowerCase(), cats = m.cats.join(" ").toLowerCase();
  let s = 0;
  for (const w of words) {
    if (w.length < 3) continue;
    const re = new RegExp("(^|[^a-z])" + w.replace(/[^a-z]/g, ""));
    if (re.test(name) || re.test(id.replace(/_/g, " "))) s += 3;
    if (re.test(tags)) s += 2;
    if (re.test(cats)) s += 1;
  }
  return s;
}

// The user may type Kurdish (Arabic or Latin letters, misspelled), Arabic or English: turn it into English search words.
async function englishQuery(q) {
  const raw = clean(q, 80);
  try {
    const j = await jsonCall('A user searches for furniture, decoration or home/garden objects. The text may be Kurdish Sorani (Arabic or Latin letters, maybe misspelled), Arabic or English. Return JSON {"q": "the best short English search words (1-4 words)", "alt": ["up to 3 other English words for the same thing"]}.',
      [{ text: raw }], { maxTokens: 120, think: "minimal" });
    if (j?.q) return { q: clean(j.q, 60), alt: list(j.alt, 3) };
  } catch (e) { if (e.message === "unsafe") throw e; }
  return { q: raw, alt: [] };
}

// Search: real 3D models first, then free, legal pictures (Openverse + Wikimedia Commons). No key needed.
async function searchPictures(q) {
  const { q: query, alt } = await englishQuery(q);
  const words = [...new Set([query, ...alt].join(" ").toLowerCase().split(/[^a-z]+/).map((w) => w.replace(/(ies)$/, "y").replace(/([^s])s$/, "$1")).filter((w) => w.length > 2))];
  const [found3d, ov, wm] = await Promise.all([
    models().then((all) => all.map((m) => [score(m, words), m]).filter(([n]) => n > 0).sort((a, b) => b[0] - a[0]).slice(0, 18).map(([, m]) => m)).catch(() => []),
    fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=40&mature=false`, { signal: AbortSignal.timeout(9000), headers: UA })
      .then((r) => r.json()).then((j) => (j.results || []).filter((x) => x.thumbnail).map((x) => ({ thumb: x.thumbnail, title: clean(x.title, 80), credit: clean(x.creator, 60), license: clean(x.license, 20), source: "Openverse" })))
      .catch((e) => { console.error("openverse", String(e.message).slice(0, 80)); return []; }),
    fetch(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query + " filetype:bitmap")}&gsrlimit=30&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=400&format=json`, { signal: AbortSignal.timeout(9000), headers: UA })
      .then((r) => r.json()).then((j) => Object.values(j?.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0)).map((pg) => {
        const ii = pg.imageinfo?.[0];
        return ii?.thumburl ? { thumb: ii.thumburl, title: clean(String(pg.title || "").replace(/^File:|\.[a-z]+$/gi, ""), 80), credit: clean(ii.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, ""), 60), license: clean(ii.extmetadata?.LicenseShortName?.value, 20), source: "Wikimedia" } : null;
      }).filter(Boolean))
      .catch((e) => { console.error("wikimedia", String(e.message).slice(0, 80)); return []; }),
  ]);
  // mix the two picture sources, best first, no repeats
  const pics = [], seen = new Set();
  for (let i = 0; i < Math.max(ov.length, wm.length); i++) for (const x of [ov[i], wm[i]]) if (x && !seen.has(x.thumb)) { seen.add(x.thumb); pics.push(x); }
  return { q: query, models: found3d, results: pics.slice(0, 48) };
}
const GRAB_HOSTS = /^https:\/\/(api\.openverse\.org|upload\.wikimedia\.org)\//;

function size(ratio, hd) {
  const r = Math.min(2.2, Math.max(0.45, Number(ratio) || 1.5));
  const long = hd ? 1920 : 1280;
  const w = r >= 1 ? long : Math.round((long * r) / 16) * 16;
  const h = r >= 1 ? Math.round(long / r / 16) * 16 : long;
  return { width: Math.max(256, w), height: Math.max(256, h) };
}

export async function GET(req) {
  const c = await ctx(req);
  if (c.fail) return c.fail;
  return Response.json({ ...(await LIMIT.left(c.user.id, c.usage)), ready: true });
}

export async function POST(req) {
  try {
    const c = await ctx(req);
    if (c.fail) return c.fail;
    const { user, usage } = c;
    const body = await req.json().catch(() => null);
    if (!body) return err("bad_request");

    if (body.action === "list") {
      const projects = await listProjects(user.id);
      return Response.json({ projects: await withLinks(user.id, projects.slice(0, 40)) });
    }
    if (body.action === "search") {
      if (!(await allow("ds-s:" + user.id, 20, 60000))) return tooMany();
      if (!clean(body.q, 80)) return err("bad_request");
      return Response.json(await searchPictures(body.q));
    }
    if (body.action === "models") {
      try { return Response.json({ models: await models() }, { headers: { "Cache-Control": "private, max-age=3600" } }); }
      catch (e) { console.error("models", e.message); return err("models_off", 503); }
    }
    if (body.action === "model") {
      try { return Response.json(await modelFiles(String(body.id || ""))); }
      catch (e) { return err("bad_request"); }
    }
    if (body.action === "grab") {
      // fetch one search picture for the user (only from the two search sites) so the app can use it as an object
      if (!(await allow("ds-g:" + user.id, 30, 60000))) return tooMany();
      const url = String(body.url || "");
      if (!GRAB_HOSTS.test(url)) return err("bad_request");
      const r = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { "User-Agent": "AHM-AI/1.0 (ahm-ai.vercel.app)" }, redirect: "follow" });
      const type = r.headers.get("content-type") || "";
      if (!r.ok || !/^image\/(jpeg|png|webp|gif)/.test(type)) return err("bad_image");
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 4_000_000) return err("bad_image");
      return new Response(buf, { headers: { "Content-Type": type.split(";")[0], "Cache-Control": "private, max-age=3600" } });
    }
    if (body.action === "rename") return Response.json({ ok: await renameProject(user.id, String(body.id || ""), body.name) });
    if (body.action === "delete") return Response.json({ ok: await deleteProject(user.id, String(body.id || "")) });

    if (body.action === "make") {
      if (!(await allow("ds:" + user.id, 8, 60000))) return tooMany();
      // free pictures only for confirmed e-mails (stops fake accounts using up everyone's free pictures)
      if (!usage.unlimited && !usage.pro && user.confirmed === false) return err("verify_email", 403);
      const tool = TOOLS.includes(body.tool) ? body.tool : "redesign";
      const style = body.style in STYLES ? body.style : "modern";
      const mode = ["furnish", "pano", "compose"].includes(body.mode) ? body.mode : "design";
      const hd = !!body.hd, cost = mode === "pano" || hd ? 2 : 1;
      const left = await LIMIT.left(user.id, usage);
      if (left.left !== null && left.left < cost) return err("limit", 402, left);
      // the photo: a small copy for the AI (must be under 512×512) and a bigger one to keep in the project
      const ref = String(body.ref || ""), original = body.original ? String(body.original) : null;
      if (!JPEG.test(ref) || ref.length > 400_000) return err("bad_image");
      if (original && (!JPEG.test(original) || original.length > 2_600_000)) return err("bad_image");
      let prompt, title = "";
      const extra = []; // pictures of objects the user picked (image 1, 2, 3)
      if (mode === "furnish") {
        const items = (Array.isArray(body.items) ? body.items : []).slice(0, 12).map((it) => ({
          name: clean(it?.name, 60), note: clean(it?.note, 80), ref: Number.isInteger(it?.ref) ? it.ref : -1,
          x: Math.max(0, Math.min(100, Number(it?.x) || 0)), y: Math.max(0, Math.min(100, Number(it?.y) || 0)),
          w: Math.max(2, Math.min(100, Number(it?.w) || 10)), h: Math.max(2, Math.min(100, Number(it?.h) || 10)),
        })).filter((it) => it.name);
        if (!items.length) return err("bad_request");
        for (const r of (Array.isArray(body.itemRefs) ? body.itemRefs : []).slice(0, 3)) {
          if (!JPEG.test(String(r)) || String(r).length > 400_000) return err("bad_image");
          extra.push({ data: String(r) });
        }
        prompt = await furnishPrompt(items, extra.length);
      } else if (mode === "compose") {
        // image 0 = the photo with the 3D furniture placed in it, image 1 = the room before
        const room = String(body.room || "");
        if (!JPEG.test(room) || room.length > 400_000) return err("bad_image");
        extra.push({ data: room });
        const ghosts = (Array.isArray(body.ghosts) ? body.ghosts : []).slice(0, 8).map((g) => ({
          name: clean(g?.name, 60), note: clean(g?.note, 80),
          x: Math.max(0, Math.min(100, Number(g?.x) || 0)), y: Math.max(0, Math.min(100, Number(g?.y) || 0)),
          w: Math.max(2, Math.min(100, Number(g?.w) || 10)), h: Math.max(2, Math.min(100, Number(g?.h) || 10)),
        })).filter((g) => g.name);
        prompt = await composePrompt(Array.isArray(body.items) ? body.items : [], ghosts);
      } else if (mode === "pano") {
        prompt = PANO_PROMPT;
      } else {
        ({ prompt, title } = await buildPrompt({ tool, style, category: body.category, custom: body.custom, ask: body.ask,
          colors: list(body.colors), materials: list(body.materials), light: body.light, keep: body.keep !== false }));
      }
      const seed = Number.isInteger(body.seed) ? body.seed % 2_147_483_647 : Math.floor(Math.random() * 1e9);
      // If only the description-based back-up service is free, describe the photo in words first (free Gemini vision).
      const textOnlyPrompt = async () => {
        try {
          const j = await jsonCall("Describe this photo for an image AI that cannot see it: the space type, size feeling, camera angle, where the windows, doors and walls are, the floor and ceiling. Return JSON {\"scene\": \"max 70 English words\"}.",
            [{ inlineData: { mimeType: "image/jpeg", data: ref } }, { text: "Describe it." }], { maxTokens: 300, think: "minimal" });
          return `${prompt.replace(/ in image 0/g, "").replace(/from image 0/g, "of this scene")} The scene: ${clean(j?.scene, 500)}`;
        } catch { return prompt.replace(/ in image 0/g, "").replace(/from image 0/g, "of this scene"); }
      };
      const dims = mode === "pano" ? { width: 1920, height: 960 } : size(body.ratio, hd);
      const pic = await makeImage({ prompt, refs: [{ data: ref }, ...extra], seed, ...dims, textOnlyPrompt });
      await LIMIT.spend(user.id, usage, cost);
      // keep it in the user's projects (if saving fails, the picture is still returned)
      let project = "";
      try {
        project = await saveResult(user.id, { id: body.project, original, result: pic.data, mime: pic.mime,
          meta: { name: title || clean(body.ask, 40), tool, style, prompt: mode === "design" ? clean(body.ask, 600) : mode } });
      } catch (e) { console.error("design save", e.message); }
      return new Response(Buffer.from(pic.data, "base64"), {
        headers: { "Content-Type": pic.mime, "Cache-Control": "no-store", "X-Project": project, "X-Seed": String(seed),
          "X-Left": left.left === null ? "" : String(left.left - cost), "X-Provider": pic.provider || "" },
      });
    }
    return err("bad_request");
  } catch (e) {
    const m = String(e?.message || "");
    if (["daily_full", "cf_off", "cf_key", "unsafe", "busy", "cf_failed"].includes(m)) return err(m, m === "unsafe" ? 400 : 503);
    console.error("redesign", m.slice(0, 300));
    return err("server", 500);
  }
}
