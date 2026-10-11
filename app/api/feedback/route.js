// Criticism & suggestions from users → straight to the owner's Telegram.
import { getUser } from "../../../lib/server";
import { notifyOwner, escHtml } from "../../../lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

const KINDS = { idea: "💡 پێشنیار", bug: "🐞 کێشە", critique: "📝 ڕەخنە", other: "💬 تر" };
const recent = new Map(); // small spam guard per server instance

export async function POST(req) {
  const [user, body] = await Promise.all([getUser(req), req.json().catch(() => null)]);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const text = String(body?.text || "").trim().slice(0, 3000);
  if (text.length < 2) return Response.json({ error: "bad_request" }, { status: 400 });
  const last = recent.get(user.id) || 0;
  if (Date.now() - last < 20000) return Response.json({ error: "slow_down" }, { status: 429 });
  recent.set(user.id, Date.now());

  const kind = KINDS[body?.kind] || KINDS.other;
  const ok = await notifyOwner(`${kind}\n👤 ${escHtml(user.email)}\n\n${escHtml(text)}`);
  return ok ? Response.json({ ok: true }) : Response.json({ error: "send" }, { status: 502 });
}
