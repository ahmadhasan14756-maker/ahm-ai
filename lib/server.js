import { SUPABASE_URL, serverEnv } from "./env";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS, normalizeSettings, planById } from "./plans";

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
  const { data: created } = await db.from("profiles").upsert(row).select().single();
  return created || { ...row, plan: "free", used: 0, total_count: 0 };
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
  return [...OWNER_EMAILS, ...extra].includes((user?.email || "").toLowerCase());
};

/*
  Paid plan: counter starts at 0 when the owner activates it (period_key "paid:<date>") and lasts until plan_until.
  Free plan: counter resets every calendar month (period_key "2026-10").
*/
export function usageOf(p, settings = normalizeSettings(DEFAULT_SETTINGS)) {
  const paid = isPaidActive(p);
  // If the owner deleted the user's plan, they keep the biggest current limit until it ends.
  const plan = paid
    ? planById(settings, p.plan) || [...settings.paid].sort((a, b) => b.limit - a.limit)[0]
    : { id: "free", name: "free", limit: settings.freeLimit };
  const key = paid ? p.period_key : monthKey();
  const used = p.period_key === key ? p.used || 0 : 0;
  return { pro: paid, plan: plan.id, planName: plan.name, used, limit: plan.limit, periodKey: key, planUntil: paid ? p.plan_until : null };
}
