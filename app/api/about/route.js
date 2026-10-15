// Public: "About the developer" text for the Settings page.
import { getAbout } from "../../../lib/about";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

export async function GET() {
  return Response.json(await getAbout(), { headers: { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=600" } });
}
