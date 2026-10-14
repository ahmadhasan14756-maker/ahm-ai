// Public: the current plans (for the landing page, before login).
import { getSettings } from "../../../lib/server";

import { allow, tooMany, ipOf } from "../../../lib/ratelimit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export async function GET(req) {
  if (!allow("plans:" + ipOf(req), 60, 60000)) return tooMany();
  const { freeLimit, paid, cooldowns } = await getSettings();
  return Response.json({ freeLimit, paid, cooldowns }, { headers: { "Cache-Control": "public, max-age=60" } });
}
