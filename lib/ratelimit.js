// Simple per-server rate limiter: stops one user (or one address) from flooding the app.
const buckets = new Map();

// true = allowed. key: "chat:userId" or "reset:ip", max requests per windowMs.
export function allow(key, max, windowMs) {
  const now = Date.now();
  const list = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (list.length >= max) { buckets.set(key, list); return false; }
  list.push(now);
  buckets.set(key, list);
  if (buckets.size > 20000) for (const [k, v] of buckets) if (!v.length || now - v[v.length - 1] > 3600_000) buckets.delete(k);
  return true;
}

export const ipOf = (req) => (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";

export const tooMany = () => Response.json({ error: "slow_down" }, { status: 429, headers: { "Retry-After": "30" } });
