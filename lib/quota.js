// Simple usage counters for paid features (presentations, …): free accounts get a number in total,
// Pro gets a number per day, the owner has no limit. Stored in Redis (falls back to memory).
import { redis } from "./redis";
import { serverEnv } from "./env";

const dayKey = () => new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10); // Kurdistan day
const local = new Map();

export function quota(prefix, { freeEnv, freeDefault, proEnv, proDefault }) {
  const key = (uid, usage) => (usage.pro ? `${prefix}p:${uid}:${dayKey()}` : `${prefix}f:${uid}`);
  const max = (usage) => (usage.pro ? Number(serverEnv(proEnv)) || proDefault : Number(serverEnv(freeEnv)) || freeDefault);
  return {
    async left(uid, usage) {
      if (usage.unlimited) return { left: null, max: null, pro: true };
      const k = key(uid, usage), v = await redis("GET", k);
      const used = v !== undefined ? Number(v) || 0 : local.get(k) || 0;
      return { left: Math.max(0, max(usage) - used), max: max(usage), pro: !!usage.pro };
    },
    async spend(uid, usage, n = 1) {
      if (usage.unlimited) return;
      const k = key(uid, usage), r = await redis("INCRBY", k, n);
      if (r !== undefined) { if (usage.pro) redis("EXPIRE", k, 2 * 86400); return; }
      local.set(k, (local.get(k) || 0) + n);
    },
  };
}
