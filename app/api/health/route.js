// Diagnostic page: /api/health — shows which parts work (never shows the keys themselves).
import { adminDb } from "../../../lib/server";
import { serverEnv, SUPABASE_URL, SUPABASE_ANON_KEY } from "../../../lib/env";
import { redis, hasRedis } from "../../../lib/redis";
import { keyCount, allKeys } from "../../../lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const kind = (v) => (!v ? "missing" : v.startsWith("sb_secret_") ? "sb_secret" : v.startsWith("sb_publishable_") ? "sb_publishable" : v.startsWith("eyJ") ? "jwt" : v.startsWith("AIza") ? "AIza" : v.startsWith("AQ.") ? "AQ" : "other");

export async function GET() {
  const out = {
    supabase_url: SUPABASE_URL,
    anon_key: kind(SUPABASE_ANON_KEY),
    service_key: kind(serverEnv("SUPABASE_SERVICE_ROLE_KEY")),
    gemini_key: kind(serverEnv("GEMINI_API_KEY")),
    model: serverEnv("GEMINI_MODEL") || "gemini-3.8-flash",
    ai_keys: keyCount(),
  };
  // each AI key: does Google accept it? (only its first 2 letters and length are shown — never the key)
  out.ai_key_check = await Promise.all(allKeys().map(async (k, i) => {
    let ok = "?";
    try {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", { headers: { "x-goog-api-key": k }, signal: AbortSignal.timeout(6000) });
      ok = r.ok ? "ok" : r.status === 400 || r.status === 401 || r.status === 403 ? "NOT VALID (" + r.status + ")" : "error " + r.status;
    } catch { ok = "no answer"; }
    return { key: i + 1, starts: k.slice(0, 2), length: k.length, google: ok };
  }));
  out.redis = !hasRedis() ? "missing" : (await redis("PING")) === "PONG" ? "ok" : "ERROR";
  try {
    const { error } = await adminDb().from("jobs").select("id", { head: true, count: "exact" });
    out.jobs_table = error ? "missing" : "ok";
  } catch { out.jobs_table = "missing"; }

  try {
    const { error, count } = await adminDb().from("profiles").select("*", { count: "exact", head: true });
    out.database = error ? "ERROR: " + error.message : `ok (${count} users)`;
  } catch (e) {
    out.database = "ERROR: " + e.message;
  }

  // why recent answers were refused (reason codes from Google only — no user messages)
  if (hasRedis()) {
    for (const k of ["builds", "ai_errors"]) { try { out["recent_" + k] = ((await redis("LRANGE", "dbg:" + k, 0, 9)) || []).map((x) => { try { return JSON.parse(x); } catch { return x; } }); } catch {} }
  }
  if (hasRedis()) { try { out.recent_refusals = ((await redis("LRANGE", "dbg:refusals", 0, 9)) || []).map((x) => { try { return JSON.parse(x); } catch { return x; } }); } catch {} }
  return Response.json(out, { headers: { "Cache-Control": "no-store" } });
}
