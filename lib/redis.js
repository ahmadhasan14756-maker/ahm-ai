// Redis (Upstash) — a very fast shared memory for all servers: cache, rate limits and the waiting line.
// Optional: without the keys in Vercel, everything still works (each server just uses its own memory).
// Keys: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_URL + KV_REST_API_TOKEN from the Vercel integration).
import { serverEnv } from "./env";

const url = () => (serverEnv("UPSTASH_REDIS_REST_URL") || serverEnv("KV_REST_API_URL")).replace(/\/+$/, "");
const token = () => serverEnv("UPSTASH_REDIS_REST_TOKEN") || serverEnv("KV_REST_API_TOKEN");
export const hasRedis = () => !!(url() && token());

let downUntil = 0; // if Redis fails, don't slow every request down — skip it for a moment

async function call(path, body) {
  if (!hasRedis() || Date.now() < downUntil) return undefined;
  try {
    const r = await fetch(url() + path, {
      method: "POST",
      headers: { Authorization: "Bearer " + token(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(1200),
      cache: "no-store",
    });
    if (!r.ok) throw new Error("redis " + r.status);
    return await r.json();
  } catch (e) {
    console.error("redis", String(e?.message || e).slice(0, 120));
    downUntil = Date.now() + 15000;
    return undefined;
  }
}

// One command, e.g. redis("SET", "k", "v", "EX", 60). Returns the result, or undefined when Redis is not available.
export async function redis(...cmd) {
  const out = await call("", cmd.map(String));
  return out === undefined ? undefined : out.result;
}

// Several commands in one trip. Returns an array of results, or undefined.
export async function pipeline(cmds) {
  const out = await call("/pipeline", cmds.map((c) => c.map(String)));
  return Array.isArray(out) ? out.map((x) => x.result) : undefined;
}

// ---- JSON cache helpers ----
export async function cacheGet(key) {
  const v = await redis("GET", key);
  if (typeof v !== "string") return undefined;
  try { return JSON.parse(v); } catch { return undefined; }
}
export const cacheSet = (key, value, seconds) => redis("SET", key, JSON.stringify(value), "EX", Math.max(1, Math.round(seconds)));
export const cacheDel = (...keys) => redis("DEL", ...keys);
