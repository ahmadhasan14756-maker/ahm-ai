// One door for every AI picture in AHM AI, with free back-ups so pictures keep coming:
//   1. Cloudflare Workers AI (FLUX.2) — best, follows the user's photo / plan, free daily quota
//   2. Google Gemini image model — uses the same Gemini key; works only if Google allows images on that key
//   3. Pollinations — free, no key; makes the picture from the description only (cannot look at the photo)
// Each one is tried in turn; a service that is full or not allowed is skipped for a while.
import { cfImage, hasCF } from "./cfimage";
import { gemini } from "./gemini";
import { serverEnv } from "./env";

const skipUntil = new Map(); // service → time to try it again
const skip = (k, ms) => skipUntil.set(k, Date.now() + ms);
const usable = (k) => (skipUntil.get(k) || 0) < Date.now();
const GEMINI_IMAGE_MODELS = () => [serverEnv("GEMINI_IMAGE_MODEL"), "gemini-2.5-flash-image", "gemini-3.1-flash-image-preview", "gemini-2.0-flash-preview-image-generation"].filter(Boolean);

async function viaGemini({ prompt, ref }) {
  let last;
  for (const model of [...new Set(GEMINI_IMAGE_MODELS())]) {
    try {
      const parts = [...(ref ? [{ inlineData: { mimeType: "image/jpeg", data: ref.data } }] : []), { text: (ref ? "Use the attached picture as image 0. " : "") + prompt }];
      const r = await gemini().models.generateContent({ model, contents: [{ role: "user", parts }], config: { responseModalities: ["IMAGE", "TEXT"] } });
      const img = (r.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData?.data);
      if (img) return { data: img.inlineData.data, mime: img.inlineData.mimeType || "image/png" };
      last = new Error("empty");
    } catch (e) {
      last = e;
      const m = String(e?.status || "") + " " + String(e?.message || "");
      if (/SAFETY|PROHIBITED|BLOCK/i.test(m)) throw new Error("unsafe");
      console.error("gemini image", model, m.slice(0, 160));
    }
  }
  throw last || new Error("gemini_image");
}

async function viaPollinations({ prompt, width, height, seed }) {
  const w = Math.min(1280, width), h = Math.round((Math.min(1280, width) / width) * height);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 1500))}?width=${w}&height=${h}&seed=${seed ?? Math.floor(Math.random() * 1e9)}&nologo=true&safe=true&model=flux`;
  const r = await fetch(url, { signal: AbortSignal.timeout(40000), cache: "no-store" });
  const type = r.headers.get("content-type") || "";
  if (!r.ok || !type.startsWith("image/")) throw new Error("pollinations " + r.status);
  return { data: Buffer.from(await r.arrayBuffer()).toString("base64"), mime: type.split(";")[0] };
}

// Returns { data: base64, mime, provider }. Throws "unsafe", or "daily_full" when no service could make it.
export async function makeImage({ prompt, ref, width = 1280, height = 768, seed, textOnlyPrompt }) {
  // 1. Cloudflare
  if (hasCF() && usable("cf")) {
    try { return { ...(await cfImage({ prompt, ref, width, height, seed })), provider: "cloudflare" }; }
    catch (e) {
      if (e.message === "unsafe") throw e;
      skip("cf", e.message === "daily_full" ? msToUtcMidnight() : e.message === "cf_key" ? 10 * 60_000 : 60_000);
    }
  }
  // 2. Gemini image (can follow the photo too)
  if (usable("gemini")) {
    try { return { ...(await viaGemini({ prompt, ref })), provider: "gemini" }; }
    catch (e) { if (e.message === "unsafe") throw e; skip("gemini", 60 * 60_000); }
  }
  // 3. Pollinations: it cannot see the photo, so jobs that follow a photo give a written description of it instead
  if (usable("pollinations")) {
    try {
      const p = ref && textOnlyPrompt ? await textOnlyPrompt() : prompt;
      return { ...(await viaPollinations({ prompt: p, width, height, seed })), provider: "pollinations" };
    }
    catch (e) { console.error("pollinations", String(e.message).slice(0, 120)); skip("pollinations", 2 * 60_000); }
  }
  throw new Error("daily_full");
}

function msToUtcMidnight() {
  const d = new Date(); d.setUTCHours(24, 0, 30, 0);
  return d - Date.now();
}
