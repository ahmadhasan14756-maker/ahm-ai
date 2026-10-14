// AHM AI Studio: logos, posters, pictures, photo edits and merging two photos into one.
// - Logos and posters are drawn as real vector designs (SVG): sharp, and Kurdish/Arabic text is exact.
// - Pictures, edits and merges use Google's image model when it is available (needs Billing on the key);
//   otherwise a free generator draws a new picture from a detailed description.
import { gemini, jsonCall, keyCount } from "../../../lib/gemini";
import { serverEnv } from "../../../lib/env";
import { GEMINI_SAFETY } from "../../../lib/safety";
import { getUser, getProfile, usageOf, getSettings, blockedResponse, chargeUsage } from "../../../lib/server";
import { allow, tooMany } from "../../../lib/ratelimit";
import { saveJob, validJobId } from "../../../lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const preferredRegion = "fra1";

const PHOTO = /^image\/(jpeg|png|webp)$/;
const AUDIO = /^audio\/(webm|mp4|mpeg|ogg|wav|aac|x-m4a|m4a)$/;
const MAX_CHARS = 4_200_000;
const RATIO = { square: "1:1", portrait: "9:16", landscape: "16:9" };
const LANG = { ckb: "Kurdish Sorani (Arabic script)", ar: "Arabic", en: "English" };

// Google image models, newest first. The owner can force one with GEMINI_IMAGE_MODEL in Vercel.
const IMAGE_MODELS = () => [...new Set([serverEnv("GEMINI_IMAGE_MODEL"), "gemini-3.1-flash-lite-image", "gemini-3.1-flash-image", "gemini-2.5-flash-image"].filter(Boolean))];
let imageOffUntil = 0; // when the key has no image access, don't keep trying for a while

const PLAN = (lang, kind, hasPhotos) => `You are the art director of AHM AI Studio, an expert in graphic design, branding, photography and image editing.
The user writes or speaks in Kurdish Sorani, Arabic or English (maybe Kurdish in Latin letters). Reply texts must be in ${LANG[lang]}.
${hasPhotos ? "The user attached photo(s). Look at them very carefully (people, faces, clothes, objects, colours, background, light)." : ""}
If there is an audio message, it IS the request: listen carefully and write what was said in "heard" (in the language spoken).

Decide the task${kind !== "auto" ? ` (the user chose "${kind}", keep it unless photos make "edit"/"merge" clearly right)` : ""}:
- "logo": a logo / brand mark / icon for a business, channel, app or person.
- "poster": a poster, flyer, social-media post, invitation, banner, menu, certificate — a layout with text.
- "image": a new picture, photo, illustration, wallpaper, art or 3D scene (no attached photo needed).
- "edit": change ONE attached photo (background, clothes, colours, style, remove/add things, improve quality, make it a cartoon…).
- "merge": combine TWO OR MORE attached photos into one picture (e.g. put the people together, person into a place, two objects into one scene).

Return JSON:
{"task": "...", "heard": "...or empty", "caption": "one short friendly sentence in ${LANG[lang]} saying what you are making",
 "prompt": "for image/edit/merge: an excellent English instruction for an image model (60–140 words). For edit/merge refer to the photos as 'the first photo', 'the second photo' and say exactly what to keep (faces and identity must stay the same) and what to change; describe composition, lighting, colours, style and quality. For a new image: subject first, then setting, composition, camera/lens, lighting, palette, mood, details, style (photorealistic unless another style is asked). Image models cannot write Kurdish/Arabic letters: leave such text out and keep clean space for it.",
 "fallback": "a complete, self-contained English description (60–120 words) of the FINAL picture for a text-only generator that cannot see the photos: describe the people/objects from the photos in detail (age, hair, clothes, colours) and the scene",
 "brief": "for logo/poster: the full design brief in the user's own words and language, including every name and text they want"}
${SAFETY_HINT}`;

const SAFETY_HINT = `Never create sexual, nude or revealing content, gore, hateful symbols, or fake documents/IDs/money. Never put a real public figure into a fake or embarrassing scene. If asked, return {"blocked": true}.`;

