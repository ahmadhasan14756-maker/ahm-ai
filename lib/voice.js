// Daily spoken-answer minutes per plan (like Claude's voice limits): free 10, Pro Mini 30, Pro 60, Pro Max 180 — the owner can change them.
import { redis } from "./redis";
import { planById } from "./plans";

const dayKey = () => new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10); // Kurdistan day (UTC+3)
const key = (id) => `vs:${id}:${dayKey()}`;
const local = new Map(); // used when Redis is not set up

export function voiceLimitMin(usage, settings) {
  if (usage.unlimited) return Infinity;
  if (usage.pro) return (planById(settings, usage.plan)?.voice ?? 60);
  return settings.freeVoice ?? 10;
}

export async function voiceUsedSec(id) {
  const v = await redis("GET", key(id));
  if (v !== undefined) return Number(v) || 0;
  return local.get(key(id)) || 0;
}

export async function addVoiceSec(id, secs) {
  const k = key(id);
  const n = Math.ceil(secs);
  const r = await redis("INCRBY", k, n);
  if (r !== undefined) { redis("EXPIRE", k, 2 * 86400); return; }
  if (local.size > 50000) local.clear();
  local.set(k, (local.get(k) || 0) + n);
}

// { limit: minutes, used: minutes } for the app.
export async function voiceInfo(id, usage, settings) {
  const limit = voiceLimitMin(usage, settings);
  const used = Math.floor((await voiceUsedSec(id)) / 60);
  return { limit: Number.isFinite(limit) ? limit : null, used };
}
