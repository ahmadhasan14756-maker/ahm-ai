// Chats saved on the account, so the same history shows on every phone and computer.
import { adminDb, getUser } from "../../../lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

const MAX_CHAT = 1_500_000; // characters per chat
const MAX_CHATS = 150;
const missingTable = (e) => /relation .*chats.* does not exist|Could not find the table|schema cache/i.test(e?.message || "");
const validId = (id) => typeof id === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(id);

export async function GET(req) {
  const user = await getUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await adminDb()
    .from("chats").select("id,data,deleted,updated_at")
    .eq("user_id", user.id).order("updated_at", { ascending: false }).limit(MAX_CHATS);
  if (error) return Response.json({ error: missingTable(error) ? "no_table" : "db" }, { status: missingTable(error) ? 501 : 500 });
  return Response.json({
    chats: data.map((r) => ({ id: r.id, deleted: r.deleted, updated: new Date(r.updated_at).getTime(), data: r.deleted ? null : r.data })),
  });
}

// Body: { chats: [chat, …], deleted: [{ id, updated }, …] }
export async function POST(req) {
  const [user, body] = await Promise.all([getUser(req), req.json().catch(() => null)]);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!body) return Response.json({ error: "bad_request" }, { status: 400 });

  const now = Date.now();
  const when = (t) => new Date(Math.min(Number(t) || now, now + 60_000)).toISOString(); // never trust a clock far in the future
  const rows = [];
  for (const c of (Array.isArray(body.chats) ? body.chats : []).slice(0, 40)) {
    if (!c || !validId(c.id) || !Array.isArray(c.messages)) continue;
    if (JSON.stringify(c).length > MAX_CHAT) continue;
    rows.push({ user_id: user.id, id: c.id, data: c, deleted: false, updated_at: when(c.updated) });
  }
  for (const d of (Array.isArray(body.deleted) ? body.deleted : []).slice(0, 100)) {
    if (d && validId(d.id)) rows.push({ user_id: user.id, id: d.id, data: {}, deleted: true, updated_at: when(d.updated) });
  }
  if (!rows.length) return Response.json({ ok: true, saved: 0 });

  const { error } = await adminDb().from("chats").upsert(rows, { onConflict: "user_id,id" });
  if (error) {
    console.error("chats save", error.message);
    return Response.json({ error: missingTable(error) ? "no_table" : "db" }, { status: missingTable(error) ? 501 : 500 });
  }
  return Response.json({ ok: true, saved: rows.length });
}
