// Public: the current plans (for the landing page, before login).
import { getSettings } from "../../../lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export async function GET() {
  const { freeLimit, paid, cooldowns } = await getSettings();
  return Response.json({ freeLimit, paid, cooldowns }, { headers: { "Cache-Control": "public, max-age=60" } });
}
