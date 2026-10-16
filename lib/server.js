import { SUPABASE_URL, serverEnv } from "./env";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS, normalizeSettings, planById } from "./plans";
import { notifyOwner, escHtml } from "./telegram";
import { cacheGet, cacheSet, cacheDel } from "./redis";
import { createHash } from "crypto";

// Server-only client with the secret key. Never import this in a "use client" file.
// One client per server is reused for every request (no new connection each time).
let db = null;
export function adminDb() {
  return (db ||= createClient(SUPABASE_URL, serverEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));
}

export const monthKey = () => new Date().toISOString().slice(0, 7); // "2026-10"

export const isPaidActive = (p) => !!(p?.plan && p.plan !== "free" && p.plan_until && new Date(p.plan_until) > new Date());

// Returns the logged-in user from the "Authorization: Bearer <token>" header, or null.
const userCache = new Map(); // token → { user, until }
export async function getUser(req) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!token || token.length > 4000) return null;
  const hit = userCache.get(token);
  if (hit && hit.until > Date.now()) return hit.user;
  // Shared cache (Redis): one login check is reused by every server for a few minutes.
  const key = "tok:" + createHash("sha256").update(token).digest("hex").slice(0, 40);
  let user = await cacheGet(key);
  if (!user?.id) {
    const { data, error } = await adminDb().auth.getUser(token);
    if (error || !data?.user) return null;
    user = { id: data.user.id, email: data.user.email, created_at: data.user.created_at, confirmed: !!(data.user.email_confirmed_at || data.user.confirmed_at) };
    let exp = 0;
    try { exp = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).exp * 1000; } catch {}
    const secs = Math.min(300, exp ? (exp - Date.now()) / 1000 - 5 : 300);
    if (secs > 5) cacheSet(key, user, secs);
  }
  if (userCache.size > 5000) userCache.clear();
  userCache.set(token, { user, until: Date.now() + 60_000 });
  return user;
}

// Loads (or creates) the user's profile row.
const profKey = (id) => "prof:" + id;
// Call after changing a profile anywhere, so the cached copy is not used.
export const dropProfile = (id) => cacheDel(profKey(id));
export async function getProfile(user) {
  const cached = await cacheGet(profKey(user.id));
  if (cached?.id) return cached;
  const db = adminDb();
  const { data } = await db.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data) { cacheSet(profKey(user.id), data, 120); return data; }
  const row = { id: user.id, email: (user.email || "").toLowerCase() };
  // insert (not upsert): only the request that really creates the account sends the "new user" message
  const { data: created, error } = await db.from("profiles").insert(row).select().single();
  if (created && !error) {
    const { count } = await db.from("profiles").select("*", { count: "exact", head: true });
    await notifyOwner(`🎉 <b>بەکارهێنەری نوێ</b>\n👤 ${escHtml(row.email)}\n👥 کۆی بەکارهێنەران: <b>${count ?? "?"}</b>`);
    return created;
  }
  const { data: again } = await db.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return again || { ...row, plan: "free", used: 0, total_count: 0 };
}

