import { createClient } from "@supabase/supabase-js";

// Server-only client with the secret key. Never import this in a "use client" file.
export function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const LIMITS = {
  free: Number(process.env.FREE_DAILY_LIMIT || 10),
  pro: Number(process.env.PRO_DAILY_LIMIT || 300),
};

export const today = () => new Date().toISOString().slice(0, 10);

export const isProActive = (p) => !!(p?.pro_until && new Date(p.pro_until) > new Date());

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
  return created || { ...row, daily_count: 0, total_count: 0 };
}

export function usageOf(profile) {
  const pro = isProActive(profile);
  const used = profile.daily_date === today() ? profile.daily_count : 0;
  return { pro, used, limit: pro ? LIMITS.pro : LIMITS.free, proUntil: profile.pro_until || null };
}
