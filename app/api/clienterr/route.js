// Errors in the AHM AI app itself (on people's phones) → the owner's Telegram, before users have to report them.
// The same error is sent at most once every 6 hours, and at most 25 a day.
import { createHash } from "crypto";
import { notifyOwner, escHtml } from "../../../lib/telegram";
import { redis, hasRedis } from "../../../lib/redis";
import { allow, ipOf } from "../../../lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export async function POST(req) {
  const body = await req.json().catch(() => null);
  const msg = String(body?.msg || "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (!msg || !hasRedis()) return new Response(null, { status: 204 });
  if (!(await allow("cerr:" + ipOf(req), 10, 3600000))) return new Response(null, { status: 204 });
  const where = String(body?.where || "").slice(0, 200), ua = String(body?.ua || "").slice(0, 120), ver = String(body?.ver || "").slice(0, 40);
  const key = "cerr:" + createHash("sha1").update(msg + where).digest("hex").slice(0, 16);
  try {
    if ((await redis("SET", key, "1", "NX", "EX", 21600)) !== "OK") return new Response(null, { status: 204 }); // already reported
    const day = "cerr:day:" + new Date().toISOString().slice(0, 10);
    const n = await redis("INCR", day); if (n === 1) await redis("EXPIRE", day, 90000);
    if (n > 25) return new Response(null, { status: 204 });
    await redis("LPUSH", "dbg:client_errors", JSON.stringify({ t: new Date().toISOString(), msg: msg.slice(0, 160), where: where.slice(0, 80) }));
    await redis("LTRIM", "dbg:client_errors", 0, 19);
  } catch { return new Response(null, { status: 204 }); }
  await notifyOwner(`🐞 <b>هەڵە لە ئەپەکەدا</b>\n<code>${escHtml(msg)}</code>\n📍 ${escHtml(where)}\n📱 ${escHtml(ua)}${ver ? "\n🔖 " + escHtml(ver) : ""}`);
  return new Response(null, { status: 204 });
}