const SVG_KIND = {
  logo: `LOGO on a 1024×1024 canvas: viewBox="0 0 1024 1024".`,
  poster: `POSTER / SOCIAL POST on a 1080×1350 canvas: viewBox="0 0 1080 1350".`,
};
// Three different creative directions, made at the same time (faster, and each one gets full attention).
const DIRECTIONS = {
  logo: [
    "Direction A — MODERN MINIMAL MARK: one clever geometric symbol (negative space, a hidden meaning or a monogram from the name's first letters) above or beside a strong wordmark. 2 colours + white. Swiss precision, like Apple, Airbnb or Pentagram work.",
    "Direction B — PREMIUM EMBLEM / BADGE: a circular or shield emblem with a rich gradient, fine inner ring, a central illustration built from shapes, and the name set large and bold inside or under it. Luxury feel, like a premium brand or sports club.",
    "Direction C — BOLD TYPOGRAPHIC LOGO: the NAME itself is the hero — very large, heavy weight, with a creative detail (a letter replaced by a symbol, a colour block, a swoosh or a tagline bar). Vibrant modern palette on a soft coloured background, like Spotify, FedEx or Netflix style.",
  ],
  poster: [
    "Direction A — BOLD MODERN: huge headline across the top half, strong colour-block background with a big gradient circle or wave, clear info block and a bright call-to-action pill.",
    "Direction B — ELEGANT PREMIUM: dark rich background (deep green, navy or black) with gold/cream accents, thin decorative frame or ornaments, centered classic layout, refined and luxurious.",
    "Direction C — FRESH & PLAYFUL: light bright background, large decorative shapes, patterns or confetti, diagonal energy, friendly colours, and a big rounded headline.",
  ],
};
const SVG_SYSTEM = (kind, lang, direction) => `You are a world-class senior graphic designer (Pentagram / award-winning agency level). Create ONE outstanding, professional design as standalone SVG code.
${SVG_KIND[kind]}
${direction}

TYPOGRAPHY (very important — the text must look big, bold and beautiful):
- ${kind === "logo"
    ? "The brand name is LARGE: font-size 110–170 (on the 1024 canvas), font-weight 800 or 900. A tagline (if any) is 40–56, weight 600. Never make the name smaller than 100."
    : "The headline is HUGE: font-size 120–190 (on the 1080 canvas), font-weight 900, max 2–3 short lines. Sub-headline 52–72 weight 700. Details (date, place, phone) 38–48 weight 600. Nothing smaller than 34."}
- For Kurdish or Arabic text: direction="rtl", font-family="'Noto Kufi Arabic','Vazirmatn',Tahoma,sans-serif". For Latin text: font-family="'Montserrat','Rubik','Helvetica Neue',Arial,sans-serif" (Latin may use letter-spacing 2–8 for elegance).
- Use text-anchor="middle" centred on a clear x, and keep every line INSIDE the canvas with ≥70px margins: estimate width ≈ characters × font-size × 0.55 and lower the size if a line would be too wide; split long text into lines (separate <text> elements).
- Strong contrast between text and background; for text on busy areas add a subtle shadow (a duplicate text offset by 3–4px in a darker colour, or paint-order="stroke" with stroke-width 6–10 in a dark colour).
- Write every word EXACTLY as the user wrote it (same spelling and language). If the user didn't give a name/text, invent a fitting short one in ${LANG[lang]}.

QUALITY:
- One complete <svg xmlns="http://www.w3.org/2000/svg" ...> with the viewBox above. No <image>, no <script>, no <foreignObject>, no external links, fonts or CSS imports.
- Deliberate palette (3–5 colours), real visual hierarchy, alignment, generous spacing, depth (linearGradient/radialGradient, soft shadows with filter feGaussianBlur/feDropShadow, layered shapes). Use smooth <path> curves for symbols/illustrations. No clip-art, no generic templates, no empty boring areas.
- Give every id a unique prefix (e.g. "d1g1") so designs don't clash.
- If photos are attached, use them as inspiration (colours, subject, style). If there is an audio message, it IS the request; write what was said in "heard".
- If earlier requests are given, the new request is a CHANGE to that design: keep what they liked and apply the change.
Return JSON: {"heard": "...or empty", "caption": one short sentence in ${LANG[lang]} describing the concept, "name": 1–3 word concept name in ${LANG[lang]}, "svg": "<svg ...>...</svg>"}`;

