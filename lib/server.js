import { SUPABASE_URL, serverEnv } from "./env";
import { createClient } from "@supabase/supabase-js";
import { PLANS } from "./plans";

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

/*
  Paid plan: counter starts at 0 when the owner activates it (period_key "paid:<date>") and lasts until plan_until.
  Free plan: counter resets every calendar month (period_key "2026-10").
*/
export function usageOf(p) {
  const paid = isPaidActive(p);
  const plan = paid ? PLANS[p.plan] || PLANS.p5 : PLANS.free;
  const key = paid ? p.period_key : monthKey();
  const used = p.period_key === key ? p.used || 0 : 0;
  return { pro: paid, plan: plan.id, planName: plan.name, used, limit: plan.limit, periodKey: key, planUntil: paid ? p.plan_until : null };
}
