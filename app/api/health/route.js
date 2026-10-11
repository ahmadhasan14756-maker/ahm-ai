// Diagnostic page: /api/health — shows which parts work (never shows the keys themselves).
import { adminDb } from "../../../lib/server";
import { serverEnv, SUPABASE_URL, SUPABASE_ANON_KEY } from "../../../lib/env";

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
  };

  try {
    const { error, count } = await adminDb().from("profiles").select("*", { count: "exact", head: true });
    out.database = error ? "ERROR: " + error.message : `ok (${count} users)`;
  } catch (e) {
    out.database = "ERROR: " + e.message;
  }

  return Response.json(out, { headers: { "Cache-Control": "no-store" } });
}
