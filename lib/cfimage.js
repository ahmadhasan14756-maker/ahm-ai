// Free picture making with Cloudflare Workers AI (10,000 free "neurons" a day, no card needed).
// Needs CF_ACCOUNT_ID + CF_API_TOKEN in Vercel. Never import this in a "use client" file.
//  - "plan" model (FLUX.2 klein 4B): can look at a reference picture (the user's floor plan), ~100–170 neurons a picture
//  - "fast" model (FLUX.1 schnell): text only, cheaper (~60 neurons), used for room interiors
import { serverEnv } from "./env";
import { redis } from "./redis";

const MODEL_PLAN = () => serverEnv("CF_IMAGE_MODEL") || "@cf/black-forest-labs/flux-2-klein-4b";
const MODEL_FAST = () => serverEnv("CF_IMAGE_MODEL_FAST") || "@cf/black-forest-labs/flux-1-schnell";
const DAILY = () => Number(serverEnv("CF_DAILY_NEURONS")) || 9600; // keep a little under the free 10,000

// People often copy Cloudflare's whole example ("curl … Authorization: Bearer <token>") instead of only the token:
// take the token (and account id) out of it, so it works either way.
function cfToken() {
  const v = serverEnv("CF_API_TOKEN");
  const m = v.match(/Bearer:?([A-Za-z0-9_-]{20,})/i);
  return (m ? m[1] : v).replace(/["'\\]/g, "");
}
function cfAccount() {
  const v = serverEnv("CF_ACCOUNT_ID");
  const m = (v + " " + serverEnv("CF_API_TOKEN")).match(/accounts\/([a-f0-9]{32})/i);
  return /^[a-f0-9]{32}$/i.test(v) ? v : m ? m[1] : (v.match(/[a-f0-9]{32}/i)?.[0] || v);
}
export const hasCF = () => !!(cfAccount() && cfToken());

const dayKey = () => "cfn:" + new Date().toISOString().slice(0, 10); // Cloudflare resets at 00:00 UTC
const tiles = (w, h) => Math.ceil(w / 512) * Math.ceil(h / 512);
export const neuronsFor = ({ withPlan, width, height }) =>
  withPlan ? Math.ceil(tiles(width, height) * 26.05 + 5.37) : Math.ceil(tiles(1024, 1024) * 4.8 + 6 * 9.6);

// Is there still free room today for this many neurons? (Without Redis we just try.)
export async function cfRoom(n) {
  const used = Number(await redis("GET", dayKey())) || 0;
  return used + n <= DAILY();
}
async function cfSpend(n) {
  const k = dayKey();
  const r = await redis("INCRBY", k, n);
  if (r !== undefined) redis("EXPIRE", k, 2 * 86400);
}

function cfError(status, body) {
  const s = String(body || "").slice(0, 300);
  console.error("cloudflare image", status, s);
  if (status === 429 || /4006|daily|neuron|limit|quota/i.test(s)) return new Error("daily_full");
  if (status === 401 || status === 403 || /auth/i.test(s)) return new Error("cf_key");
  if (/nsfw|unsafe|flagged/i.test(s)) return new Error("unsafe");
  return new Error("cf_failed");
}

async function callModel(model, { prompt, width, height, ref, seed }) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${cfAccount()}/ai/run/${model}`;
  const headers = { Authorization: "Bearer " + cfToken() };
  let body;
  if (/flux-2/.test(model)) {
    // FLUX.2 takes multipart form data and up to 4 reference pictures.
    body = new FormData();
    body.append("prompt", prompt.slice(0, 2000));
    body.append("width", String(width));
    body.append("height", String(height));
    if (seed != null) body.append("seed", String(seed));
    if (ref) body.append("input_image_0", new Blob([Buffer.from(ref.data, "base64")], { type: "image/jpeg" }), "plan.jpg");
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({ prompt: prompt.slice(0, 2000), steps: 6, ...(seed != null ? { seed } : {}) });
  }
  const r = await fetch(url, { method: "POST", headers, body, signal: AbortSignal.timeout(55000), cache: "no-store" });
  if (!r.ok) throw cfError(r.status, await r.text().catch(() => ""));
  const type = r.headers.get("content-type") || "";
  if (type.startsWith("image/")) return { data: Buffer.from(await r.arrayBuffer()).toString("base64"), mime: type.split(";")[0] };
  const j = await r.json().catch(() => ({}));
  const img = j?.result?.image || j?.image;
  if (!img) throw cfError(r.status, JSON.stringify(j?.errors || j).slice(0, 300));
  return { data: img, mime: img.startsWith("iVBOR") ? "image/png" : "image/jpeg" };
}

// Returns { data: base64, mime }. ref = { data: base64 jpeg (smaller than 512×512) }: the user's plan.
// Every picture uses the better model first (it worked best in real tests); the fast one is only a backup.
export async function cfImage({ prompt, width = 1280, height = 768, ref, seed }) {
  if (!hasCF()) throw new Error("cf_off");
  const tries = [[MODEL_PLAN(), neuronsFor({ withPlan: true, width, height })], ...(ref || width > 1280 ? [] : [[MODEL_FAST(), neuronsFor({ withPlan: false })]])];
  let last;
  for (const [model, cost] of tries) {
    if (!(await cfRoom(cost))) throw new Error("daily_full");
    try {
      const out = await callModel(model, { prompt, width, height, ref, seed });
      await cfSpend(cost);
      return out;
    } catch (e) {
      last = e;
      if (e.message !== "cf_failed") throw e; // key / daily / unsafe: no point trying again
    }
  }
  throw last;
}
