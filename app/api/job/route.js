// The app asks here for an answer that was finished while the user was away.
// POST { id, away } — the app tells the server it went to the background (or came back), so a long build
// keeps going on the server by itself and a notification is sent when it is done.
import { getUser } from "../../../lib/server";
import { readJob, validJobId } from "../../../lib/jobs";
import { redis, hasRedis } from "../../../lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export async function GET(req) {
  const user = await getUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const id = validJobId(new URL(req.url).searchParams.get("id"));
  if (!id) return Response.json({ error: "bad_request" }, { status: 400 });
  const job = await readJob(user.id, id);
  return Response.json(job, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req) {
  // sent with navigator.sendBeacon (no login header possible): the job id itself is the secret (random, 1 hour)
  const body = await req.json().catch(() => null);
  const ids = (Array.isArray(body?.ids) ? body.ids : [body?.id]).map(validJobId).filter(Boolean).slice(0, 5);
  if (!ids.length || !hasRedis()) return new Response(null, { status: 204 });
  await Promise.all(ids.map((id) => (body.away ? redis("SET", "away:" + id, "1", "EX", 3600) : redis("DEL", "away:" + id))));
  return new Response(null, { status: 204 });
}
