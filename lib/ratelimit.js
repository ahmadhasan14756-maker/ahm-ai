// Rate limiter: stops one user (or one address) from flooding the app.
// With Redis the limit is shared by all servers; without it, each server counts on its own.
import { pipeline } from "./redis";

const buckets = new Map();
function allowLocal(key, max, windowMs) {
  const now = Date.now();
  const list = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (list.length >= max) { buckets.set(key, list); return false; }
  list.push(now);
  buckets.set(key, list);
  if (buckets.size > 20000) for (const [k, v] of buckets) if (!v.length || now - v[v.length - 1] > 3600_000) buckets.delete(k);
  return true;
}

// true = allowed. key: "chat:userId" or "reset:ip", max requests per windowMs.
export async function allow(key, max, windowMs) {
  const slot = Math.floor(Date.now() / windowMs);
  const k = `rl:${key}:${slot}`;
  const out = await pipeline([["INCR", k], ["PEXPIRE", k, windowMs + 1000]]);
  if (out && typeof out[0] === "number") return out[0] <= max;
  return allowLocal(key, max, windowMs);
}

export const ipOf = (req) => (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";

export const tooMany = () => Response.json({ error: "slow_down" }, { status: 429, headers: { "Retry-After": "30" } });
