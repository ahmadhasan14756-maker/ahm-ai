// Public: the current plans (for the landing page, before login).
import { getSettings } from "../../../lib/server";
import { extraLimits } from "../../../lib/extras";

import { allow, tooMany, ipOf } from "../../../lib/ratelimit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export async function GET(req) {
  if (!(await allow("plans:" + ipOf(req), 60, 60000))) return tooMany();
  const { freeLimit, freeWeekly, windowHours, freeVoice, paid } = await getSettings();
  return Response.json({ freeLimit, freeWeekly, windowHours, freeVoice, paid, extras: extraLimits() }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300" } });
}