// ---- plans the owner can edit (kept in the app_settings table) ----
let cache = { at: 0, value: null };
export async function getSettings() {
  if (cache.value && Date.now() - cache.at < 15000) return cache.value;
  const shared = await cacheGet("settings:v3");
  if (shared) { cache = { at: Date.now(), value: normalizeSettings(shared) }; return cache.value; }
  let value = normalizeSettings(DEFAULT_SETTINGS);
  try {
    const { data, error } = await adminDb().from("app_settings").select("value").eq("key", "main").maybeSingle();
    if (!error && data?.value) {
      value = normalizeSettings(data.value);
      // Old saved plans were switched to the new ones: save that once.
      if ((data.value.v || 1) < 3) await adminDb().from("app_settings").upsert({ key: "main", value, updated_at: new Date().toISOString() });
    }
    if (!error) cacheSet("settings:v3", value, 120);
  } catch {}
  cache = { at: Date.now(), value };
  return value;
}
export async function saveSettings(input) {
  const value = normalizeSettings(input);
  const { error } = await adminDb().from("app_settings").upsert({ key: "main", value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  cache = { at: Date.now(), value };
  await cacheSet("settings:v3", value, 120);
  return value;
}

const OWNER_EMAILS = ["ahmadhasan14756@gmail.com"];
export const isOwner = (user) => {
  const extra = (process.env.ADMIN_EMAILS || "").toLowerCase().split(/[,\s]+/).filter(Boolean);
  return [...OWNER_EMAILS, ...extra].includes(String(user?.email || "").toLowerCase());
};

/*
  Usage limits, like Claude:
  - Each plan gives `limit` questions per window (settings.windowHours, 5 hours). The window starts with the
    first question; when it ends, the full amount is back.
  - A weekly cap (`weekly`) also applies; the week starts with the first question and lasts 7 days.
  - Invite-bonus questions can be used when a limit is reached.
  - The owner is unlimited.
  State lives in profiles.period_key as JSON (no extra columns):
  {"b": base, "ws": window start ms, "wu": used in window, "ks": week start ms, "kn": used in week}
  base = "free" or "paid:<activation>" — when it changes (plan bought/ended) everything starts fresh.
*/
const DAY = 24 * 3600 * 1000;
const WEEK = 7 * DAY;
function readState(key) {
  try { const j = JSON.parse(key); if (j && typeof j === "object") return j; } catch {}
  return { b: key || "" };
}

export function usageOf(p, settings = normalizeSettings(DEFAULT_SETTINGS), now = Date.now()) {
  const W = (settings.windowHours || 5) * 3600 * 1000;
  const windowHours = settings.windowHours || 5;
  if (isOwner(p)) {
    return { pro: true, plan: "owner", planName: "Owner", used: 0, limit: 999999, left: 999999, weekUsed: 0, weekLimit: 999999, windowHours,
      unlimited: true, locked: false, lockedUntil: null, resetAt: null, weekResetAt: null, planUntil: null, state: null };
  }
  // VIP: given by the owner from the Telegram bot — no limits at all, for some days or for ever.
  if (p?.plan === "vip" && p.plan_until && new Date(p.plan_until) > new Date(now)) {
    return { pro: true, plan: "vip", planName: "VIP", used: 0, limit: 999999, left: 999999, weekUsed: 0, weekLimit: 999999, windowHours,
      unlimited: true, vip: true, locked: false, lockedUntil: null, resetAt: null, weekResetAt: null, planUntil: p.plan_until, state: null };
  }
  const paid = isPaidActive(p);
  // If the owner deleted the user's plan, they keep the biggest current limit until it ends.
  const plan = paid
    ? planById(settings, p.plan) || [...settings.paid].sort((a, b) => b.limit - a.limit)[0]
    : { id: "free", name: "free", limit: settings.freeLimit, weekly: settings.freeWeekly ?? settings.freeLimit * 4 };
  let st = readState(p.period_key);
  const base = paid ? (String(st.b || "").startsWith("paid:") ? st.b : "paid:" + (p.plan_until || "")) : "free";
  if (st.b !== base) st = { b: base };
  const winOn = !!(st.ws && now - st.ws < W);
  const weekOn = !!(st.ks && now - st.ks < WEEK);
  const used = winOn ? st.wu || 0 : 0;
  const weekUsed = weekOn ? st.kn || 0 : 0;
  const weekly = plan.weekly ?? plan.limit * 4;
  const bonus = Math.max(0, p.bonus || 0); // extra questions from inviting friends
  const winFull = used >= plan.limit, weekFull = weekUsed >= weekly;
  const locked = (winFull || weekFull) && bonus === 0;
  const lockedUntil = !locked ? null : new Date(weekFull ? st.ks + WEEK : st.ws + W).toISOString();
  return {
    pro: paid, plan: plan.id, planName: plan.name, windowHours,
    used, limit: plan.limit, weekUsed, weekLimit: weekly, bonus,
    left: Math.max(0, Math.min(plan.limit - used, weekly - weekUsed)) + bonus,
    locked, lockedUntil, lockReason: locked ? (weekFull ? "week" : "window") : null,
    resetAt: winOn ? new Date(st.ws + W).toISOString() : null,
    weekResetAt: weekOn ? new Date(st.ks + WEEK).toISOString() : null,
    planUntil: paid ? p.plan_until : null, state: { ...st, b: base },
  };
}

// Builds the profile update when one more question is used.
function nextRound(profile, usage, now = Date.now()) {
  const W = (usage.windowHours || 5) * 3600 * 1000;
  const st = { b: usage.state.b, ws: usage.state.ws, wu: usage.state.wu, ks: usage.state.ks, kn: usage.state.kn };
  if (!(st.ws && now - st.ws < W)) { st.ws = now; st.wu = 0; } // first question of a new window
  if (!(st.ks && now - st.ks < WEEK)) { st.ks = now; st.kn = 0; } // first question of a new week
  let bonus = usage.bonus || 0;
  if (st.wu >= usage.limit || st.kn >= usage.weekLimit) { if (bonus > 0) bonus--; } // limit reached → spend a bonus question
  else { st.wu++; st.kn++; }
  const update = { used: st.wu, period_key: JSON.stringify(st), total_count: (profile.total_count || 0) + 1 };
  if (bonus !== (usage.bonus || 0)) update.bonus = bonus;
  return update;
}

export const isBlocked = (usage) => !usage.unlimited && usage.locked;

// Call once after a question was answered.
export async function chargeUsage(profile, usage) {
  const update = usage.unlimited
    ? { total_count: (profile.total_count || 0) + 1 }
    : nextRound(profile, usage);
  const { error } = await adminDb().from("profiles").update(update).eq("id", profile.id);
  if (error) { console.error("usage update", error.message); await dropProfile(profile.id); }
  else await cacheSet(profKey(profile.id), { ...profile, ...update }, 120); // keep the shared copy correct
}

// Returns the "wait" answer for the app, or null when the user may ask.
export async function blockedResponse(profile, usage) {
  if (!isBlocked(usage)) return null;
  return Response.json({ error: "limit", used: usage.used, limit: usage.limit, weekUsed: usage.weekUsed, weekLimit: usage.weekLimit,
    lockedUntil: usage.lockedUntil, lockReason: usage.lockReason, pro: usage.pro }, { status: 429 });
}

// What the app may see about usage.
export const publicUsage = ({ state, ...u }) => u;
