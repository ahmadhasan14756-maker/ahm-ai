// Owner only: save the plans (prices, questions, days) and payment info.
import { getUser, isOwner, saveSettings, getSettings } from "../../../../lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export async function GET(req) {
  const user = await getUser(req);
  if (!user || !isOwner(user)) return Response.json({ error: "forbidden" }, { status: 403 });
  return Response.json(await getSettings());
}

export async function POST(req) {
  const user = await getUser(req);
  if (!user || !isOwner(user)) return Response.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "bad_request" }, { status: 400 });
  try {
    return Response.json(await saveSettings(body));
  } catch (e) {
    const missing = /app_settings|relation|does not exist|schema cache/i.test(String(e.message));
    return Response.json({ error: missing ? "no_table" : "save", detail: String(e.message).slice(0, 200) }, { status: 500 });
  }
}
