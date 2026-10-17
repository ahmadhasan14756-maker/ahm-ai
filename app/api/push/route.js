// Turn "notify me when it's done" on or off for this device.
//  GET → { publicKey }   POST { subscription } → save   DELETE { endpoint } → remove
import { getUser } from "../../../lib/server";
import { pushKeys, addSubscription, removeSubscription } from "../../../lib/push";
import { allow, tooMany } from "../../../lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export async function GET() {
  const k = pushKeys();
  return Response.json({ publicKey: k?.publicKey || null }, { headers: { "Cache-Control": "public, max-age=3600" } });
}

export async function POST(req) {
  const [user, body] = await Promise.all([getUser(req), req.json().catch(() => null)]);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!(await allow("push:" + user.id, 10, 60000))) return tooMany();
  try { await addSubscription(user.id, body?.subscription); return Response.json({ ok: true }); }
  catch (e) { return Response.json({ error: e.message === "no_store" ? "no_store" : "bad_request" }, { status: e.message === "no_store" ? 503 : 400 }); }
}

export async function DELETE(req) {
  const [user, body] = await Promise.all([getUser(req), req.json().catch(() => null)]);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  await removeSubscription(user.id, String(body?.endpoint || "")).catch(() => {});
  return Response.json({ ok: true });
}
