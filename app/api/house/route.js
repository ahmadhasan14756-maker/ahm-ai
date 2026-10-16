// House design studio:
//  POST { action: "analyze", image, note }            → reads the user's floor plan (Gemini vision, free) and lists rooms
//  POST { action: "render", view, style, plan, ref }  → makes one picture of the design (Cloudflare, free daily quota)
//  GET                                                → how many pictures this user has left
import { getUser, getProfile, usageOf, getSettings, chargeUsage, blockedResponse, isOwner } from "../../../lib/server";
import { jsonCall } from "../../../lib/gemini";
import { cfImage, hasCF } from "../../../lib/cfimage";
import { VIEWS, STYLES, cleanPlan, housePrompt, usesPlan, houseLeft, houseSpend } from "../../../lib/house";
import { allow, tooMany } from "../../../lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const preferredRegion = "fra1";

const LANG_NAME = { ckb: "Kurdish Sorani (Arabic script)", ar: "Arabic", en: "English" };
const B64 = /^[A-Za-z0-9+/=]+$/;
const err = (error, status = 400, extra = {}) => Response.json({ error, ...extra }, { status });

const ANALYZE = (lang) => `You are an experienced architect reading a house floor plan picture (a drawing, sketch, screenshot or photo).
Return JSON only:
{"isPlan": true|false, "floors": number, "area": number|null, "plot": {"w": number|null, "l": number|null},
 "rooms": [{"type": "living|guest|bedroom|kitchen|dining|bath|garage|garden|yard|hall|stairs|storage|office|laundry|balcony|other", "name": "...", "w": number|null, "l": number|null, "box": [ymin, xmin, ymax, xmax]}],
 "entrance": "...", "notes": ["..."], "unclear": ["..."]}
Rules:
- Read sizes ONLY when they are written on the plan or can be read clearly from a scale. Never guess a size: use null and add the room to "unclear".
- Sizes in metres (convert cm/ft). "area" = total built area in m² only if it is written or every room size is known; else null.
- List EXACTLY the spaces drawn on the plan — never add a room that is not drawn, never skip one, never merge or split rooms. Use the plan's own room names (translated if needed).
- One entry per room; number repeated rooms (e.g. "Bedroom 1", "Bedroom 2"). A yard/courtyard/garden drawn on the plan is a room too (type "yard" or "garden").
- If part of the plan is cut off or hidden, say so in "unclear" and list only what is visible.
- "box" = where the room is drawn in the picture, as [ymin, xmin, ymax, xmax] from 0 to 1000 (0,0 = top-left of the picture). Follow the drawn walls exactly; neighbouring rooms share their wall line.
- "name", "entrance", "notes" and "unclear" must be written in ${lang}. Keep notes short (max 4), e.g. where the entrance and garage are, which rooms are next to each other.
- If the picture is not a floor plan, return {"isPlan": false}.`;

async function context(req) {
  const user = await getUser(req);
  if (!user) return { fail: err("unauthorized", 401) };
  const [profile, settings] = await Promise.all([getProfile(user), getSettings()]);
  const usage = usageOf(profile, settings);
  if (isOwner(user)) usage.unlimited = true;
  return { user, profile, usage };
}

export async function GET(req) {
  const c = await context(req);
  if (c.fail) return c.fail;
  return Response.json({ ...(await houseLeft(c.user.id, c.usage)), ready: hasCF() });
}

export async function POST(req) {
  try {
    const c = await context(req);
    if (c.fail) return c.fail;
    const { user, profile, usage } = c;
    const body = await req.json().catch(() => null);
    if (!body) return err("bad_request");
    const lang = LANG_NAME[body.lang] ? body.lang : "ckb";

    if (body.action === "analyze") {
      if (!(await allow("house-a:" + user.id, 6, 60000))) return tooMany();
      const blocked = await blockedResponse(profile, usage);
      if (blocked) return blocked;
      const img = String(body.image || "");
      if (img.length < 100 || img.length > 3_000_000 || !B64.test(img)) return err("bad_image");
      const note = String(body.note || "").slice(0, 500);
      const out = await jsonCall(ANALYZE(LANG_NAME[lang]), [
        { inlineData: { mimeType: "image/jpeg", data: img } },
        { text: "Read this floor plan." + (note ? ` The owner says: ${note}` : "") },
      ], { maxTokens: 4000, think: "low" });
      if (!out?.isPlan) return err("not_plan");
      await chargeUsage(profile, usage);
      const plan = cleanPlan(out);
      const list = (a) => (Array.isArray(a) ? a.slice(0, 6).map((x) => String(x).slice(0, 200)) : []);
      return Response.json({
        plan,
        entrance: String(out.entrance || "").slice(0, 200), notes: list(out.notes), unclear: list(out.unclear),
      });
    }

    if (body.action === "render") {
      if (!hasCF()) return err("cf_off", 503);
      if (!(await allow("house-r:" + user.id, 12, 60000))) return tooMany();
      const view = VIEWS.includes(body.view) ? body.view : null;
      const style = STYLES.includes(body.style) ? body.style : null;
      if (!view || !style) return err("bad_request");
      if (!usage.unlimited && !usage.pro && user.confirmed === false) return err("verify_email", 403);
      const left = await houseLeft(user.id, usage);
      if (left.left !== null && left.left <= 0) return err("limit", 402, left);
      const plan = cleanPlan(body.plan);
      const room = Number.isInteger(body.room) ? body.room : -1;
      const pano = view === "room" && body.pano === true;
      const cost = pano ? 2 : 1; // a 360° picture is twice as big
      if (left.left !== null && left.left < cost) return err("limit", 402, left);
      const ref = usesPlan(view) && typeof body.ref === "string" && body.ref.length < 400_000 && B64.test(body.ref) ? { data: body.ref } : null;
      const seed = Number.isInteger(body.seed) ? body.seed % 2_147_483_647 : Math.floor(Math.random() * 1e9);
      const prompt = housePrompt({ view, style, plan, wish: body.wish, room, pano });
      if (!prompt) return err("bad_request");
      const pic = await cfImage({ prompt, ref, seed, width: pano ? 1920 : 1280, height: pano ? 960 : 768 });
      await houseSpend(user.id, usage, cost);
      const after = left.left === null ? null : left.left - cost;
      // Sent as the picture itself (not text), so big 360° pictures stay small enough to send.
      return new Response(Buffer.from(pic.data, "base64"), {
        headers: { "Content-Type": pic.mime, "Cache-Control": "no-store", "X-Left": after === null ? "" : String(after), "X-Seed": String(seed) },
      });
    }
    return err("bad_request");
  } catch (e) {
    const m = String(e?.message || "");
    if (["daily_full", "cf_off", "cf_key", "unsafe", "busy", "cf_failed"].includes(m)) return err(m, m === "unsafe" ? 400 : 503);
    console.error("house", m.slice(0, 300));
    return err("server", 500);
  }
}
