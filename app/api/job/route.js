// The app asks here for an answer that was finished while the user was away.
import { getUser } from "../../../lib/server";
import { readJob, validJobId } from "../../../lib/jobs";

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