function cleanSvg(svg) {
  let s = String(svg || "").trim();
  const start = s.indexOf("<svg");
  const end = s.lastIndexOf("</svg>");
  if (start < 0 || end < 0) return null;
  s = s.slice(start, end + 6)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/<image[\s\S]*?(\/>|<\/image>)/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/(href\s*=\s*["'])(?!#)[^"']*(["'])/gi, "$1#$2")
    .replace(/@import[^;]*;/gi, "");
  if (!/xmlns=/.test(s)) s = s.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  return s.length < 120_000 ? s : null;
}

const errText = (e) => String(e?.status || "") + " " + String(e?.message || e || "");

// Draws with Google's image model. Returns data URLs, or null when the key has no image access.
async function drawWithGoogle(prompt, photos, ratio) {
  if (Date.now() < imageOffUntil) return null;
  let noAccess = 0;
  const models = IMAGE_MODELS();
  for (const model of models) {
    for (let k = 0; k < Math.min(2, keyCount()); k++) {
      try {
        const r = await gemini().models.generateContent({
          model,
          contents: [{ role: "user", parts: [...photos.map((p) => ({ inlineData: { mimeType: p.mimeType, data: p.data } })), { text: prompt }] }],
          config: { responseModalities: ["IMAGE", "TEXT"], imageConfig: { aspectRatio: RATIO[ratio] || "1:1" }, safetySettings: GEMINI_SAFETY },
        });
        const why = String(r.promptFeedback?.blockReason || r.candidates?.[0]?.finishReason || "");
        if (/SAFETY|PROHIBITED|BLOCKLIST|IMAGE_SAFETY/i.test(why)) throw new Error("unsafe");
        const out = (r.candidates?.[0]?.content?.parts || []).filter((p) => p.inlineData?.data)
          .map((p) => `data:${p.inlineData.mimeType || "image/png"};base64,${p.inlineData.data}`);
        if (out.length) return out.slice(0, 2);
        break; // no picture came back: try the next model
      } catch (e) {
        if (e?.message === "unsafe") throw e;
        const m = errText(e);
        console.error("studio image", model, m.slice(0, 200));
        if (/SAFETY|PROHIBITED/i.test(m)) throw new Error("unsafe");
        if (/404|NOT_FOUND|not found|not supported|403|PERMISSION|billing|limit: 0|free_tier/i.test(m)) { noAccess++; break; } // model not usable on this key
        if (/429|RESOURCE_EXHAUSTED|quota/i.test(m)) continue; // busy: another key
        break;
      }
    }
  }
  if (noAccess === models.length) imageOffUntil = Date.now() + 10 * 60 * 1000;
  return null;
}

