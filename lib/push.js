// Phone / computer notifications ("your answer is ready") with Web Push. Server only.
// No extra settings needed: the push keys are made from the server's own secret key, so they stay the same
// on every deploy. Subscriptions are kept in Redis (up to 5 devices per user, 90 days).
import webpush from "web-push";
import { createECDH, createHash } from "crypto";
import { serverEnv } from "./env";
import { redis } from "./redis";

const b64u = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
let keys = null;
export function pushKeys() {
  if (keys) return keys;
  const secret = serverEnv("PUSH_SECRET") || serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) return null;
  const priv = createHash("sha256").update("ahm-ai-push:" + secret).digest(); // 32 bytes, a valid P-256 key
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(priv);
  keys = { publicKey: b64u(ecdh.getPublicKey()), privateKey: b64u(priv) };
  webpush.setVapidDetails("mailto:ahmadhasan14756@gmail.com", keys.publicKey, keys.privateKey);
  return keys;
}

const key = (uid) => "push:" + uid;
async function list(uid) {
  const v = await redis("GET", key(uid));
  try { const j = JSON.parse(v || "[]"); return Array.isArray(j) ? j : []; } catch { return []; }
}
const save = (uid, subs) => redis("SET", key(uid), JSON.stringify(subs.slice(-5)), "EX", 90 * 86400);

export async function addSubscription(uid, sub) {
  if (!sub?.endpoint || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) throw new Error("bad");
  const clean = { endpoint: String(sub.endpoint).slice(0, 800), keys: { p256dh: String(sub.keys.p256dh).slice(0, 200), auth: String(sub.keys.auth).slice(0, 100) } };
  const subs = (await list(uid)).filter((s) => s.endpoint !== clean.endpoint);
  const r = await save(uid, [...subs, clean]);
  if (r === undefined) throw new Error("no_store");
}
export async function removeSubscription(uid, endpoint) {
  const subs = (await list(uid)).filter((s) => s.endpoint !== endpoint);
  await save(uid, subs);
}

// Sends to every device of the user. Never throws.
export async function sendPush(uid, payload) {
  try {
    if (!pushKeys()) return;
    const subs = await list(uid);
    if (!subs.length) return;
    const gone = [];
    await Promise.all(subs.map((s) => webpush.sendNotification(s, JSON.stringify(payload), { TTL: 3600, urgency: "high" })
      .catch((e) => { if (e?.statusCode === 404 || e?.statusCode === 410) gone.push(s.endpoint); })));
    if (gone.length) await save(uid, subs.filter((s) => !gone.includes(s.endpoint)));
  } catch (e) { console.error("push", String(e?.message || e).slice(0, 120)); }
}
