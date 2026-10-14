// Publish a website the user built: it gets a public link (ahm-ai.vercel.app/s/xxxx) anyone can open.
import { randomBytes } from "crypto";
import { adminDb, getUser } from "../../../lib/server";
import { buildPreview } from "../../../lib/builder";
import { notifyOwner, escHtml } from "../../../lib/telegram";

import { allow, tooMany } from "../../../lib/ratelimit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

const MAX_HTML = 2_000_000;
const MAX_SITES = 30;
const missingTable = (e) => /relation .*sites.* does not exist|Could not find the table|schema cache/i.test(e?.message || "");
const newId = () => randomBytes(6).toString("base64url").replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toLowerCase();

export async function POST(req) {
  const [user, body] = await Promise.all([getUser(req), req.json().catch(() => null)]);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!allow("sites:" + user.id, 10, 60000)) return tooMany();
  const files = body?.files && typeof body.files === "object" ? Object.fromEntries(Object.entries(body.files).filter(([k, v]) => typeof k === "string" && typeof v === "string")) : null;
  const html = files && buildPreview(files);
  if (!html) return Response.json({ error: "no_html" }, { status: 400 });
  if (html.length > MAX_HTML) return Response.json({ error: "too_big" }, { status: 413 });
  const title = String(body.title || "").slice(0, 80) || (html.match(/<title>([^<]{1,80})<\/title>/i)?.[1] ?? "Website");
  const db = adminDb();
  const now = new Date().toISOString();

  // update the user's existing link for this project
  const wanted = String(body.id || "").replace(/[^a-z0-9]/gi, "").slice(0, 12);
  if (wanted) {
    const { data, error } = await db.from("sites").update({ html, title, updated_at: now }).eq("id", wanted).eq("user_id", user.id).select("id");
    if (error) return Response.json({ error: missingTable(error) ? "no_table" : "db" }, { status: 500 });
    if (data?.length) return Response.json({ id: wanted, updated: true });
  }

  const { count, error: cErr } = await db.from("sites").select("*", { count: "exact", head: true }).eq("user_id", user.id);
  if (cErr) return Response.json({ error: missingTable(cErr) ? "no_table" : "db" }, { status: 500 });
  if ((count || 0) >= MAX_SITES) return Response.json({ error: "too_many" }, { status: 429 });

  for (let i = 0; i < 4; i++) {
    const id = newId();
    if (id.length < 6) continue;
    const { error } = await db.from("sites").insert({ id, user_id: user.id, title, html, created_at: now, updated_at: now });
    if (!error) {
      const origin = new URL(req.url).origin;
      await notifyOwner(`🌐 <b>ماڵپەڕی نوێ بڵاوکرایەوە</b>\n👤 ${escHtml(user.email)}\n📄 ${escHtml(title)}\n🔗 ${origin}/s/${id}\nبۆ لابردن: <code>/unpublish ${id}</code>`);
      return Response.json({ id });
    }
    if (!/duplicate|unique/i.test(error.message)) return Response.json({ error: missingTable(error) ? "no_table" : "db" }, { status: 500 });
  }
  return Response.json({ error: "db" }, { status: 500 });
}
