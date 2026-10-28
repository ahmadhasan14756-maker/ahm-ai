// 👍 / 👎 on an answer. Counts are kept (shown as numbers in /api/health); a 👎 is sent to the owner's Telegram
// with the question and the start of the answer, so weak answers can be improved.
import { getUser } from "../../../lib/server";
import { notifyOwner, escHtml } from "../../../lib/telegram";
import { redis, hasRedis } from "../../../lib/redis";
import { allow } from "../../../lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export async function POST(req) {
  const [user, body] = await Promise.all([getUser(req), req.json().catch(() => null)]);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const up = body?.rating === "up", down = body?.rating === "down";
  if (!up && !down) return Response.json({ error: "bad_request" }, { status: 400 });
  if (!(await allow("rate:" + user.id, 30, 3600000))) return Response.json({ error: "slow_down" }, { status: 429 });
  if (hasRedis()) { try { await redis("INCR", up ? "rate:up" : "rate:down"); } catch {} }
  if (down) {
    const q = String(body?.q || "").slice(0, 400), a = String(body?.a || "").slice(0, 700), mode = String(body?.mode || "chat").slice(0, 20);
    await notifyOwner(`👎 <b>وەڵامێکی لاواز</b> (${escHtml(mode)})\n👤 ${escHtml(user.email || "")}\n\n❓ ${escHtml(q)}\n\n💬 ${escHtml(a)}`);
  }
  return Response.json({ ok: true });
}
