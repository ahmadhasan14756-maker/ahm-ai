// AHM AI Studio: logos, posters, pictures, photo edits and merging two photos into one.
// - Logos and posters are drawn as real vector designs (SVG): sharp, and Kurdish/Arabic text is exact.
// - Pictures, edits and merges use Google's image model when it is available (needs Billing on the key);
//   otherwise a free generator draws a new picture from a detailed description.
import { gemini, jsonCall, keyCount } from "../../../lib/gemini";
import { serverEnv } from "../../../lib/env";
import { GEMINI_SAFETY } from "../../../lib/safety";
import { getUser, getProfile, usageOf, getSettings, blockedResponse, chargeUsage } from "../../../lib/server";
import { allow, tooMany } from "../../../lib/ratelimit";

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
  logo: `LOGO. viewBox="0 0 1024 1024". A strong, simple, memorable mark (symbol or monogram) built from clean geometric shapes, plus the brand name as a wordmark, well balanced and centered with generous margins. Flat vector style, 2–4 harmonious colours, works on a plain background. Think like Pentagram / Paul Rand: one clear idea per design.`,
  poster: `POSTER / SOCIAL POST. viewBox="0 0 1080 1350". A bold, modern graphic-design layout: strong headline, clear hierarchy, supporting text, decorative shapes, gradients or patterns, and a clear call to action if relevant. Professional print quality with good margins (at least 80px).`,
};
const SVG_SYSTEM = (kind, lang) => `You are a world-class graphic designer. Create 3 clearly DIFFERENT, professional designs as standalone SVG code.
${SVG_KIND[kind]}

Rules:
- Each design is one complete <svg xmlns="http://www.w3.org/2000/svg" ...> element with the viewBox above. No <image>, no <script>, no <foreignObject>, no external links, fonts or CSS imports.
- Use <text> for words. Write every word EXACTLY as the user wrote it (same spelling and language). For Kurdish or Arabic text add direction="rtl" and use font-family="'Noto Kufi Arabic','Geeza Pro','Segoe UI',Tahoma,sans-serif". For Latin text use font-family="'Montserrat','Helvetica Neue',Arial,sans-serif". Keep text inside the canvas (estimate its width; use smaller sizes for long text).
- Real design quality: deliberate palette, contrast, alignment, spacing, and visual hierarchy. Use <defs> with linearGradient/radialGradient, paths, circles and shapes. Avoid clip-art and generic templates.
- If photos are attached, use them as inspiration (colours, subject, style). If there is an audio message, it is the request; write what was said in "heard".
- If the user didn't give a name or text, invent a fitting short one in their language.
- If earlier requests are given, the new request is a CHANGE to that design: keep what they liked and apply the change.
Return JSON: {"heard": "...or empty", "caption": one short sentence in ${LANG[lang]} describing the concepts, "designs": [{"name": 1–3 word concept name in ${LANG[lang]}, "svg": "<svg ...>...</svg>"}, … 3 items]}`;

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
        { maxTokens: 2500 });
      if (!["logo", "poster", "image", "edit", "merge"].includes(plan.task)) plan.task = photos.length > 1 ? "merge" : photos.length ? "edit" : "image";
      if (plan.task === "edit" && !photos.length && editing) plan.useLast = true;
      if ((plan.task === "edit" || plan.task === "merge") && !photos.length && !plan.useLast) plan.task = "image";
    }

    // 2a) Logos and posters: three vector designs.
    if (plan.task === "logo" || plan.task === "poster") {
      const brief = (previous.length ? `Earlier requests for this design:\n- ${previous.join("\n- ")}\n\nNew request: ` : "Request: ") + (plan.brief || idea || "(see the audio message)");
      const out = await jsonCall(SVG_SYSTEM(plan.task, lang), [...(kind === plan.task ? media : photos.map((a) => ({ inlineData: { mimeType: a.mimeType, data: a.data } }))), { text: brief }], { maxTokens: 24000 });
      const designs = (out.designs || []).map((d) => ({ name: String(d.name || "").slice(0, 40), svg: cleanSvg(d.svg) })).filter((d) => d.svg).slice(0, 3);
      if (!designs.length) throw new Error("ai");
      await chargeUsage(profile, usage);
      return Response.json({ task: plan.task, heard: String(plan.heard || out.heard || "").slice(0, 600), caption: String(out.caption || plan.caption || "").slice(0, 300), designs, idea: plan.brief || idea });
    }

    // 2b) Pictures, edits, merges.
    const inputs = plan.useLast ? [last] : plan.task === "image" ? [] : photos;
    const prompt = String(plan.prompt || idea).slice(0, 1500);
    const google = await drawWithGoogle(prompt, inputs, ratio);
    await chargeUsage(profile, usage);
    const base = { task: plan.task, heard: String(plan.heard || "").slice(0, 600), caption: String(plan.caption || "").slice(0, 300), ratio, idea: plan.heard || idea };
    if (google) return Response.json({ ...base, images: google });
    // Free fallback: a new picture drawn from the full description.
    const desc = String((plan.task === "image" ? plan.prompt : plan.fallback || plan.prompt) || idea).slice(0, 900);
    return Response.json({ ...base, free: true, approx: plan.task !== "image", prompt: desc });
  } catch (e) {
    console.error("studio", e?.message);
    if (e?.message === "unsafe") return Response.json({ error: "unsafe" }, { status: 400 });
    const busy = e?.message === "busy";
    return Response.json({ error: busy ? "busy" : "ai" }, { status: busy ? 503 : 502 });
  }
}
