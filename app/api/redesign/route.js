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
    if (body.action === "rename") return Response.json({ ok: await renameProject(user.id, String(body.id || ""), body.name) });
    if (body.action === "delete") return Response.json({ ok: await deleteProject(user.id, String(body.id || "")) });

    if (body.action === "make") {
      if (!(await allow("ds:" + user.id, 8, 60000))) return tooMany();
      const tool = TOOLS.includes(body.tool) ? body.tool : "redesign";
      const style = body.style in STYLES ? body.style : "modern";
      const hd = !!body.hd, cost = hd ? 2 : 1;
      const left = await LIMIT.left(user.id, usage);
      if (left.left !== null && left.left < cost) return err("limit", 402, left);
      // the photo: a small copy for the AI (must be under 512×512) and a bigger one to keep in the project
      const ref = String(body.ref || ""), original = body.original ? String(body.original) : null;
      if (!JPEG.test(ref) || ref.length > 400_000) return err("bad_image");
      if (original && (!JPEG.test(original) || original.length > 2_600_000)) return err("bad_image");
      const { prompt, title } = await buildPrompt({ tool, style, category: body.category, custom: body.custom, ask: body.ask,
        colors: list(body.colors), materials: list(body.materials), light: body.light, keep: body.keep !== false });
      const seed = Number.isInteger(body.seed) ? body.seed % 2_147_483_647 : Math.floor(Math.random() * 1e9);
      // If only the description-based back-up service is free, describe the photo in words first (free Gemini vision).
      const textOnlyPrompt = async () => {
        try {
          const j = await jsonCall("Describe this photo for an image AI that cannot see it: the space type, size feeling, camera angle, where the windows, doors and walls are, the floor and ceiling. Return JSON {\"scene\": \"max 70 English words\"}.",
            [{ inlineData: { mimeType: "image/jpeg", data: ref } }, { text: "Describe it." }], { maxTokens: 300, think: "minimal" });
          return `${prompt.replace(/ in image 0/g, "").replace(/from image 0/g, "of this scene")} The scene: ${clean(j?.scene, 500)}`;
        } catch { return prompt.replace(/ in image 0/g, "").replace(/from image 0/g, "of this scene"); }
      };
      const pic = await makeImage({ prompt, ref: { data: ref }, seed, ...size(body.ratio, hd), textOnlyPrompt });
      await LIMIT.spend(user.id, usage, cost);
      // keep it in the user's projects (if saving fails, the picture is still returned)
      let project = "";
      try {
        project = await saveResult(user.id, { id: body.project, original, result: pic.data, mime: pic.mime,
          meta: { name: title || clean(body.ask, 40), tool, style, prompt: clean(body.ask, 600) } });
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
