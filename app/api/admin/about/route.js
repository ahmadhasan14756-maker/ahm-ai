// Owner only: change the "About the developer" section.
import { getUser, isOwner } from "../../../../lib/server";
import { saveAbout } from "../../../../lib/about";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export async function POST(req) {
  const user = await getUser(req);
  if (!user || !isOwner(user)) return Response.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "bad_request" }, { status: 400 });
  try {
    return Response.json(await saveAbout(body));
  } catch {
    return Response.json({ error: "save" }, { status: 500 });
  }
}
