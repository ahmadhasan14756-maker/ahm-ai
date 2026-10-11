import { SUPABASE_URL, serverEnv } from "./env";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS, normalizeSettings, planById } from "./plans";
import { notifyOwner, escHtml } from "./telegram";

// Server-only client with the secret key. Never import this in a "use client" file.
export function adminDb() {
  return createClient(SUPABASE_URL, serverEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const monthKey = () => new Date().toISOString().slice(0, 7); // "2026-10"

export const isPaidActive = (p) => !!(p?.plan && p.plan !== "free" && p.plan_until && new Date(p.plan_until) > new Date());

// Returns the logged-in user from the "Authorization: Bearer <token>" header, or null.
export async function getUser(req) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  if (!token) return null;
  const { data, error } = await adminDb().auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// Loads (or creates) the user's profile row.
export async function getProfile(user) {
  const db = adminDb();
  const { data } = await db.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data) return data;
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
  let value = normalizeSettings(DEFAULT_SETTINGS);
  try {
    const { data, error } = await adminDb().from("app_settings").select("value").eq("key", "main").maybeSingle();
    if (!error && data?.value) value = normalizeSettings(data.value);
  } catch {}
  cache = { at: Date.now(), value };
  return value;
}
export async function saveSettings(input) {
  const value = normalizeSettings(input);
  const { error } = await adminDb().from("app_settings").upsert({ key: "main", value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  cache = { at: Date.now(), value };
  return value;
}

const OWNER_EMAILS = ["ahmadhasan14756@gmail.com"];
export const isOwner = (user) => {
  const extra = (process.env.ADMIN_EMAILS || "").toLowerCase().split(/[,\s]+/).filter(Boolean);
  return [...OWNER_EMAILS, ...extra].includes(String(user?.email || "").toLowerCase());
};

/*
  Usage rounds:
  - Each plan gives `limit` questions (free: settings.freeLimit, paid: plan.limit).
  - When they are used up, the account waits: 1st time cooldowns[0] hours (5), then 7, 10, 24 (the last value repeats).
  - After the wait the full amount comes back.
  - If a whole day passes between the end of one wait and the next time the questions run out, it starts again at 5 hours.
  - The owner is unlimited.
  The round state lives in profiles.period_key as JSON (no extra columns needed):
  {"b": base, "lu": lockedUntil ms, "st": next step, "le": last lock end ms}
  base = "free" or "paid:<activation date>" — when it changes (plan bought/ended) everything starts fresh.
*/
const DAY = 24 * 3600 * 1000;
function readState(key) {
  try { const j = JSON.parse(key); if (j && typeof j === "object") return j; } catch {}
  return { b: key || "" };
}

export function usageOf(p, settings = normalizeSettings(DEFAULT_SETTINGS), now = Date.now()) {
  const cooldowns = settings.cooldowns?.length ? settings.cooldowns : DEFAULT_SETTINGS.cooldowns;
  if (isOwner(p)) {
    return { pro: true, plan: "owner", planName: "Owner", used: 0, limit: 999999, unlimited: true, locked: false, lockedUntil: null, planUntil: null, cooldowns, state: null };
  }
  const paid = isPaidActive(p);
  // If the owner deleted the user's plan, they keep the biggest current limit until it ends.
  const plan = paid
    ? planById(settings, p.plan) || [...settings.paid].sort((a, b) => b.limit - a.limit)[0]
    : { id: "free", name: "free", limit: settings.freeLimit };
  let st = readState(p.period_key);
  const base = paid ? (String(st.b || "").startsWith("paid:") ? st.b : "paid:" + (p.plan_until || "")) : "free";
  let used = p.used || 0;
  if (st.b !== base) { st = { b: base }; used = 0; }
  if (st.lu && now >= st.lu) { st = { b: base, st: st.st || 0, le: st.lu }; used = 0; } // wait is over → full amount back
  const locked = !!(st.lu && now < st.lu);
  return {
    pro: paid, plan: plan.id, planName: plan.name, used: Math.min(used, plan.limit), limit: plan.limit,
    locked, lockedUntil: locked ? new Date(st.lu).toISOString() : null,
    nextWait: cooldowns[Math.min(st.st || 0, cooldowns.length - 1)],
    planUntil: paid ? p.plan_until : null, cooldowns, state: st,
  };
}

// Builds the profile update when one more question is used (and starts the wait if that was the last one).
function nextRound(profile, usage, now = Date.now()) {
  const st = { ...usage.state };
  const used = usage.used + 1;
  if (used >= usage.limit) {
    let step = st.st || 0;
    if (st.le && now - st.le > DAY) step = 0; // a calm day → back to the shortest wait
    const hours = usage.cooldowns[Math.min(step, usage.cooldowns.length - 1)];
    st.lu = now + hours * 3600 * 1000;
    st.st = step + 1;
  }
  return { used, period_key: JSON.stringify(st), total_count: (profile.total_count || 0) + 1 };
}

export const isBlocked = (usage) => !usage.unlimited && (usage.locked || usage.used >= usage.limit);

// Call once after a question was answered.
export async function chargeUsage(profile, usage) {
  const update = usage.unlimited
    ? { total_count: (profile.total_count || 0) + 1 }
    : nextRound(profile, usage);
  const { error } = await adminDb().from("profiles").update(update).eq("id", profile.id);
  if (error) console.error("usage update", error.message);
}

// Returns the "wait" answer for the app, or null when the user may ask.
// (If the questions are used up but no wait was started — e.g. the owner lowered a limit — the wait starts now.)
export async function blockedResponse(profile, usage) {
  if (!isBlocked(usage)) return null;
  let lockedUntil = usage.lockedUntil;
  if (!usage.locked) {
    const upd = nextRound(profile, { ...usage, used: usage.limit - 1 });
    delete upd.total_count;
    await adminDb().from("profiles").update(upd).eq("id", profile.id);
    lockedUntil = new Date(JSON.parse(upd.period_key).lu).toISOString();
  }
  return Response.json({ error: "limit", used: usage.limit, limit: usage.limit, lockedUntil, pro: usage.pro }, { status: 429 });
}

// What the app may see about usage.
export const publicUsage = ({ state, cooldowns, ...u }) => u;
