// ☁️ Cloud database for the websites, apps and systems people build with AHM AI.
// The built app talks to this address through js/ahm-db.js (window.AHM.db): its data is saved online,
// so every phone and computer sees the same patients / products / sales.
//
//  Owner (signed in to AHM AI):  create   → a new database for a project
//                                setpw    → set / remove the app's admin password
//                                info     → is there a password, how many records
//  The built app (any website):  login    → check the admin password (returns a key, never the password)
//                                list / get / save / remove  → the data, by collection ("patients", "products"…)
//
// Tables: supabase/upgrade-4.sql (app_sites, app_data). Only this server can read or write them.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { adminDb, getUser, getProfile, usageOf, getSettings } from "../../../lib/server";
import { serverEnv } from "../../../lib/env";
import { allow, ipOf } from "../../../lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" };
const out = (body, status = 200) => Response.json(body, { status, headers: { ...CORS, "Cache-Control": "no-store" } });
const SITE = /^[a-z0-9]{12,20}$/, COL = /^[A-Za-z0-9_-]{1,40}$/, ID = /^[A-Za-z0-9_.:-]{1,64}$/;
const MAX_DOC = 50_000; // characters of one record
const MAX_ROWS = 20_000; // records in one app
const SITES = { free: 3, pro: 30 };
const missingTable = (e) => /relation .*app_(data|sites).* does not exist|Could not find the table|schema cache/i.test(e?.message || "");
const secret = () => serverEnv("PUSH_SECRET") || serverEnv("SUPABASE_SERVICE_ROLE_KEY") || "ahm-dev";
const hashPw = (site, pw) => createHash("sha256").update("ahm-db:" + site + ":" + pw).digest("hex");
const keyFor = (site, hash) => createHmac("sha256", "ahm-db-key:" + secret()).update(site + ":" + hash).digest("base64url");
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };

// site → { owner, hash } for a short time, so busy apps don't ask the database every time
const cache = new Map();
async function siteInfo(db, site) {
  const c = cache.get(site);
  if (c && c.t > Date.now() - 30_000) return c.v;
  const { data, error } = await db.from("app_sites").select("site, owner, admin_hash").eq("site", site).maybeSingle();
  if (error) throw error;
  const v = data ? { owner: data.owner, hash: data.admin_hash || "" } : null;
  cache.set(site, { t: Date.now(), v });
  if (cache.size > 2000) cache.delete(cache.keys().next().value);
  return v;
}