export async function POST(req) {
  let failJob = async () => {};
  try {
    const [user, body] = await Promise.all([getUser(req), req.json().catch(() => null)]);
    if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
    if (!allow("studio:" + user.id, 10, 60000)) return tooMany();
    if (!body) return Response.json({ error: "bad_request" }, { status: 400 });

    const lang = LANG[body.lang] ? body.lang : "ckb";
    const kind = ["logo", "poster", "image"].includes(body.kind) ? body.kind : "auto";
    const ratio = RATIO[body.ratio] ? body.ratio : "square";
    const idea = String(body.prompt || "").trim().slice(0, 2000);
    const previous = (Array.isArray(body.previous) ? body.previous : []).map((s) => String(s).slice(0, 400)).slice(-5);
    let total = 0;
    const atts = (Array.isArray(body.images) ? body.images : [])
      .filter((a) => a && typeof a.data === "string" && (PHOTO.test(a.mimeType) || AUDIO.test(a.mimeType)))
      .filter((a) => (total += a.data.length) < MAX_CHARS).slice(0, 6);
    const photos = atts.filter((a) => PHOTO.test(a.mimeType)).slice(0, 4);
    const audio = atts.find((a) => AUDIO.test(a.mimeType));
    // The last picture made in this chat, so "make the sky darker" changes it.
    const last = body.lastImage && PHOTO.test(body.lastImage.mimeType) && typeof body.lastImage.data === "string" && body.lastImage.data.length < 2_500_000 ? body.lastImage : null;
    if (!idea && !audio && !photos.length) return Response.json({ error: "bad_request" }, { status: 400 });
    // Saved as a job too, so the result still arrives if the user leaves the app while it is being made.
    const jobId = validJobId(body.jobId);
    const done = async (out) => { if (jobId) await saveJob(user.id, jobId, "done", JSON.stringify(out)); return Response.json(out); };
    if (jobId) await saveJob(user.id, jobId, "running");
    failJob = async (error) => { if (jobId) await saveJob(user.id, jobId, "done", JSON.stringify({ error })); };

    const profile = await getProfile(user);
    const usage = usageOf(profile, await getSettings());
    const blocked = await blockedResponse(profile, usage);
    if (blocked) return blocked;

    const ask = (previous.length ? `Earlier requests in this design chat:\n- ${previous.join("\n- ")}\n\nNew request: ` : "Request: ") + (idea || "(see the audio message)");
    const media = [...photos, ...(audio ? [audio] : [])].map((a) => ({ inlineData: { mimeType: a.mimeType, data: a.data } }));

    // 1) Understand the request (what to make, a strong prompt, the words heard in a voice message).
    let plan;
    if (kind === "logo" || kind === "poster") plan = { task: kind, brief: idea };
    else {
      const editing = last && !photos.length && previous.length; // a change to the picture made before
      plan = await jsonCall(PLAN(lang, kind, photos.length > 0 || !!editing),
        [...(editing ? [{ inlineData: { mimeType: last.mimeType, data: last.data } }, { text: "(This is the picture you made last time.)" }] : []), ...media, { text: ask }],
        { maxTokens: 3000, think: "low" });
      if (!["logo", "poster", "image", "edit", "merge"].includes(plan.task)) plan.task = photos.length > 1 ? "merge" : photos.length ? "edit" : "image";
      if (plan.task === "edit" && !photos.length && editing) plan.useLast = true;
      if ((plan.task === "edit" || plan.task === "merge") && !photos.length && !plan.useLast) plan.task = "image";
    }

    // 2a) Logos and posters: three vector designs.
    if (plan.task === "logo" || plan.task === "poster") {
      const brief = (previous.length ? `Earlier requests for this design:\n- ${previous.join("\n- ")}\n\nNew request: ` : "Request: ") + (plan.brief || idea || "(see the audio message)");
      const parts = [...(kind === plan.task ? media : photos.map((a) => ({ inlineData: { mimeType: a.mimeType, data: a.data } }))), { text: brief }];
      const results = await Promise.allSettled(DIRECTIONS[plan.task].map((dir) => jsonCall(SVG_SYSTEM(plan.task, lang, dir), parts, { maxTokens: 14000, think: "low" })));
      const ok = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
      if (results.some((r) => r.status === "rejected" && r.reason?.message === "unsafe") && !ok.length) throw new Error("unsafe");
      if (!ok.length) throw new Error(results.find((r) => r.reason?.message === "busy") ? "busy" : "ai");
      const designs = ok.map((d) => ({ name: String(d.name || "").slice(0, 40), svg: cleanSvg(d.svg) })).filter((d) => d.svg);
      if (!designs.length) throw new Error("ai");
      await chargeUsage(profile, usage);
      return done({ task: plan.task, heard: String(plan.heard || ok[0].heard || "").slice(0, 600), caption: String(plan.caption || ok[0].caption || "").slice(0, 300), designs, idea: plan.brief || idea });
    }

    // 2b) Pictures, edits, merges.
    const inputs = plan.useLast ? [last] : plan.task === "image" ? [] : photos;
    const prompt = String(plan.prompt || idea).slice(0, 1500);
    const google = await drawWithGoogle(prompt, inputs, ratio);
    await chargeUsage(profile, usage);
    const base = { task: plan.task, heard: String(plan.heard || "").slice(0, 600), caption: String(plan.caption || "").slice(0, 300), ratio, idea: plan.heard || idea };
    if (google) return done({ ...base, images: google });
    // Free fallback: a new picture drawn from the full description.
    const desc = String((plan.task === "image" ? plan.prompt : plan.fallback || plan.prompt) || idea).slice(0, 900);
    return done({ ...base, free: true, approx: plan.task !== "image", prompt: desc });
  } catch (e) {
    console.error("studio", e?.message);
    const busy = e?.message === "busy";
    await failJob(e?.message === "unsafe" ? "unsafe" : busy ? "busy" : "ai");
    if (e?.message === "unsafe") return Response.json({ error: "unsafe" }, { status: 400 });
    return Response.json({ error: busy ? "busy" : "ai" }, { status: busy ? 503 : 502 });
  }
}