export function OPTIONS() { return new Response(null, { status: 204, headers: CORS }); }

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.a !== "string") return out({ error: "bad_request" }, 400);
    const db = adminDb();
    const a = body.a;

    // ---------- owner actions ----------
    if (a === "create" || a === "setpw" || a === "info") {
      const user = await getUser(req);
      if (!user) return out({ error: "unauthorized" }, 401);
      if (!(await allow("adb-own:" + user.id, 20, 60_000))) return out({ error: "slow_down" }, 429);
      if (a === "create") {
        const usage = usageOf(await getProfile(user), await getSettings());
        const { count, error } = await db.from("app_sites").select("site", { count: "exact", head: true }).eq("owner", user.id);
        if (error) return out({ error: missingTable(error) ? "no_table" : "db" }, 500);
        if (!usage.unlimited && (count || 0) >= (usage.pro ? SITES.pro : SITES.free)) return out({ error: "too_many", pro: !!usage.pro }, 402);
        const site = randomBytes(12).toString("base64url").replace(/[^A-Za-z0-9]/g, "").toLowerCase().slice(0, 14).padEnd(14, "0");
        const { error: e2 } = await db.from("app_sites").insert({ site, owner: user.id });
        if (e2) return out({ error: missingTable(e2) ? "no_table" : "db" }, 500);
        return out({ site });
      }
      const site = String(body.site || "");
      if (!SITE.test(site)) return out({ error: "bad_request" }, 400);
      const info = await siteInfo(db, site);
      if (!info || info.owner !== user.id) return out({ error: "not_found" }, 404);
      if (a === "info") {
        const { count } = await db.from("app_data").select("id", { count: "exact", head: true }).eq("site", site);
        return out({ site, hasPassword: !!info.hash, rows: count || 0 });
      }
      const pw = String(body.password || "").slice(0, 100);
      const hash = pw ? hashPw(site, pw) : null;
      const { error } = await db.from("app_sites").update({ admin_hash: hash }).eq("site", site).eq("owner", user.id);
      if (error) return out({ error: "db" }, 500);
      cache.delete(site);
      return out({ ok: true, hasPassword: !!hash });
    }

    // ---------- the built app ----------
    const site = String(body.site || "");
    if (!SITE.test(site)) return out({ error: "bad_request" }, 400);
    const ip = ipOf(req);
    const write = a === "save" || a === "remove";
    if (!(await allow(`adb:${write ? "w" : "r"}:${site}:${ip}`, write ? 120 : 300, 60_000))) return out({ error: "slow_down" }, 429);
    const info = await siteInfo(db, site);
    if (!info) return out({ error: "not_found" }, 404);

    if (a === "login") {
      if (!(await allow("adb-login:" + site + ":" + ip, 10, 60_000))) return out({ error: "slow_down" }, 429);
      if (!info.hash) return out({ ok: true, key: "" });
      const pw = String(body.password || "").slice(0, 100);
      return same(hashPw(site, pw), info.hash) ? out({ ok: true, key: keyFor(site, info.hash) }) : out({ ok: false, error: "wrong_password" }, 401);
    }
    // an app with an admin password only works after login
    if (info.hash && !same(String(body.key || ""), keyFor(site, info.hash))) return out({ error: "login_needed" }, 401);

    const col = String(body.col || "");
    if (!COL.test(col)) return out({ error: "bad_request" }, 400);
    if (a === "list") {
      const { data, error } = await db.from("app_data").select("id, data, updated_at").eq("site", site).eq("col", col).order("updated_at", { ascending: true }).limit(2000);
      if (error) return out({ error: "db" }, 500);
      return out({ rows: (data || []).map((r) => ({ ...(r.data || {}), id: r.id })) });
    }
    const rawId = body.id ?? (body.data && typeof body.data === "object" ? body.data.id : null);
    const id = rawId == null || rawId === "" ? null : String(rawId);
    if (id && !ID.test(id)) return out({ error: "bad_request" }, 400);
    if (a === "get") {
      if (!id) return out({ error: "bad_request" }, 400);
      const { data, error } = await db.from("app_data").select("id, data").eq("site", site).eq("col", col).eq("id", id).maybeSingle();
      if (error) return out({ error: "db" }, 500);
      return out({ row: data ? { ...(data.data || {}), id: data.id } : null });
    }
    if (a === "remove") {
      if (!id) return out({ error: "bad_request" }, 400);
      const { error } = await db.from("app_data").delete().eq("site", site).eq("col", col).eq("id", id);
      if (error) return out({ error: "db" }, 500);
      return out({ ok: true });
    }
    if (a === "save") {
      const data = body.data && typeof body.data === "object" && !Array.isArray(body.data) ? { ...body.data } : null;
      if (!data) return out({ error: "bad_request" }, 400);
      delete data.id;
      if (JSON.stringify(data).length > MAX_DOC) return out({ error: "too_big" }, 413);
      const newId = id || Date.now().toString(36) + randomBytes(3).toString("hex");
      if (!id) {
        const { count } = await db.from("app_data").select("id", { count: "exact", head: true }).eq("site", site);
        if ((count || 0) >= MAX_ROWS) return out({ error: "full" }, 507);
      }
      const { error } = await db.from("app_data").upsert({ site, col, id: newId, data, updated_at: new Date().toISOString() });
      if (error) return out({ error: missingTable(error) ? "no_table" : "db" }, 500);
      return out({ id: newId });
    }
    return out({ error: "bad_request" }, 400);
  } catch (e) {
    console.error("appdata", String(e?.message || e).slice(0, 300));
    return out({ error: "server" }, 500);
  }
}
